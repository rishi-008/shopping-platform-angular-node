import type { Router } from 'express';
import type { RowDataPacket } from 'mysql2';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

type MeRow = RowDataPacket & {
  User_Id: number;
  Email: string;
  Name: string;
  Address: string;
};

export function registerMeRoutes(router: Router) {
  router.get('/me', requireAuth, async (req, res) => {
    const userId = req.user!.userId;

    try {
      const [rows] = await pool.query<MeRow[]>(
        'SELECT User_Id, Email, Name, Address FROM Users WHERE User_Id = :userId LIMIT 1',
        { userId }
      );

      if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const u = rows[0];

      return res.json({
        user: {
          id: u.User_Id,
          email: u.Email,
          name: u.Name,
          address: u.Address
        }
      });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}
