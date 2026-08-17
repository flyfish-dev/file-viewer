import { notFound } from 'next/navigation';
import { getLLMText, getPageMarkdownUrl, source } from '@/lib/source';

export const revalidate = false;

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const withoutFilename = slug.at(-1) === 'content.md' ? slug.slice(0, -1) : slug;
  const locale = withoutFilename[0] === 'zh' ? 'zh' : 'en';
  const pageSlugs = locale === 'zh' ? withoutFilename.slice(1) : withoutFilename;
  const page = source.getPage(pageSlugs, locale);
  if (!page) notFound();
  return new Response(await getLLMText(page), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: getPageMarkdownUrl(page).segments }));
}
