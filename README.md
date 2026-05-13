# Shopping Website — Full‑Stack Project

Short: A full‑stack e‑commerce and delivery management platform (Angular frontend, Node/TypeScript API, MySQL), deployed with Docker Compose.

Live site

- https://productsmarket.tech
- https://www.productsmarket.tech

One‑line summary

Full‑stack e‑commerce app with JWT auth, admin catalog management, Google Maps delivery planning, Stripe hosted Checkout, and Docker Compose deployment.

Key features

- JWT access + rotating refresh tokens for secure sessions
- Admin product CRUD and secure image uploads (presigned PUT to DigitalOcean Spaces)
- Delivery planning using Google Maps routing and transactional truck scheduling (MySQL row‑locking)
- Stripe hosted Checkout integration (test mode) and order finalization
- Containerized deployment with Docker Compose; production behind nginx on a DigitalOcean droplet

Tech stack

- Frontend: Angular (standalone components), RxJS
- Backend: Node.js, TypeScript, Express
- Database: MySQL
- Storage: DigitalOcean Spaces (S3 compatible)
- Payments: Stripe (hosted Checkout, test keys)
- Deployment: Docker Compose, nginx reverse proxy

Quickstart (local / droplet)

1. Copy and edit environment variables from `.env.example`.

2. Start services:

```bash
docker compose up -d --build --force-recreate api web
docker compose ps
docker compose logs -f api
```

3. Build frontend (if needed locally):

```bash
npm -C web run build -- --configuration production
```

Notes

- Ensure `CORS_ORIGIN` in the API env matches your site origin (apex vs www). 
- DigitalOcean Spaces requires a CORS rule allowing `PUT` and the appropriate origin; uploaded objects must be publicly readable for storefront display.
- Test Stripe keys begin with `sk_test_` / `pk_test_`.

Where to look in the repo

- API entry: `server/src/index.ts`
- Frontend app: `web/`
- Admin upload signing: `server/src/routes/adminUploads.ts`
- Stripe session routes: `server/src/routes/stripe.ts`
- Docker compose: `docker-compose.yml`

