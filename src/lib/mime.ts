import mime from 'mime-types';

export function isTextContent(contentType: string): boolean {
  const type = contentType.toLowerCase();

  return (
    type.startsWith('text/') ||
    type.includes('+json') ||
    type.includes('+xml') ||
    /\b(?:json|xml|yaml|toml|javascript)\b/.test(type)
  );
}

export function getMimeType(filePath: string): string {
  const lookup = mime.lookup(filePath);

  if (lookup) {
    return isTextContent(lookup) && !lookup.includes('charset')
      ? `${lookup}; charset=utf-8`
      : lookup;
  }

  return 'application/octet-stream';
}
