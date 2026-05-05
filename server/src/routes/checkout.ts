import type { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import crypto from 'node:crypto';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

type CartPriceRow = RowDataPacket & {
  Item_Id: number;
  Quantity: number;
  Price: string | number;
};

type AddressRow = RowDataPacket & {
  Address: string;
};

type TruckRow = RowDataPacket & {
  Truck_Id: number;
};

type TruckAvailabilityRow = RowDataPacket & {
  Availability: 'available' | 'in_transit' | 'maintenance';
};

type NextAvailableRow = RowDataPacket & {
  next_available: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function registerCheckoutRoutes(router: Router) {
  router.post('/checkout', requireAuth, async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body as Record<string, unknown>;
    const delivery = body.delivery as Record<string, unknown> | undefined;

    if (!delivery || typeof delivery !== 'object') {
      return res.status(400).json({ error: 'Missing delivery details' });
    }

    const branchId = delivery.branchId;
    const deliveryDate = delivery.deliveryDate;
    const deliveryTime = delivery.deliveryTime;
    const distanceMeters = delivery.distanceMeters;
    const durationSeconds = delivery.durationSeconds;

    if (!isPositiveInt(branchId)) return res.status(400).json({ error: 'delivery.branchId must be a positive integer' });
    if (!isNonEmptyString(deliveryDate)) return res.status(400).json({ error: 'delivery.deliveryDate is required' });
    if (!isNonEmptyString(deliveryTime)) return res.status(400).json({ error: 'delivery.deliveryTime is required' });
    if (!isNonNegativeNumber(distanceMeters)) {
      return res.status(400).json({ error: 'delivery.distanceMeters must be a non-negative number' });
    }
    if (!isNonNegativeNumber(durationSeconds)) {
      return res.status(400).json({ error: 'delivery.durationSeconds must be a non-negative number' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [addressRows] = await connection.query<AddressRow[]>(
        'SELECT Address FROM Users WHERE User_Id = :userId LIMIT 1',
        { userId }
      );
      if (addressRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'User not found' });
      }

      const destinationAddress = addressRows[0].Address;

      const [cartRows] = await connection.query<CartPriceRow[]>(
        `
        SELECT ci.Item_Id, ci.Quantity, i.Price
        FROM CartItem ci
        JOIN Item i ON i.Item_Id = ci.Item_Id
        WHERE ci.User_Id = :userId
        `,
        { userId }
      );

      if (cartRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Cart is empty' });
      }

      // 1) Pick an available truck near the requested slot (matches legacy PHP logic)
      const [truckRows] = await connection.query<TruckRow[]>(
        `
        SELECT t.Truck_Id
        FROM Truck t
        WHERE t.Truck_Id NOT IN (
          SELECT tr.Truck_Id
          FROM Trip tr
          WHERE tr.Truck_Id = t.Truck_Id
          AND (
            (tr.Delivery_Date = :deliveryDate AND tr.Delivery_Time BETWEEN SUBTIME(:deliveryTime, '01:00:00') AND ADDTIME(:deliveryTime, '01:00:00'))
            OR CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time) > NOW()
          )
        )
        AND (t.Availability = 'available' OR t.Availability = 'in_transit')
        ORDER BY RAND()
        LIMIT 1
        `,
        { deliveryDate, deliveryTime }
      );

      if (truckRows.length === 0) {
        const deliveryDateTime = `${deliveryDate} ${deliveryTime}`;
        const [nextRows] = await connection.query<NextAvailableRow[]>(
          `
          SELECT MIN(CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time)) AS next_available
          FROM Trip tr
          WHERE CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time) > :deliveryDateTime
          `,
          { deliveryDateTime }
        );

        await connection.rollback();

        return res.status(409).json({
          error: 'No available trucks for your selected time',
          nextAvailable: nextRows[0]?.next_available ?? null
        });
      }

      const truckId = truckRows[0].Truck_Id;

      // Lock the chosen truck row to reduce race conditions across concurrent checkouts.
      const [truckAvailRows] = await connection.query<TruckAvailabilityRow[]>(
        'SELECT Availability FROM Truck WHERE Truck_Id = :truckId FOR UPDATE',
        { truckId }
      );

      if (truckAvailRows.length === 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Truck no longer available', nextAvailable: null });
      }

      const availability = truckAvailRows[0].Availability;
      if (availability !== 'available' && availability !== 'in_transit') {
        await connection.rollback();
        return res.status(409).json({ error: 'Truck no longer available', nextAvailable: null });
      }

      // Re-check the trip schedule for this truck after acquiring the lock.
      const [conflictingTrips] = await connection.query<RowDataPacket[]>(
        `
        SELECT 1
        FROM Trip tr
        WHERE tr.Truck_Id = :truckId
          AND (
            (tr.Delivery_Date = :deliveryDate AND tr.Delivery_Time BETWEEN SUBTIME(:deliveryTime, '01:00:00') AND ADDTIME(:deliveryTime, '01:00:00'))
            OR CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time) > NOW()
          )
        LIMIT 1
        `,
        { truckId, deliveryDate, deliveryTime }
      );

      if (conflictingTrips.length > 0) {
        const deliveryDateTime = `${deliveryDate} ${deliveryTime}`;
        const [nextRows] = await connection.query<NextAvailableRow[]>(
          `
          SELECT MIN(CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time)) AS next_available
          FROM Trip tr
          WHERE CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time) > :deliveryDateTime
          `,
          { deliveryDateTime }
        );

        await connection.rollback();
        return res.status(409).json({
          error: 'No available trucks for your selected time',
          nextAvailable: nextRows[0]?.next_available ?? null
        });
      }

      // 2) Create Trip
      const distanceKm = distanceMeters / 1000;
      const durationHours = durationSeconds / 3600;

      const [tripResult] = await connection.query<ResultSetHeader>(
        `
        INSERT INTO Trip (
          Branch_Id,
          Destination_Address,
          Distance,
          Estimated_Time,
          Truck_Id,
          Delivery_Date,
          Delivery_Time
        ) VALUES (
          :branchId,
          :destinationAddress,
          :distanceKm,
          :durationHours,
          :truckId,
          :deliveryDate,
          :deliveryTime
        )
        `,
        { branchId, destinationAddress, distanceKm, durationHours, truckId, deliveryDate, deliveryTime }
      );

      const tripId = tripResult.insertId;

      const total = cartRows.reduce((sum, row) => {
        const price = typeof row.Price === 'string' ? Number(row.Price) : row.Price;
        return sum + price * row.Quantity;
      }, 0);

      const [orderResult] = await connection.query<ResultSetHeader>(
        `
        INSERT INTO Orders (User_Id, Trip_Id, Total_Price, Status)
        VALUES (:userId, :tripId, :total, 'processing')
        `,
        { userId, tripId, total }
      );

      const orderId = orderResult.insertId;
      const transactionId = crypto.randomUUID();

      await connection.query(
        `
        INSERT INTO Payment (Order_Id, Amount, Payment_Method, Transaction_Id, Status)
        VALUES (:orderId, :amount, 'Mock', :transactionId, 'completed')
        `,
        { orderId, amount: total, transactionId }
      );

      await connection.query(
        `
        UPDATE Truck
        SET Availability = 'in_transit'
        WHERE Truck_Id = :truckId
        `,
        { truckId }
      );

      await connection.query('DELETE FROM CartItem WHERE User_Id = :userId', { userId });

      await connection.commit();
      return res.json({ ok: true, orderId, total, tripId });
    } catch (error) {
      await connection.rollback();
      return res.status(500).json({ error: (error as Error).message });
    } finally {
      connection.release();
    }
  });
}
