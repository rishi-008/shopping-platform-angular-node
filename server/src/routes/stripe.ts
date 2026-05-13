import type { Router } from 'express';
import type { RowDataPacket } from 'mysql2';

import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { env } from '../env.js';
import { getStripeClient } from '../stripe/stripeClient.js';

type CartPriceRow = RowDataPacket & {
  Item_Id: number;
  Quantity: number;
  Price: string | number;
};

function toNumber(value: string | number): number {
  return typeof value === 'string' ? Number(value) : value;
}

export function registerStripeRoutes(router: Router) {
  router.post('/stripe/payment-intent', requireAuth, async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!env.stripe.enabled) {
      return res.status(500).json({ error: 'Stripe is not configured on the server' });
    }

    const connection = await pool.getConnection();
    try {
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
        return res.status(400).json({ error: 'Cart is empty' });
      }

      const total = cartRows.reduce((sum, row) => sum + toNumber(row.Price) * row.Quantity, 0);
      const amount = Math.round(total * 100);

      const stripe = getStripeClient();
      const pi = await stripe.paymentIntents.create({
        amount,
        currency: env.stripe.currency,
        metadata: {
          userId: String(userId)
        }
      });

      if (!pi.client_secret) {
        return res.status(500).json({ error: 'Stripe did not return a client_secret' });
      }

      return res.json({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        amount,
        currency: env.stripe.currency
      });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    } finally {
      connection.release();
    }
  });
}
