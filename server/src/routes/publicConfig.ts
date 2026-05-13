import type { Router } from 'express';

import { env } from '../env.js';

export function registerPublicConfigRoutes(router: Router) {
  router.get('/public-config', (req, res) => {
    return res.json({
      googleMapsApiKey: env.googleMapsApiKey,
      stripePublishableKey: env.stripe.publishableKey,
      stripeEnabled: env.stripe.enabled
    });
  });
}
