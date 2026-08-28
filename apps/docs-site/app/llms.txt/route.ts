import { llms } from 'fumadocs-core/source';
import { getPageMarkdownUrl, source } from '@/lib/source';
import { site } from '@/lib/shared';

export const revalidate = false;

export function GET() {
  const introduction = `# File Viewer Documentation\n\n> Browser-native, offline-first file preview for 244 registered extensions across 34 preview pipelines: 221 stable and 23 experimental.\n\nUse the canonical HTML pages for navigation and citations. For retrieval, prefer the per-page raw Markdown links below instead of loading the complete corpus at once.\n\n`;
  const markdownPages = source.getPages()
    .sort((a, b) => `${a.locale}:${a.url}`.localeCompare(`${b.locale}:${b.url}`))
    .map((page) => `- [${page.locale === 'zh' ? '中文' : 'English'} · ${page.data.title}](${site.origin}${getPageMarkdownUrl(page).url}): ${page.data.description}`)
    .join('\n');
  const rawIndex = `\n\n## Raw Markdown directory\n\n${markdownPages}\n`;
  return new Response(introduction + llms(source).index() + rawIndex, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
