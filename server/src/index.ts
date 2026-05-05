import express from 'express';
import cors from 'cors';

import { env } from './env.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerItemRoutes } from './routes/items.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCartRoutes } from './routes/cart.js';
import { registerCheckoutRoutes } from './routes/checkout.js';
import { registerOrdersRoutes } from './routes/orders.js';
import { registerPublicConfigRoutes } from './routes/publicConfig.js';
import { registerMeRoutes } from './routes/me.js';
import { registerBranchRoutes } from './routes/branches.js';
import { resetTruckAvailability } from './jobs/resetTruckAvailability.js';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

const api = express.Router();
registerHealthRoutes(api);
registerPublicConfigRoutes(api);
registerItemRoutes(api);
registerAuthRoutes(api);
registerMeRoutes(api);
registerBranchRoutes(api);
registerCartRoutes(api);
registerCheckoutRoutes(api);
registerOrdersRoutes(api);
app.use('/api', api);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port}`);
});

async function startJobs() {
  const run = async () => {
    try {
      const { affectedRows } = await resetTruckAvailability();
      if (affectedRows > 0) {
        // eslint-disable-next-line no-console
        console.log(`[jobs] resetTruckAvailability updated ${affectedRows} truck(s)`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[jobs] resetTruckAvailability failed', (error as Error).message);
    }
  };

  await run();
  setInterval(run, env.jobs.resetTrucksIntervalMs);
}

void startJobs();
