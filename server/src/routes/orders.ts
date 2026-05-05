import type { Router } from 'express';
import type { RowDataPacket } from 'mysql2';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

type OrdersRow = RowDataPacket & {
  Order_Id: number;
  Order_Date: Date;
  Total_Price: string | number | null;
  Status: string;
  Payment_Id: number | null;
  Payment_Amount: string | number | null;
  Payment_Method: string | null;
  Transaction_Id: string | null;
  Payment_Status: string | null;
  Payment_Date: Date | null;
};

function toNumber(value: string | number | null): number {
  if (value == null) return 0;
  return typeof value === 'string' ? Number(value) : value;
}

export function registerOrdersRoutes(router: Router) {
  router.get('/orders', requireAuth, async (req, res) => {
    const userId = req.user!.userId;

    try {
      const [rows] = await pool.query<OrdersRow[]>(
        `
        SELECT
          o.Order_Id,
          o.Order_Date,
          o.Total_Price,
          o.Status,
          p.Payment_Id,
          p.Amount AS Payment_Amount,
          p.Payment_Method,
          p.Transaction_Id,
          p.Status AS Payment_Status,
          p.Payment_Date
        FROM Orders o
        LEFT JOIN Payment p ON p.Order_Id = o.Order_Id
        WHERE o.User_Id = :userId
        ORDER BY o.Order_Id DESC
        `,
        { userId }
      );

      const orders = rows.map((r) => ({
        orderId: r.Order_Id,
        orderDate: r.Order_Date,
        total: toNumber(r.Total_Price),
        status: r.Status,
        payment: r.Payment_Id
          ? {
              paymentId: r.Payment_Id,
              amount: toNumber(r.Payment_Amount),
              method: r.Payment_Method,
              transactionId: r.Transaction_Id,
              status: r.Payment_Status,
              paymentDate: r.Payment_Date
            }
          : null
      }));

      return res.json({ orders });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}
