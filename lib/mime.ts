const MIME_TYPES: Record<string, string> = {
  '.7z': 'application/x-7z-compressed',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.htm': 'text/html; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonld': 'application/ld+json',
  '.md': 'text/markdown; charset=utf-8',
  '.mdx': 'text/mdx; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.tar': 'application/x-tar',
  '.ts': 'text/plain; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.zip': 'application/zip',
};

const TEXT_MIME_PATTERNS = [
  /^text\//,
  /json/,
  /xml/,
  /yaml/,
  /javascript/,
  /markdown/,
  /mdx/,
  /svg/,
];

export function getMimeType(filePath: string): string {
  const match = /\.[a-zA-Z0-9_-]+$/.exec(filePath);

  if (!match) {
    return 'application/octet-stream';
  }

  const ext = match[0].toLowerCase();

  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export function isTextContent(contentType: string): boolean {
  return TEXT_MIME_PATTERNS.some(pattern => pattern.test(contentType));
}
