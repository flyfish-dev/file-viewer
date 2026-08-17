'use client';

import { useMemo, type ReactNode } from 'react';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogListItem,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { flexsearchStaticClient } from 'fumadocs-core/search/client/flexsearch-static';
import type { SortedResult } from 'fumadocs-core/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { IconArrowUpRight, IconFileText, IconSparkles } from '@tabler/icons-react';

type CompactSearchResult = SortedResult & {
  pageTitle: string;
  pathLabel: string;
  snippet: string;
};

const pageTitles: Record<'en' | 'zh', Record<string, string>> = {
  en: {
    documentation: 'Documentation home',
    guide: 'Documentation overview',
    overview: 'Overview',
    demo: 'Demo Guide',
    quickstart: 'Quickstart',
    ecosystem: 'Ecosystem Packages',
    'on-demand-renderers': 'Modular and On-demand Renderers',
    'quickstart-web': 'Vanilla JS / Web Component',
    'quickstart-vue3': 'Vue 3 Integration',
    'quickstart-vue2': 'Vue 2 Integration',
    'quickstart-react': 'React Integration',
    'quickstart-svelte': 'Svelte Integration',
    usage: 'Component Options',
    'style-isolation': 'Style Isolation and Customization',
    formats: 'Supported Formats',
    'format-fidelity': 'Format Fidelity',
    compare: 'Comparison',
    faq: 'FAQ',
    development: 'Local Development',
    docker: 'Docker Deployment',
    distribution: 'Distribution',
    changelog: 'Changelog',
    donate: 'Support File Viewer',
  },
  zh: {
    documentation: 'File Viewer 文档首页',
    zh: 'File Viewer 文档首页',
    guide: '文档导览',
    overview: '概述',
    demo: 'Demo 说明',
    quickstart: '快速开始',
    ecosystem: '生态组件总览',
    'on-demand-renderers': '按需渲染架构',
    'quickstart-web': '纯 JS 与 Web Component 集成',
    'quickstart-vue3': 'Vue 3 集成',
    'quickstart-vue2': 'Vue 2 集成',
    'quickstart-react': 'React 集成',
    'quickstart-svelte': 'Svelte 集成',
    usage: '组件用法',
    'style-isolation': '样式隔离与主题定制',
    formats: '支持格式',
    'format-fidelity': '格式完整度与渲染路线',
    compare: '方案对比',
    faq: '常见问题',
    development: '本地开发与打包',
    docker: 'Docker 部署',
    distribution: '发布与开源分发',
    changelog: '更新日志',
    donate: '赞助 File Viewer',
  },
};

function plainText(value: string | ReactNode | undefined) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<\/?mark>/g, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[\s/_-]+/g, ' ').trim();
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) return value;
  const clipped = value.slice(0, limit - 1);
  const boundary = Math.max(clipped.lastIndexOf('。'), clipped.lastIndexOf('. '), clipped.lastIndexOf('，'), clipped.lastIndexOf(', '), clipped.lastIndexOf(' '));
  return `${clipped.slice(0, boundary > limit * 0.55 ? boundary + 1 : limit - 1).trim()}…`;
}

function pageNameFromPath(url: string) {
  const segment = url.split('#')[0].split('/').filter(Boolean).at(-1) ?? 'documentation';
  return segment.replace(/-/g, ' ');
}

function localizedPageTitle(url: string, locale: string, fallback: string) {
  const segment = url.split('#')[0].split('/').filter(Boolean).at(-1) ?? 'documentation';
  const language = locale === 'zh' ? 'zh' : 'en';
  return pageTitles[language][segment] ?? fallback;
}

function resultScore(title: string, section: string, content: string, url: string, query: string, type: SortedResult['type']) {
  const normalizedQuery = normalize(query);
  const words = normalizedQuery.split(' ').filter(Boolean);
  const normalizedTitle = normalize(title);
  const normalizedSection = normalize(section);
  const normalizedContent = normalize(content);
  const normalizedUrl = normalize(url);
  let score = type === 'page' ? 18 : type === 'heading' ? 10 : 2;

  if (normalizedTitle === normalizedQuery) score += 180;
  else if (normalizedTitle.includes(normalizedQuery)) score += 120;
  else if (words.length > 0 && words.every((word) => normalizedTitle.includes(word))) score += 90;
  if (normalizedUrl.includes(normalizedQuery)) score += 72;
  if (normalizedSection.includes(normalizedQuery)) score += 48;
  if (normalizedContent.includes(normalizedQuery)) score += 20;
  if (/changelog|更新日志/.test(normalizedTitle) && !normalizedTitle.includes(normalizedQuery) && !/^v?\d/.test(normalizedQuery)) score -= 42;
  return score;
}

