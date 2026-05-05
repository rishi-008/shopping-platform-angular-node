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

export function registerCheckoutRoutes(router: Router) {
  router.post('/checkout', requireAuth, async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

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

      const [orderResult] = await connection.query<ResultSetHeader>(
        `
        INSERT INTO Orders (User_Id, Total_Price, Status)
        VALUES (:userId, :total, 'pending')
        `,
        { userId, total }
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

      await connection.query('DELETE FROM CartItem WHERE User_Id = :userId', { userId });

      await connection.commit();
      return res.json({ ok: true, orderId, total });
    } catch (error) {
      await connection.rollback();
      return res.status(500).json({ error: (error as Error).message });
    } finally {
      connection.release();
    }
  });
}
