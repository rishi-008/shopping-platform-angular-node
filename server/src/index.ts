import express from 'express';
import cors from 'cors';

import { env } from './env.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerItemRoutes } from './routes/items.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCartRoutes } from './routes/cart.js';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

const api = express.Router();
registerHealthRoutes(api);
registerItemRoutes(api);
registerAuthRoutes(api);
registerCartRoutes(api);
app.use('/api', api);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port}`);
});
