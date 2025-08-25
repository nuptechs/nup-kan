import 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      session?: {
        user?: {
          id: string;
          name: string;
          email: string;
        };
        userId?: string;
        [key: string]: any;
      } | null;
    }
  }
}