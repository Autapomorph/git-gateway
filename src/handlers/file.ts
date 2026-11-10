import { REPO_BRANCH } from '../lib/config/index.js';
import { getProvider } from '../lib/providers/index.js';
import type { GatewayRequest, GatewayResponse } from '../types/http.js';

function sanitizePath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, '/');

  // Prevent path traversal
  const segments = normalized.split('/').filter(segment => segment && segment !== '.');
  const safeSegments: string[] = [];

  for (const segment of segments) {
    if (segment === '..') {
      safeSegments.pop();
    } else {
      safeSegments.push(segment);
    }
  }

  return safeSegments.join('/');
}

export async function fileHandler(req: GatewayRequest, res: GatewayResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;

  if (!rawPath || typeof rawPath !== 'string') {
    return res.status(400).send('Invalid or missing file path parameter');
  }

  const filePath = sanitizePath(rawPath);

  if (!filePath) {
    return res.status(400).send('Invalid file path');
  }

  const refParam = Array.isArray(req.query.ref) ? req.query.ref[0] : req.query.ref;
  const ref = refParam && typeof refParam === 'string' ? refParam.trim() : REPO_BRANCH;

  try {
    const provider = getProvider();
    const result = await provider.getFile(filePath, ref);

    if (!result) {
      return res.status(404).send('File Not Found');
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', String(result.size));
    res.setHeader('Cache-Control', 'public, max-age=300');

    return res.status(200).send(result.content);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    return res.status(500).send(message);
  }
}
