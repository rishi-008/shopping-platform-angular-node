import type { Router } from 'express';
import { pool } from '../db.js';

export function registerHealthRoutes(router: Router) {
  router.get('/health', async (_req, res) => {
    try {
      const conn = await pool.getConnection();
      try {
        await conn.ping();
      } finally {
        conn.release();
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: (error as Error).message });
    }
  });
}
