import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const scanned = await Promise.all(source.getPages().map(getLLMText));
  const introduction = '# File Viewer full documentation corpus\n\n> Complete bilingual corpus. For targeted retrieval, use /llms.txt and the per-page /llms.mdx/.../content.md endpoints.\n\n';
  return new Response(introduction + scanned.join('\n\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
