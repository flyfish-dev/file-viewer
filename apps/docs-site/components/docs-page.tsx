import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { IconArrowUpRight, IconClock, IconGitBranch } from '@tabler/icons-react';
import { getMDXComponents } from '@/components/mdx';
import { getPageMarkdownUrl, source } from '@/lib/source';
import { localePath, site } from '@/lib/shared';
import { QuickstartWorkbench } from './quickstart-workbench';
import { ReadingProgress } from './reading-progress';
import { DocsHome } from './docs-home';

type DocsPageProps = {
  locale: 'en' | 'zh';
  slug?: string[];
};

const relatedRoutes = {
  quickstart: ['guide/quickstart-web', 'guide/ecosystem', 'guide/usage'],
  formats: ['guide/format-fidelity', 'guide/on-demand-renderers', 'guide/demo'],
  default: ['guide/quickstart', 'guide/formats', 'guide/distribution'],
};

function textLength(value: string) {
  return value.replace(/[`#>*_[\]()-]/g, ' ').replace(/\s+/g, ' ').trim().length;
}

function sourcePath(locale: 'en' | 'zh', slugs: string[]) {
  if (slugs.length === 0) return locale === 'zh' ? 'docs/zh/index.md' : 'docs/index.md';
  return `docs/${locale === 'zh' ? 'zh/' : ''}${slugs.join('/')}.md`;
}

function pageCategory(locale: 'en' | 'zh', slugs: string[]) {
  const key = slugs.at(-1) ?? 'home';
  const categories: Record<string, [string, string]> = {
    home: ['Documentation', '文档中心'],
    overview: ['Foundation', '基础'],
    quickstart: ['Get started', '快速开始'],
    'quickstart-web': ['Integration', '集成'],
    'quickstart-vue3': ['Integration', '集成'],
    'quickstart-vue2': ['Integration', '集成'],
    'quickstart-react': ['Integration', '集成'],
    'quickstart-svelte': ['Integration', '集成'],
    ecosystem: ['Packages', '组件包'],
    formats: ['Capability', '能力边界'],
    'format-fidelity': ['Capability', '能力边界'],
    usage: ['Reference', '参考'],
    'style-isolation': ['Customization', '定制'],
    distribution: ['Operations', '交付'],
    docker: ['Operations', '部署'],
    development: ['Project', '项目'],
    changelog: ['Project', '项目'],
    donate: ['Community', '社区'],
  };
  const value = categories[key] ?? ['Guide', '指南'];
  return locale === 'zh' ? value[1] : value[0];
}

export async function FileViewerDocsPage({ locale, slug }: DocsPageProps) {
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  const MDX = page.data.body;
  const rawText = await page.data.getText('processed');
  const minutes = Math.max(2, Math.ceil(textLength(rawText) / (locale === 'zh' ? 500 : 1000)));
  const markdownUrl = getPageMarkdownUrl(page).url;
  const repoPath = sourcePath(locale, page.slugs);
  const isQuickstart = page.slugs.join('/') === 'guide/quickstart';
  const isHome = page.slugs.length === 0;
  const relatedKey = page.slugs.at(-1) === 'formats' ? 'formats' : isQuickstart ? 'quickstart' : 'default';
  const related = relatedRoutes[relatedKey]
    .map((route) => source.getPage(route.split('/'), locale))
    .filter((item): item is NonNullable<typeof item> => Boolean(item && item.url !== page.url));

  const jsonLd = buildStructuredData(page, locale);

  return (
    <>
      <ReadingProgress />
      {isHome ? <DocsHome locale={locale} /> : <DocsPage toc={page.data.toc}>
        <div className="fv-page-meta">
          <span className="fv-page-meta__category">{pageCategory(locale, page.slugs)}</span>
          <span><IconClock size={14} stroke={1.9} aria-hidden="true" />{minutes} {locale === 'zh' ? '分钟阅读' : 'min read'}</span>
          <span><IconGitBranch size={14} stroke={1.9} aria-hidden="true" />v2.3.0 · Stable</span>
        </div>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="fv-page-description">{page.data.description}</DocsDescription>
        <div className="fv-page-actions">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`${site.githubUrl}/blob/main/${repoPath}`}
          />
        </div>
        {isQuickstart ? <QuickstartWorkbench locale={locale} /> : null}
        <DocsBody data-docs-body>
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page),
            })}
          />
        </DocsBody>
        {related.length > 0 ? (
          <section className="fv-related" aria-labelledby="fv-related-heading">
            <div>
              <span className="fv-section-label">{locale === 'zh' ? '继续阅读' : 'Continue reading'}</span>
              <h2 id="fv-related-heading">{locale === 'zh' ? '下一步' : 'Next steps'}</h2>
            </div>
            <div className="fv-related__links">
              {related.slice(0, 3).map((item) => (
                <a key={item.url} href={item.url}>
                  <span>{item.data.title}</span>
                  <small>{item.data.description}</small>
                  <IconArrowUpRight size={17} stroke={1.8} aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </DocsPage>}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </>
  );
}

function buildStructuredData(page: NonNullable<ReturnType<typeof source.getPage>>, locale: 'en' | 'zh') {
  const canonical = `${site.origin}${page.url === '/' ? '' : page.url}`;
  const language = locale === 'zh' ? 'zh-CN' : 'en-US';
  const breadcrumbs = [
    {
      '@type': 'ListItem',
      position: 1,
      name: locale === 'zh' ? '文档' : 'Documentation',
      item: `${site.origin}${localePath(locale) === '/' ? '' : localePath(locale)}`,
    },
    ...page.slugs.map((segment, index) => ({
      '@type': 'ListItem',
      position: index + 2,
      name: index === page.slugs.length - 1 ? page.data.title : segment.replace(/-/g, ' '),
      item: `${site.origin}${localePath(locale, page.slugs.slice(0, index + 1).join('/'))}`,
    })),
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      page.slugs.length === 0
        ? {
            '@type': 'WebSite',
            '@id': `${canonical}#website`,
            url: canonical,
            name: site.name,
            description: page.data.description,
            inLanguage: language,
            publisher: { '@id': 'https://file-viewer.app/#organization' },
          }
        : {
            '@type': 'TechArticle',
            '@id': `${canonical}#article`,
            url: canonical,
            headline: page.data.title,
            description: page.data.description,
            inLanguage: language,
            isPartOf: { '@id': `${site.origin}/#website` },
            about: { '@id': 'https://file-viewer.app/#software' },
            publisher: { '@id': 'https://file-viewer.app/#organization' },
          },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: breadcrumbs,
      },
    ],
  };
}

