## Shopping Website API (Node + TypeScript)

### Setup

1) Create `.env` from `.env.example`
2) Install deps

```bash
cd server
npm install
```

### DigitalOcean Managed MySQL

In your DO database page, copy the connection details into `server/.env`:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

DO commonly requires TLS. Set:

- `DB_SSL_MODE=require`
- Provide the CA cert via either:
	- `DB_SSL_CA_PATH=/absolute/path/to/ca.crt`
	- OR `DB_SSL_CA_BASE64=...` (base64 contents of the CA cert)

Also ensure your machine/IP is allowed to connect in DO “Trusted sources”.

### Run (dev)

```bash
npm run dev
```

### Endpoints

- `GET http://localhost:3001/api/health`
- `GET http://localhost:3001/api/items`
- `GET http://localhost:3001/api/items?department=ELECTRONICS`
