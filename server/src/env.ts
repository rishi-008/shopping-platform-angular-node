import dotenv from 'dotenv';

dotenv.config();

function mustGet(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value == null || value === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? '3001'),
  corsOrigin: mustGet('CORS_ORIGIN', 'http://localhost:4200'),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  jobs: {
    resetTrucksIntervalMs: Number(process.env.RESET_TRUCKS_INTERVAL_MS ?? String(60 * 60 * 1000))
  },
  jwt: {
    accessSecret: mustGet('JWT_ACCESS_SECRET'),
    refreshSecret: mustGet('JWT_REFRESH_SECRET'),
    accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? '900'),
    refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? String(60 * 60 * 24 * 30))
  },
  db: {
    host: mustGet('DB_HOST', 'localhost'),
    user: mustGet('DB_USER', 'root'),
    password: process.env.DB_PASSWORD ?? '',
    name: mustGet('DB_NAME', 'osp_db'),
    port: Number(process.env.DB_PORT ?? '3306'),
    sslMode: (process.env.DB_SSL_MODE ?? 'disable') as 'disable' | 'prefer' | 'require',
    sslCaPath: process.env.DB_SSL_CA_PATH,
    sslCaBase64: process.env.DB_SSL_CA_BASE64
  }
};
