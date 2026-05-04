import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../env.js';
import type { UserType } from '../types/user.js';

export type AccessTokenPayload = {
  sub: string; // userId
  email: string;
  user_type: UserType;
};

export type RefreshTokenPayload = {
  sub: string; // userId
  tid: string; // token id
};

export function signAccessToken(input: { userId: number; email: string; userType: UserType }): string {
  const payload: AccessTokenPayload = {
    sub: String(input.userId),
    email: input.email,
    user_type: input.userType
  };

  return jwt.sign(payload, env.jwt.accessSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwt.accessTtlSeconds
  });
}

export function signRefreshToken(input: { userId: number; tokenId: string }): string {
  const payload: RefreshTokenPayload = {
    sub: String(input.userId),
    tid: input.tokenId
  };

  return jwt.sign(payload, env.jwt.refreshSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwt.refreshTtlSeconds
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret, { algorithms: ['HS256'] }) as RefreshTokenPayload;
}

export function newTokenId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
