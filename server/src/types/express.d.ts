import type { UserType } from '../types/user.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        userType: UserType;
      };
    }
  }
}

export {};
