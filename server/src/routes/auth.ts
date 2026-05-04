import type { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool } from '../db.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { newTokenId, sha256, signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt.js';
import type { UserType } from '../types/user.js';
import { env } from '../env.js';

type UserRow = RowDataPacket & {
  User_Id: number;
  Email: string;
  Password: string;
  User_Type: UserType;
  Name: string;
  Address: string;
};

type RefreshTokenRow = RowDataPacket & {
  RefreshToken_Id: number;
  User_Id: number;
  Token_Id_Hash: string;
  Expires_At: Date;
  Revoked_At: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function registerAuthRoutes(router: Router) {
  router.post('/auth/register', async (req, res) => {
    const { name, email, password, address } = req.body as Record<string, unknown>;

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(address)) {
      return res.status(400).json({ error: 'name, email, password, address are required' });
    }

    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
      const [existing] = await pool.query<RowDataPacket[]>('SELECT 1 FROM Users WHERE Email = :email LIMIT 1', {
        email
      });
      if (existing.length > 0) return res.status(409).json({ error: 'Email already exists' });

      const passwordHash = await hashPassword(password);

      const [result] = await pool.execute<ResultSetHeader>(
        "INSERT INTO Users (Name, Email, Password, Address, User_Type) VALUES (:name, :email, :password, :address, 'user')",
        { name, email, password: passwordHash, address }
      );

      const userId = result.insertId;
      const userType: UserType = 'user';

      const tokenId = newTokenId();
      const refreshToken = signRefreshToken({ userId, tokenId });
      const accessToken = signAccessToken({ userId, email, userType });

      await pool.execute(
        'INSERT INTO RefreshToken (User_Id, Token_Id_Hash, Expires_At) VALUES (:userId, :tokenHash, DATE_ADD(NOW(), INTERVAL :ttl SECOND))',
        {
          userId,
          tokenHash: sha256(tokenId),
          ttl: env.jwt.refreshTtlSeconds
        }
      );

      return res.status(201).json({
        accessToken,
        refreshToken,
        user: { id: userId, name, email, userType }
      });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body as Record<string, unknown>;

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    try {
      const [rows] = await pool.query<UserRow[]>(
        'SELECT User_Id, Email, Password, User_Type, Name, Address FROM Users WHERE Email = :email LIMIT 1',
        { email }
      );

      if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

      const user = rows[0];
      const ok = await verifyPassword(password, user.Password);
      if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

      const tokenId = newTokenId();
      const refreshToken = signRefreshToken({ userId: user.User_Id, tokenId });
      const accessToken = signAccessToken({ userId: user.User_Id, email: user.Email, userType: user.User_Type });

      await pool.execute(
        'INSERT INTO RefreshToken (User_Id, Token_Id_Hash, Expires_At) VALUES (:userId, :tokenHash, DATE_ADD(NOW(), INTERVAL :ttl SECOND))',
        { userId: user.User_Id, tokenHash: sha256(tokenId), ttl: env.jwt.refreshTtlSeconds }
      );

      return res.json({
        accessToken,
        refreshToken,
        user: { id: user.User_Id, name: user.Name, email: user.Email, userType: user.User_Type }
      });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post('/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body as Record<string, unknown>;
    if (!isNonEmptyString(refreshToken)) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const userId = Number(payload.sub);
      const tokenId = payload.tid;

      const tokenHash = sha256(tokenId);
      const [rows] = await pool.query<RefreshTokenRow[]>(
        'SELECT RefreshToken_Id, User_Id, Token_Id_Hash, Expires_At, Revoked_At FROM RefreshToken WHERE Token_Id_Hash = :tokenHash LIMIT 1',
        { tokenHash }
      );

      if (rows.length === 0) return res.status(401).json({ error: 'Invalid refresh token' });
      const dbToken = rows[0];

      if (dbToken.User_Id !== userId) return res.status(401).json({ error: 'Invalid refresh token' });
      if (dbToken.Revoked_At) return res.status(401).json({ error: 'Refresh token revoked' });
      if (dbToken.Expires_At.getTime() <= Date.now()) return res.status(401).json({ error: 'Refresh token expired' });

      // Rotate refresh token
      const nextTokenId = newTokenId();
      const nextRefreshToken = signRefreshToken({ userId, tokenId: nextTokenId });

      await pool.execute('UPDATE RefreshToken SET Revoked_At = NOW() WHERE RefreshToken_Id = :id', {
        id: dbToken.RefreshToken_Id
      });

      await pool.execute(
        'INSERT INTO RefreshToken (User_Id, Token_Id_Hash, Expires_At) VALUES (:userId, :tokenHash, DATE_ADD(NOW(), INTERVAL :ttl SECOND))',
        { userId, tokenHash: sha256(nextTokenId), ttl: env.jwt.refreshTtlSeconds }
      );

      const [userRows] = await pool.query<UserRow[]>(
        'SELECT User_Id, Email, User_Type, Name, Address, Password FROM Users WHERE User_Id = :userId LIMIT 1',
        { userId }
      );
      if (userRows.length === 0) return res.status(401).json({ error: 'User not found' });

      const user = userRows[0];
      const accessToken = signAccessToken({ userId, email: user.Email, userType: user.User_Type });

      return res.json({ accessToken, refreshToken: nextRefreshToken });
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  });
}
