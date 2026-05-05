import type { ResultSetHeader } from 'mysql2';

import { pool } from '../db.js';

export async function resetTruckAvailability(): Promise<{ affectedRows: number }> {
  const [result] = await pool.execute<ResultSetHeader>(
    `
    UPDATE Truck t
    JOIN Trip tr ON t.Truck_Id = tr.Truck_Id
    SET t.Availability = 'available'
    WHERE
      DATE_ADD(
        TIMESTAMP(tr.Delivery_Date, tr.Delivery_Time),
        INTERVAL ROUND(COALESCE(tr.Estimated_Time, 0) * 60) MINUTE
      ) < NOW()
      AND t.Availability = 'in_transit'
    `
  );

  return { affectedRows: result.affectedRows };
}
