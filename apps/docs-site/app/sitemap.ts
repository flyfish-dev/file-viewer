import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { localePath, site } from '@/lib/shared';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return source.getPages().flatMap((page) => {
    if (seen.has(page.url)) return [];
    seen.add(page.url);
    const english = source.getPage(page.slugs, 'en');
    const chinese = source.getPage(page.slugs, 'zh');
    const url = `${site.origin}${page.url === '/' ? '' : page.url}`;
    return [{
      url,
      lastModified: new Date('2026-08-14T00:00:00.000Z'),
      changeFrequency: page.slugs.length === 0 ? 'weekly' : 'monthly',
      priority: page.slugs.length === 0 ? 1 : page.slugs.at(-1) === 'quickstart' ? 0.9 : 0.72,
      alternates: {
        languages: {
          'en-US': `${site.origin}${english?.url === '/' ? '' : english?.url ?? localePath('en', page.slugs.join('/'))}`,
          'zh-CN': `${site.origin}${chinese?.url ?? localePath('zh', page.slugs.join('/'))}`,
          'x-default': `${site.origin}${english?.url === '/' ? '' : english?.url ?? localePath('en', page.slugs.join('/'))}`,
        },
      },
    }];
  });
}
