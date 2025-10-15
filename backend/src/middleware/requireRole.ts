import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requireRole(roles: string | string[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowed.includes(user.role)) return res.status(403).json({ error: 'Insufficient role' });
    return next();
  };
}

export default requireRole;
