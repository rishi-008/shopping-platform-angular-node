import type { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

type CartRow = RowDataPacket & {
  Item_Id: number;
  Item_name: string;
  Price: string | number;
  Image_URL: string | null;
  Quantity: number;
};

function toNumber(value: string | number): number {
  return typeof value === 'string' ? Number(value) : value;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function registerCartRoutes(router: Router) {
  router.get('/cart', requireAuth, async (req, res) => {
    const userId = req.user!.userId;

    try {
      const [rows] = await pool.query<CartRow[]>(
        `
        SELECT ci.Item_Id, i.Item_name, i.Price, i.Image_URL, ci.Quantity
        FROM CartItem ci
        JOIN Item i ON i.Item_Id = ci.Item_Id
        WHERE ci.User_Id = :userId
        ORDER BY ci.Updated_At DESC
        `,
        { userId }
      );

      const items = rows.map((r) => {
        const price = toNumber(r.Price);
        return {
          itemId: r.Item_Id,
          name: r.Item_name,
          price,
          imageUrl: r.Image_URL,
          quantity: r.Quantity,
          lineTotal: price * r.Quantity
        };
      });

      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

      return res.json({ items, total });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post('/cart', requireAuth, async (req, res) => {
    const userId = req.user!.userId;
    const { itemId, quantity } = req.body as Record<string, unknown>;

    if (!isPositiveInt(itemId) || !isPositiveInt(quantity)) {
      return res.status(400).json({ error: 'itemId and quantity must be positive integers' });
    }

    try {
      const [exists] = await pool.query<RowDataPacket[]>('SELECT 1 FROM Item WHERE Item_Id = :itemId LIMIT 1', {
        itemId
      });
      if (exists.length === 0) return res.status(404).json({ error: 'Item not found' });

      await pool.execute<ResultSetHeader>(
        `
        INSERT INTO CartItem (User_Id, Item_Id, Quantity)
        VALUES (:userId, :itemId, :quantity)
        ON DUPLICATE KEY UPDATE Quantity = Quantity + VALUES(Quantity), Updated_At = NOW()
        `,
        { userId, itemId, quantity }
      );

      return res.status(201).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.patch('/cart/:itemId', requireAuth, async (req, res) => {
    const userId = req.user!.userId;
    const itemId = Number(req.params.itemId);
    const { quantity } = req.body as Record<string, unknown>;

    if (!Number.isInteger(itemId) || itemId <= 0) return res.status(400).json({ error: 'Invalid itemId' });
    if (!isNonNegativeInt(quantity)) return res.status(400).json({ error: 'quantity must be a non-negative integer' });

    try {
      if (quantity === 0) {
        await pool.execute<ResultSetHeader>('DELETE FROM CartItem WHERE User_Id = :userId AND Item_Id = :itemId', {
          userId,
          itemId
        });
        return res.json({ ok: true });
      }

      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE CartItem SET Quantity = :quantity, Updated_At = NOW() WHERE User_Id = :userId AND Item_Id = :itemId',
        { userId, itemId, quantity }
      );

      if ((result as ResultSetHeader).affectedRows === 0) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.delete('/cart/:itemId', requireAuth, async (req, res) => {
    const userId = req.user!.userId;
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(itemId) || itemId <= 0) return res.status(400).json({ error: 'Invalid itemId' });

    try {
      await pool.execute<ResultSetHeader>('DELETE FROM CartItem WHERE User_Id = :userId AND Item_Id = :itemId', {
        userId,
        itemId
      });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.delete('/cart', requireAuth, async (req, res) => {
    const userId = req.user!.userId;

    try {
      await pool.execute<ResultSetHeader>('DELETE FROM CartItem WHERE User_Id = :userId', { userId });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}
