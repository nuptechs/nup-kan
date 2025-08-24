import 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      session?: {
        userId?: string;
        [key: string]: any;
      } | null;
    }
  }
}