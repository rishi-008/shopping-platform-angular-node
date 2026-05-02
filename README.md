## Shopping Website (migration)

This repo currently contains a PHP app plus a new Node/TypeScript API in `server/`.

### Run the Node API + MySQL (Docker)

1) Create `.env` from `.env.example`
2) Start services:

```bash
docker compose up -d --build
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

### Notes

- The MySQL database is seeded on first run from `db/init.sql`.
- To reset the DB: `docker compose down -v`
