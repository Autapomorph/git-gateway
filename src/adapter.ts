import type { Request, Response } from 'express';

import type { GatewayHandler, GatewayRequest } from './types/http.js';

export function createAdapter(
  handler: GatewayHandler,
  queryBuilder?: (req: Request) => Record<string, unknown>,
) {
  return async (req: Request, res: Response) => {
    try {
      const extraQuery = queryBuilder ? queryBuilder(req) : {};
      const mergedQuery = { ...req.query, ...extraQuery };

      const adaptedReq = Object.assign(req, {
        query: mergedQuery,
      }) as unknown as GatewayRequest;

      await handler(adaptedReq, res);
    } catch {
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  };
}
