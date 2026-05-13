## Shopping Website (migration)

This repo currently contains a PHP app plus a new Node/TypeScript API in `server/`.

### Run the Node API + MySQL (Docker)

1) Create `.env` from `.env.example`
2) Start services:

```bash
docker compose up -d --build
```

JWT env vars required for the Node API:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Stripe (optional, test mode):

- `STRIPE_SECRET_KEY` (e.g. `sk_test_...`)
- `STRIPE_PUBLISHABLE_KEY` (e.g. `pk_test_...`)
- `STRIPE_CURRENCY` (default `usd`)

If you’re using `docker-compose` v1 on the droplet, use:

```bash
docker-compose up -d --build
```

### (Optional) Run the legacy PHP app (Docker)

This is only for verifying the old PHP app still works.

- Set `PHP_PORT` in `.env` (default `8081`)
- Start the PHP service:

```bash
docker-compose up -d --build php
```

Then open: `http://<droplet-ip>:8081/index.php`

### Test

- `GET http://localhost:3001/api/health`
- `GET http://localhost:3001/api/items?department=ELECTRONICS`

Auth + cart:

- `POST http://localhost:3001/api/auth/register`
- `POST http://localhost:3001/api/auth/login`
- `POST http://localhost:3001/api/auth/refresh`
- `GET http://localhost:3001/api/cart` (Bearer token)

Stripe test-mode:

- On the Checkout page, use test card `4242 4242 4242 4242` (any future expiry, any CVC).

### Notes

- The MySQL database is seeded on first run from `db/init.sql`.
- If you already have an existing DB volume, apply new tables with `db/migrations/001_add_auth_cart.sql`.
- To reset the DB: `docker compose down -v`
