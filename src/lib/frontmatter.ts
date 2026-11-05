import matter from 'gray-matter';

export interface ParsedFrontmatter {
  content: string;
  meta: Record<string, unknown>;
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const parsed = matter(raw);

  return {
    content: parsed.content.trim(),
    meta: parsed.data,
  };
}
