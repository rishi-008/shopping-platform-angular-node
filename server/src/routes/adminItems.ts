import type { Router } from 'express';
import type { ResultSetHeader } from 'mysql2';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function registerAdminItemRoutes(router: Router) {
  // Create item
  router.post('/admin/items', requireAuth, requireAdmin, async (req, res) => {
    const body = req.body as Record<string, unknown>;

    const itemName = body.Item_name;
    const price = parsePrice(body.Price);
    const departmentCode = body.Department_Code;

    const madeIn = body.Made_in;
    const imageUrl = body.Image_URL;

    if (!isNonEmptyString(itemName)) return res.status(400).json({ error: 'Item_name is required' });
    if (price === null) return res.status(400).json({ error: 'Price is required' });
    if (!isNonEmptyString(departmentCode)) {
      return res.status(400).json({ error: 'Department_Code is required' });
    }

    if (madeIn != null && !isNonEmptyString(madeIn)) {
      return res.status(400).json({ error: 'Made_in must be a non-empty string or null' });
    }

    if (imageUrl != null && !isNonEmptyString(imageUrl)) {
      return res.status(400).json({ error: 'Image_URL must be a non-empty string or null' });
    }

    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO Item (Item_name, Price, Made_in, Department_Code, Image_URL) VALUES (:Item_name, :Price, :Made_in, :Department_Code, :Image_URL)',
        {
          Item_name: itemName,
          Price: price,
          Made_in: madeIn ?? null,
          Department_Code: departmentCode,
          Image_URL: imageUrl ?? null
        }
      );

      return res.status(201).json({ itemId: result.insertId });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Update item
  router.put('/admin/items/:id', requireAuth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid item id' });

    const body = req.body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};

    if ('Item_name' in body) {
      if (body.Item_name == null) return res.status(400).json({ error: 'Item_name cannot be null' });
      if (!isNonEmptyString(body.Item_name)) return res.status(400).json({ error: 'Item_name must be a non-empty string' });
      updates.Item_name = body.Item_name;
    }

    if ('Price' in body) {
      const price = parsePrice(body.Price);
      if (price === null) return res.status(400).json({ error: 'Price must be a number' });
      updates.Price = price;
    }

    if ('Made_in' in body) {
      if (body.Made_in !== null && body.Made_in !== undefined && !isNonEmptyString(body.Made_in)) {
        return res.status(400).json({ error: 'Made_in must be a non-empty string or null' });
      }
      updates.Made_in = body.Made_in ?? null;
    }

    if ('Department_Code' in body) {
      if (body.Department_Code == null) return res.status(400).json({ error: 'Department_Code cannot be null' });
      if (!isNonEmptyString(body.Department_Code)) {
        return res.status(400).json({ error: 'Department_Code must be a non-empty string' });
      }
      updates.Department_Code = body.Department_Code;
    }

    if ('Image_URL' in body) {
      if (body.Image_URL !== null && body.Image_URL !== undefined && !isNonEmptyString(body.Image_URL)) {
        return res.status(400).json({ error: 'Image_URL must be a non-empty string or null' });
      }
      updates.Image_URL = body.Image_URL ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const setClause = Object.keys(updates)
      .map((key) => `${key} = :${key}`)
      .join(', ');

    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE Item SET ${setClause} WHERE Item_Id = :id`,
        {
          ...updates,
          id
        }
      );

      if (result.affectedRows === 0) return res.status(404).json({ error: 'Item not found' });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}
