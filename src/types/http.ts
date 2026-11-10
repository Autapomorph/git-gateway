import type { IncomingHttpHeaders, ServerResponse } from 'node:http';

export interface GatewayRequest {
  body?: unknown;
  headers: IncomingHttpHeaders;
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

export type GatewayResponse = Pick<ServerResponse, 'end' | 'headersSent' | 'setHeader' | 'write'> &
  NodeJS.WritableStream & {
    json(body: unknown): GatewayResponse | void;
    redirect?(statusOrUrl: number | string, url?: string): GatewayResponse | void;
    send(body: unknown): GatewayResponse | void;
    status(code: number): GatewayResponse;
  };

export type GatewayHandler = (
  req: GatewayRequest,
  res: GatewayResponse,
) => Promise<unknown> | unknown;