export function compactSearchResults(results: SortedResult[], query: string, locale: string): CompactSearchResult[] {
  const byPage = new Map<string, { result: CompactSearchResult; score: number; snippetScore: number }>();
  const snippetLimit = locale === 'zh' ? 76 : 132;

  for (const item of results) {
    const pageUrl = item.url.split('#')[0];
    const breadcrumbs = item.breadcrumbs?.map(plainText).filter(Boolean) ?? [];
    const content = plainText(item.content);
    const inferredTitle = item.type === 'page' ? content : breadcrumbs[0] || pageNameFromPath(pageUrl);
    const title = localizedPageTitle(pageUrl, locale, inferredTitle);
    const section = item.type === 'heading' ? content : breadcrumbs.at(-1) ?? '';
    const snippet = item.type === 'text' ? truncate(content, snippetLimit) : '';
    const score = resultScore(title, section, content, pageUrl, query, item.type);
    const current = byPage.get(pageUrl);

    if (!current) {
      byPage.set(pageUrl, {
        score,
        snippetScore: item.type === 'text' ? score : Number.NEGATIVE_INFINITY,
        result: {
          ...item,
          id: `page:${pageUrl}`,
          url: pageUrl,
          type: 'page',
          content: title,
          pageTitle: title,
          pathLabel: breadcrumbs.length > 1 ? breadcrumbs.slice(0, -1).join(' / ') : pageUrl,
          snippet,
        },
      });
      continue;
    }

    if (score > current.score) {
      current.score = score;
      current.result.pageTitle = title;
      current.result.content = title;
      current.result.pathLabel = breadcrumbs.length > 1 ? breadcrumbs.slice(0, -1).join(' / ') : pageUrl;
    }
    if (item.type === 'text' && score > current.snippetScore && snippet) {
      current.snippetScore = score;
      current.result.snippet = snippet;
    }
  }

  return [...byPage.values()]
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.result.pageTitle.localeCompare(b.result.pageTitle, locale))
    .slice(0, 8)
    .map(({ result }) => result);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = normalize(query).split(' ').filter((term) => term.length > 0).sort((a, b) => b.length - a.length);
  if (terms.length === 0) return text;
  const parts = text.split(new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi'));
  return parts.map((part, index) => terms.some((term) => normalize(part) === term)
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : part);
}

export default function FileViewerSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const activeLocale = locale ?? 'en';
  const { search, setSearch, query } = useDocsSearch({
    client: flexsearchStaticClient({ locale: activeLocale }),
  });
  const chinese = activeLocale === 'zh';
  const items = useMemo(() => {
    if (!search.trim() || !Array.isArray(query.data)) return null;
    return compactSearchResults(query.data, search, activeLocale);
  }, [activeLocale, query.data, search]);

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent className="fv-search-dialog">
        <SearchDialogHeader className="fv-search-header">
          <SearchDialogIcon />
          <SearchDialogInput aria-label={chinese ? '搜索 File Viewer 文档' : 'Search File Viewer documentation'} />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          className="fv-search-results"
          items={items}
          Empty={() => (
            <div className="fv-search-empty">
              <IconFileText size={20} stroke={1.7} aria-hidden="true" />
              <strong>{chinese ? '没有找到匹配文档' : 'No matching documentation'}</strong>
              <span>{chinese ? '尝试组件名、格式名或配置项。' : 'Try a component, format, or option name.'}</span>
            </div>
          )}
          Item={({ item, onClick }) => {
            const result = item as CompactSearchResult;
            return (
              <SearchDialogListItem item={item} onClick={onClick} className="fv-search-result">
                <span className="fv-search-result__icon"><IconFileText size={16} stroke={1.8} aria-hidden="true" /></span>
                <span className="fv-search-result__body">
                  <span className="fv-search-result__title"><Highlight text={result.pageTitle} query={search} /></span>
                  <span className="fv-search-result__path">{result.pathLabel}</span>
                  {result.snippet ? <span className="fv-search-result__snippet"><Highlight text={result.snippet} query={search} /></span> : null}
                </span>
                <IconArrowUpRight className="fv-search-result__arrow" size={16} stroke={1.8} aria-hidden="true" />
              </SearchDialogListItem>
            );
          }}
        />
        <SearchDialogFooter className="fv-search-footer">
          <span><IconSparkles size={14} stroke={1.8} aria-hidden="true" />{chinese ? '标题与路径优先排序' : 'Titles and paths rank first'}</span>
          {items ? <span>{items.length} {chinese ? '个相关页面' : 'relevant pages'}</span> : <span>{chinese ? '本地静态索引' : 'Local static index'}</span>}
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
