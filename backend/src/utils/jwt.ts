import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JWTPayload } from '../middleware/auth';

export function generateToken(payload: JWTPayload): string {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  const secret: string = env.JWT_SECRET;
  
  return (jwt.sign as (payload: object, secret: string, options: { expiresIn: string }) => string)(
    payload,
    secret,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
}

export function verifyToken(token: string): JWTPayload {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  const secret: string = env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  return decoded as unknown as JWTPayload;
}