export function generateDocsStaticParams(locale: 'en' | 'zh') {
  return source.getPages(locale).map((page) => ({ slug: page.slugs }));
}

export async function generateDocsMetadata({ locale, slug }: DocsPageProps): Promise<Metadata> {
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  const alternateLocale: 'en' | 'zh' = locale === 'en' ? 'zh' : 'en';
  const alternate = source.getPage(page.slugs, alternateLocale);
  const canonical = `${site.origin}${page.url === '/' ? '' : page.url}`;
  const markdown = `${site.origin}${getPageMarkdownUrl(page).url}`;
  const languages: Record<string, string> = {
    [locale === 'zh' ? 'zh-CN' : 'en-US']: canonical,
    'x-default': `${site.origin}${localePath('en', page.slugs.join('/')) === '/' ? '' : localePath('en', page.slugs.join('/'))}`,
  };
  if (alternate) {
    languages[alternateLocale === 'zh' ? 'zh-CN' : 'en-US'] = `${site.origin}${alternate.url === '/' ? '' : alternate.url}`;
  }

  const title = page.slugs.length === 0
    ? locale === 'zh'
      ? 'File Viewer 文档 | 集成、格式支持与私有部署'
      : 'File Viewer Documentation | Integration, Formats & Self-Hosting'
    : `${page.data.title} | File Viewer Documentation`;
  const isHome = page.slugs.length === 0;
  const isDemo = page.slugs.join('/') === 'guide/demo';
  const socialImage = isHome
    ? '/_media/social-preview.png'
    : isDemo
      ? locale === 'zh'
        ? '/_media/file-viewer-demo-v2.2.6-samples-zh.webp'
        : '/_media/file-viewer-demo-v2.2.6-samples-en.webp'
      : undefined;

  return {
    title: { absolute: title },
    description: page.data.description,
    applicationName: site.shortName,
    alternates: {
      canonical,
      languages,
      types: { 'text/markdown': markdown },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      type: isHome ? 'website' : 'article',
      url: canonical,
      title,
      description: page.data.description,
      siteName: site.name,
      locale: locale === 'zh' ? 'zh_CN' : 'en_US',
      alternateLocale: [locale === 'zh' ? 'en_US' : 'zh_CN'],
      images: socialImage ? [{ url: socialImage, alt: page.data.title }] : [],
    },
    twitter: {
      card: socialImage ? 'summary_large_image' : 'summary',
      title,
      description: page.data.description,
      images: socialImage ? [socialImage] : [],
    },
  };
}
