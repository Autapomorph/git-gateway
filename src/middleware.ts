import type { NextFunction, Request, Response } from 'express';

// Global CORS Middleware matching vercel.json configuration
export function corsMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Accept, Content-Type, X-App-Language, X-Update-Channel, X-Vercel-Protection-Bypass',
  );

  if (_req.method === 'OPTIONS') {
    res.status(204).end();

    return;
  }

  next();
}
