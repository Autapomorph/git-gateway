import type { VercelRequest, VercelResponse } from '@vercel/node';

import { REPO_BRANCH } from '../lib/config/index.js';
import { isTextContent } from '../lib/mime.js';
import { getProvider } from '../lib/providers/index.js';

const MAX_BATCH_FILES = 50;

function sanitizePath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, '/');
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

interface FileResponseItem {
  content: string;
  contentType: string;
  encoding: 'base64' | 'utf-8';
  size: number;
}

export async function filesHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  let paths: string[] = [];

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
      paths?: unknown;
    };

    if (Array.isArray(body?.paths)) {
      paths = body.paths.filter((p): p is string => typeof p === 'string');
    }
  } else {
    const rawPaths = Array.isArray(req.query.paths) ? req.query.paths[0] : req.query.paths;

    if (typeof rawPaths === 'string') {
      paths = rawPaths
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
    }
  }

  if (paths.length === 0) {
    return res.status(400).json({ error: 'Missing or empty paths parameter' });
  }

  if (paths.length > MAX_BATCH_FILES) {
    return res.status(400).json({
      error: `Too many paths requested. Maximum allowed is ${MAX_BATCH_FILES}.`,
    });
  }

  const refParam = Array.isArray(req.query.ref) ? req.query.ref[0] : req.query.ref;
  const ref = refParam && typeof refParam === 'string' ? refParam.trim() : REPO_BRANCH;

  try {
    const provider = getProvider();
    const files: Record<string, FileResponseItem> = {};
    const errors: Record<string, string> = {};

    await Promise.all(
      paths.map(async originalPath => {
        const cleanPath = sanitizePath(originalPath);

        if (!cleanPath) {
          errors[originalPath] = 'Invalid file path';

          return;
        }

        try {
          const result = await provider.getFile(cleanPath, ref);

          if (!result) {
            errors[originalPath] = 'Not Found';

            return;
          }

          const isText = isTextContent(result.contentType);
          const encoding = isText ? 'utf-8' : 'base64';
          const content = isText
            ? result.content.toString('utf-8')
            : result.content.toString('base64');

          files[originalPath] = {
            content,
            contentType: result.contentType,
            encoding,
            size: result.size,
          };
        } catch (error: unknown) {
          errors[originalPath] = error instanceof Error ? error.message : 'Unknown error';
        }
      }),
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');

    return res.status(200).json({
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      files,
      ref,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    return res.status(500).send(message);
  }
}
