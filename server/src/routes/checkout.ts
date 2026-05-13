import type { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import crypto from 'node:crypto';

import { pool } from '../db.js';
import { env } from '../env.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getStripeClient } from '../stripe/stripeClient.js';

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
    const paymentIntentId = body.paymentIntentId;

    if (!delivery || typeof delivery !== 'object') {
      return res.status(400).json({ error: 'Missing delivery details' });
    }

    if (paymentIntentId !== undefined && !isNonEmptyString(paymentIntentId)) {
      return res.status(400).json({ error: 'paymentIntentId must be a non-empty string' });
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

      let stripePaymentVerified = false;
      const maybeRefundStripePayment = async (reason: string) => {
        if (!paymentIntentId || !stripePaymentVerified) return;
        try {
          const stripe = getStripeClient();
          await stripe.refunds.create({ payment_intent: paymentIntentId as string, reason: 'requested_by_customer' });
        } catch {
          // Best-effort refund; ignore errors so we can return the original failure.
        }
      };

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

      const total = cartRows.reduce((sum, row) => {
        const price = typeof row.Price === 'string' ? Number(row.Price) : row.Price;
        return sum + price * row.Quantity;
      }, 0);

      // If a Stripe payment was provided, verify it before attempting checkout.
      if (paymentIntentId) {
        if (!env.stripe.enabled) {
          await connection.rollback();
          return res.status(500).json({ error: 'Stripe is not configured on the server' });
        }

        const stripe = getStripeClient();
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId as string);

        if (pi.metadata?.userId && pi.metadata.userId !== String(userId)) {
          await connection.rollback();
          return res.status(403).json({ error: 'Payment does not belong to this user' });
        }

        if (pi.status !== 'succeeded') {
          await connection.rollback();
          return res.status(400).json({ error: `Payment not completed (status: ${pi.status})` });
        }

        const expectedAmount = Math.round(total * 100);
        if (pi.amount !== expectedAmount) {
          await connection.rollback();
          return res.status(400).json({ error: 'Payment amount does not match cart total' });
        }

        stripePaymentVerified = true;
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
              ABS(
                TIMESTAMPDIFF(
                  MINUTE,
                  TIMESTAMP(tr.Delivery_Date, tr.Delivery_Time),
                  TIMESTAMP(:deliveryDate, :deliveryTime)
                )
              ) <= 60
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

        await maybeRefundStripePayment('no_trucks');
        await connection.rollback();

        return res.status(409).json({
          error: 'No available trucks for your selected time',
          nextAvailable: nextRows[0]?.next_available ?? null,
          paymentRefunded: Boolean(paymentIntentId && stripePaymentVerified)
        });
      }

      const truckId = truckRows[0].Truck_Id;

      // Lock the chosen truck row to reduce race conditions across concurrent checkouts.
      const [truckAvailRows] = await connection.query<TruckAvailabilityRow[]>(
        'SELECT Availability FROM Truck WHERE Truck_Id = :truckId FOR UPDATE',
        { truckId }
      );

      if (truckAvailRows.length === 0) {
        await maybeRefundStripePayment('truck_not_available');
        await connection.rollback();
        return res.status(409).json({ error: 'Truck no longer available', nextAvailable: null });
      }

      const availability = truckAvailRows[0].Availability;
      if (availability !== 'available' && availability !== 'in_transit') {
        await maybeRefundStripePayment('truck_not_available');
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
              ABS(
                TIMESTAMPDIFF(
                  MINUTE,
                  TIMESTAMP(tr.Delivery_Date, tr.Delivery_Time),
                  TIMESTAMP(:deliveryDate, :deliveryTime)
                )
              ) <= 60
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

        await maybeRefundStripePayment('no_trucks');
        await connection.rollback();
        return res.status(409).json({
          error: 'No available trucks for your selected time',
          nextAvailable: nextRows[0]?.next_available ?? null,
          paymentRefunded: Boolean(paymentIntentId && stripePaymentVerified)
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

      const [orderResult] = await connection.query<ResultSetHeader>(
        `
        INSERT INTO Orders (User_Id, Trip_Id, Total_Price, Status)
        VALUES (:userId, :tripId, :total, 'processing')
        `,
        { userId, tripId, total }
      );

      const orderId = orderResult.insertId;

      if (paymentIntentId) {
        await connection.query(
          `
          INSERT INTO Payment (Order_Id, Amount, Payment_Method, Transaction_Id, Status)
          VALUES (:orderId, :amount, 'Stripe', :transactionId, 'completed')
          `,
          { orderId, amount: total, transactionId: paymentIntentId }
        );
      } else {
        const transactionId = crypto.randomUUID();

        await connection.query(
          `
          INSERT INTO Payment (Order_Id, Amount, Payment_Method, Transaction_Id, Status)
          VALUES (:orderId, :amount, 'Mock', :transactionId, 'completed')
          `,
          { orderId, amount: total, transactionId }
        );
      }

      await connection.query(
        `
        UPDATE Truck
        SET Availability = IF(TIMESTAMP(:deliveryDate, :deliveryTime) <= NOW(), 'in_transit', Availability)
        WHERE Truck_Id = :truckId
        `,
        { truckId, deliveryDate, deliveryTime }
      );

      await connection.query('DELETE FROM CartItem WHERE User_Id = :userId', { userId });

      await connection.commit();
      return res.json({ ok: true, orderId, total, tripId });
    } catch (error) {
      try {
        if (paymentIntentId) {
          // If a Stripe payment was already verified, attempt a best-effort refund.
          const stripe = env.stripe.enabled ? getStripeClient() : null;
          if (stripe) {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId as string);
            if (pi.status === 'succeeded') {
              await stripe.refunds.create({ payment_intent: paymentIntentId as string, reason: 'requested_by_customer' });
            }
          }
        }
      } catch {
        // Ignore refund errors on 500s.
      }
      await connection.rollback();
      return res.status(500).json({ error: (error as Error).message });
    } finally {
      connection.release();
    }
  });
}
