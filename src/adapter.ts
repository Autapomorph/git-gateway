import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Request, Response } from 'express';

export type VercelLikeHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<unknown> | unknown;

export function createAdapter(
  handler: VercelLikeHandler,
  queryBuilder?: (req: Request) => Record<string, unknown>,
) {
  return async (req: Request, res: Response) => {
    try {
      const extraQuery = queryBuilder ? queryBuilder(req) : {};
      const mergedQuery = { ...req.query, ...extraQuery };

      const adaptedReq = Object.assign(req, {
        query: mergedQuery,
        headers: req.headers,
      }) as unknown as VercelRequest;

      await handler(adaptedReq, res as unknown as VercelResponse);
    } catch {
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  };
}
