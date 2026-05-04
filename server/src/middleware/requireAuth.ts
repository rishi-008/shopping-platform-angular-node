import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../auth/jwt.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header) return res.status(401).json({ error: 'Missing Authorization header' });

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid Authorization header (expected Bearer token)' });
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      userId: Number(payload.sub),
      email: payload.email,
      userType: payload.user_type
    };

    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
