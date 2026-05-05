import type { ResultSetHeader } from 'mysql2';

import { pool } from '../db.js';

export async function resetTruckAvailability(): Promise<{ affectedRows: number }> {
  const [result] = await pool.execute<ResultSetHeader>(
    `
    UPDATE Truck t
    JOIN Trip tr ON t.Truck_Id = tr.Truck_Id
    SET t.Availability = 'available'
    WHERE
      (tr.Delivery_Date < CURDATE()
        OR (tr.Delivery_Date = CURDATE() AND tr.Delivery_Time < CURTIME()))
      AND t.Availability = 'in_transit'
    `
  );

  return { affectedRows: result.affectedRows };
}
