## Shopping Website (Resume Project)

Full‑stack e‑commerce + delivery scheduling platform deployed with Docker.

Live site:

- https://productsmarket.tech
- https://www.productsmarket.tech

This repo contains:

- A modern storefront + admin UI (Angular) in `web/`
- A Node.js/TypeScript API (Express) in `server/`
- A MySQL database seeded from `db/init.sql`
- A legacy PHP implementation (kept for reference), but the primary app is the Angular + Node stack

### Tech stack

- Frontend: Angular (standalone components), RxJS, Stripe Checkout redirect
- Backend: Node.js + TypeScript + Express
- Auth: JWT access tokens + refresh tokens with rotation
- DB: MySQL 8.x (dockerized)
- Media: DigitalOcean Spaces (S3‑compatible) for product images
- Maps/Delivery: Google Maps JS API (routing/distance/time)
- Payments: Stripe (test mode) via hosted Checkout Sessions
- Deployment: Docker Compose; designed to sit behind a reverse proxy (nginx)

## Architecture

High-level:

- `nginx` (droplet) routes `/` → `web` container (Angular static app)
- `nginx` routes `/api/*` → `api` container (Express)
- `api` talks to `db` (MySQL) over the Docker network
- Browser integrates with external services:
  - Google Maps JS API (delivery route planning)
  - Stripe hosted Checkout (payments in test mode)
  - DigitalOcean Spaces (product image storage; direct browser upload via presigned URL)

Diagram:

```text
Browser
	|  GET /, static assets
	v
nginx (droplet)
	|  /            -> web (Angular)
	|  /api/*       -> api (Node/Express)
	v
db (MySQL)

Browser -> Google Maps JS API (routing)
Browser -> Stripe Checkout (hosted payment page)
Browser -> DigitalOcean Spaces (PUT via presigned URL)
api     -> DigitalOcean Spaces (signs uploads via S3-compatible API)
api     -> Stripe (creates Checkout Session, verifies paid session)
```

## Complex features (high‑signal)

### Authentication + session management (JWT)

- Access token + refresh token model.
- Access token is short‑lived; refresh token is persisted in MySQL as a *hashed* token id.
- Refresh token rotation: `/api/auth/refresh` revokes the old refresh token and issues a new one.
- Frontend automatically attaches `Authorization: Bearer <accessToken>` to `/api/*` requests and transparently refreshes on `401`.
- If refresh fails (expired/revoked), the user is logged out and redirected to login.

### Roles + admin authorization

- Users have `User_Type` (`user` or `admin`) stored in MySQL.
- Admin‑only routes are enforced server‑side (auth middleware populates `req.user`; admin middleware checks `userType`).
- Admin can create/update items (catalog CRUD) including image URLs.

### Admin image uploads to DigitalOcean Spaces (direct browser upload)

To keep cloud credentials off the browser:

- The API generates a short‑lived **presigned PUT** URL for a validated image upload.
- The browser uploads the file directly to DigitalOcean Spaces using that URL.
- The public image URL is stored as `Item.Image_URL` in MySQL.

Operational note: Spaces must be configured for CORS (allow `PUT` from your site origin) and objects must be publicly readable.

### Delivery planning with Google Maps + multiple warehouses

- Users pick a distribution branch (warehouse) from the `Branch` table.
- The Delivery Planning page loads the Google Maps JS API key from `/api/public-config` and renders a map.
- Route distance + estimated duration are computed client‑side and submitted to the API during checkout.

### Truck availability + conflict detection (transactional checkout)

Checkout implements realistic scheduling constraints:

- Chooses a truck that is not within ±60 minutes of another scheduled trip.
- Uses MySQL transactions + row locking (`FOR UPDATE`) to reduce race conditions during concurrent checkouts.
- If no truck is available, returns `409` with a suggested next available delivery slot.
- Records:
  - `Trip` (branch, destination, distance, estimated time, delivery date/time, truck)
  - `Orders` (user, trip, total, status)
  - `Payment` (method + transaction id)
- Clears cart on successful checkout.

### Stripe payments (test mode) with hosted Checkout

- Server creates a Stripe **Checkout Session** for the current cart total.
- Web app redirects the user to Stripe’s hosted Checkout page.
- On success, Stripe redirects back with a `session_id`; the app finalizes by verifying the session is paid and then places the order.

Notes:

- Test keys should start with `sk_test_` / `pk_test_`.
- Test card: `4242 4242 4242 4242` (any future expiry, any CVC).

## Run locally (Docker)

1) Create `.env` from `.env.example`
2) Start services:

```bash
docker compose up -d --build
```

### Redeploy/update on a server (droplet)

After pulling new code (and updating `.env` when needed), rebuild and recreate the app services:

```bash
docker compose up -d --build --force-recreate api web
```

Quick health checks:

```bash
docker compose ps
docker compose logs -n 200 api
```

To reset the DB volume:

```bash
docker compose down -v
```

## Key environment variables

Required for API auth:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Optional integrations:

- Google Maps: `GOOGLE_MAPS_API_KEY`
- Stripe (test mode): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_CURRENCY`
- Spaces uploads: `SPACES_REGION`, `SPACES_BUCKET`, `SPACES_ENDPOINT`, `SPACES_PUBLIC_BASE_URL`, `SPACES_ACCESS_KEY_ID`, `SPACES_SECRET_ACCESS_KEY`, `SPACES_PRODUCTS_PREFIX`

## Useful API smoke tests

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/items
```

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

## Notes

- MySQL schema is seeded on first run from `db/init.sql`.
- The legacy PHP app can be run via the `php` service in `docker-compose.yml`, but the main project is the Angular + Node stack.
