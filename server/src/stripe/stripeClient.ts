import Stripe from 'stripe';

import { env } from '../env.js';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!env.stripe.enabled) {
    throw new Error('Stripe is not configured on the server');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripe.secretKey);
  }

  return stripeClient;
}
