import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-strong-secret-key';

export interface AuthRequest extends Request {
  user?: any;
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  // First try to get token from cookie
  let token = req.cookies.token;
  
  // If no cookie, try Authorization header as fallback
  if (!token) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    return next();
  } catch (err) {
    // Clear invalid cookie if present
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default authenticateJWT;
