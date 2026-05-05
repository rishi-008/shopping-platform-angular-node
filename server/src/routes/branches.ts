import type { Router } from 'express';
import type { RowDataPacket } from 'mysql2';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

type BranchRow = RowDataPacket & {
  Branch_Id: number;
  Name: string;
  Address: string;
  City: string | null;
  Province: string | null;
  Postal_Code: string | null;
  Latitude: string | number | null;
  Longitude: string | number | null;
};

function toNumber(value: string | number | null): number | null {
  if (value == null) return null;
  return typeof value === 'string' ? Number(value) : value;
}

export function registerBranchRoutes(router: Router) {
  router.get('/branches', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query<BranchRow[]>(
        'SELECT Branch_Id, Name, Address, City, Province, Postal_Code, Latitude, Longitude FROM Branch ORDER BY Branch_Id ASC'
      );

      const branches = rows.map((b) => ({
        branchId: b.Branch_Id,
        name: b.Name,
        address: b.Address,
        city: b.City,
        province: b.Province,
        postalCode: b.Postal_Code,
        latitude: toNumber(b.Latitude),
        longitude: toNumber(b.Longitude)
      }));

      return res.json({ branches });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}
