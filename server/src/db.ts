import mysql from 'mysql2/promise';
import fs from 'node:fs';
import { env } from './env.js';

function buildSslOptions(): undefined | { ca?: string; rejectUnauthorized: boolean } {
  const mode = env.db.sslMode;
  if (mode === 'disable') return undefined;

  const caFromBase64 = env.db.sslCaBase64?.trim();
  const caFromPath = env.db.sslCaPath?.trim();

  const ca =
    caFromBase64 && caFromBase64.length > 0
      ? Buffer.from(caFromBase64, 'base64').toString('utf8')
      : caFromPath && caFromPath.length > 0
        ? fs.readFileSync(caFromPath, 'utf8')
        : undefined;

  // For managed DBs like DO, prefer/require usually implies cert validation.
  return { ca, rejectUnauthorized: true };
}

export const pool = mysql.createPool({
  host: env.db.host,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  port: env.db.port,
  ssl: buildSslOptions(),
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});
