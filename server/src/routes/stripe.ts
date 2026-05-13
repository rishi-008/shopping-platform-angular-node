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
  router.post('/stripe/checkout-session', requireAuth, async (req, res) => {
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

      const successUrlBase = env.corsOrigin.replace(/\/$/, '');
      const success_url = `${successUrlBase}/checkout?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancel_url = `${successUrlBase}/checkout?stripe=cancel`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url,
        cancel_url,
        metadata: {
          userId: String(userId)
        },
        payment_intent_data: {
          metadata: {
            userId: String(userId)
          }
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: env.stripe.currency,
              unit_amount: amount,
              product_data: {
                name: 'Order total'
              }
            }
          }
        ]
      });

      if (!session.url) {
        return res.status(500).json({ error: 'Stripe did not return a checkout session URL' });
      }

      return res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    } finally {
      connection.release();
    }
  });

  router.post('/stripe/checkout-session/finalize', requireAuth, async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!env.stripe.enabled) {
      return res.status(500).json({ error: 'Stripe is not configured on the server' });
    }

    const body = req.body as Record<string, unknown>;
    const sessionId = body.sessionId;
    const delivery = body.delivery;

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    if (!delivery || typeof delivery !== 'object') {
      return res.status(400).json({ error: 'delivery is required' });
    }

    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });

      if (session.metadata?.userId && session.metadata.userId !== String(userId)) {
        return res.status(403).json({ error: 'Checkout session does not belong to this user' });
      }

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: `Payment not completed (status: ${session.payment_status})` });
      }

      const paymentIntent = session.payment_intent;
      const paymentIntentId =
        typeof paymentIntent === 'string' ? paymentIntent : paymentIntent && 'id' in paymentIntent ? paymentIntent.id : null;

      if (!paymentIntentId) {
        return res.status(500).json({ error: 'Stripe session missing payment_intent' });
      }

      // Delegate to the existing /checkout logic by calling it internally via fetch is overkill.
      // Instead, the web app will call /checkout with paymentIntentId.
      return res.json({ paymentIntentId });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}
