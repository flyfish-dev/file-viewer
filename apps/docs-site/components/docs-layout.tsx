import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { IconExternalLink, IconShieldCheck } from '@tabler/icons-react';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { localePath, site } from '@/lib/shared';
import { SiteHeader } from './site-header';

export function FileViewerDocsLayout({ children, locale }: { children: ReactNode; locale: 'en' | 'zh' }) {
  const chinese = locale === 'zh';
  return (
    <>
      <SiteHeader locale={locale} />
      <DocsLayout
        {...baseOptions(locale)}
        tree={source.getPageTree(locale)}
        sidebar={{
          defaultOpenLevel: 1,
          collapsible: true,
          prefetch: true,
          banner: (
            <a key="docs-sidebar-banner" className="fv-sidebar-banner" href={localePath(locale, 'guide/quickstart')}>
              <IconShieldCheck size={18} stroke={1.8} aria-hidden="true" />
              <span>
                <strong>{chinese ? '浏览器原生 · 离线优先' : 'Browser-native · Offline-first'}</strong>
                <small>{chinese ? '244 个扩展名 · 34 条预览链路' : '244 extensions · 34 preview pipelines'}</small>
              </span>
            </a>
          ),
          footer: (
            <a key="docs-sidebar-footer" className="fv-sidebar-footer" href={site.productUrl} target="_blank" rel="noreferrer">
              {chinese ? '访问产品官网' : 'Visit product website'}
              <IconExternalLink size={15} stroke={1.8} aria-hidden="true" />
            </a>
          ),
        }}
      >
        {children}
      </DocsLayout>
    </>
  );
}
