import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  const message = (err && (err as any).message) ? (err as any).message : 'Internal Server Error';
  const status = (err && typeof (err as any).status === 'number') ? (err as any).status : 500;
  res.status(status).json({ success: false, message });
}

export default errorHandler;
