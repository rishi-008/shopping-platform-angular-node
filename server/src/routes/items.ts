import type { Router } from 'express';
import { pool } from '../db.js';

type ItemRow = {
  Item_Id: number;
  Item_name: string;
  Price: string | number;
  Made_in: string | null;
  Department_Code: string;
  Image_URL: string | null;
};

export function registerItemRoutes(router: Router) {
  router.get('/items', async (req, res) => {
    const department = typeof req.query.department === 'string' ? req.query.department : undefined;

    const sqlBase =
      'SELECT Item_Id, Item_name, Price, Made_in, Department_Code, Image_URL FROM Item';

    const sql = department ? `${sqlBase} WHERE Department_Code = :department` : sqlBase;

    try {
      const [rows] = await pool.query<ItemRow[]>(sql, department ? { department } : undefined);
      res.json({ items: rows });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
}
