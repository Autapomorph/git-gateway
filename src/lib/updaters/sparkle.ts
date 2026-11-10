export interface SparkleItem {
  edSignature?: string;
  length?: number;
  pubDate?: string;
  releaseNotesLink?: string;
  title: string;
  type?: string;
  url: string;
  version: string;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function serializeSparkleFeed(title: string, link: string, items: SparkleItem[]): string {
  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(link)}</link>`,
    '    <description>Application Updates</description>',
    '    <language>en</language>',
  ];

  for (const item of items) {
    xmlLines.push('    <item>');
    xmlLines.push(`      <title>${escapeXml(item.title)}</title>`);

    if (item.pubDate) {
      xmlLines.push(`      <pubDate>${escapeXml(item.pubDate)}</pubDate>`);
    }

    if (item.releaseNotesLink) {
      xmlLines.push(
        `      <sparkle:releaseNotesLink>${escapeXml(item.releaseNotesLink)}</sparkle:releaseNotesLink>`,
      );
    }

    const edSigAttr = item.edSignature
      ? ` sparkle:edSignature="${escapeXml(item.edSignature)}"`
      : '';
    const lengthAttr = item.length !== undefined ? ` length="${item.length}"` : '';
    const typeAttr = item.type
      ? ` type="${escapeXml(item.type)}"`
      : ' type="application/octet-stream"';

    xmlLines.push(
      `      <enclosure url="${escapeXml(item.url)}" sparkle:version="${escapeXml(item.version)}"${edSigAttr}${lengthAttr}${typeAttr} />`,
    );

    xmlLines.push('    </item>');
  }

  xmlLines.push('  </channel>');
  xmlLines.push('</rss>');

  return `${xmlLines.join('\n')}\n`;
}
