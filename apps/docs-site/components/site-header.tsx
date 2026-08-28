'use client';

import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { IconChevronDown, IconRocket, IconTerminal2 } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import { Brand } from './brand';
import { GitHubStarsLink } from './github-stars-link';
import { LanguageLink } from './language-link';
import { localePath, site } from '@/lib/shared';

export function SiteHeader({ locale }: { locale: 'en' | 'zh' }) {
  const chinese = locale === 'zh';
  const pathname = usePathname() ?? localePath(locale);
  const quickstartPath = localePath(locale, 'guide/quickstart');
  const cliPath = localePath(locale, 'guide/cli');
  const ecosystemPath = localePath(locale, 'guide/ecosystem');
  const formatsPath = localePath(locale, 'guide/formats');
  const quickstartActive = pathname.startsWith(quickstartPath);
  const cliActive = pathname === cliPath;
  const ecosystemActive = pathname === ecosystemPath || pathname === localePath(locale, 'guide/on-demand-renderers');
  const formatsActive = pathname === formatsPath || pathname === localePath(locale, 'guide/format-fidelity');
  const docsActive = !quickstartActive && !cliActive && !ecosystemActive && !formatsActive;
  const resourceGroups = chinese
    ? [
        {
          label: '产品',
          links: [
            ['File Viewer 官网', site.productUrl],
            ['在线 Demo', site.demoUrl],
            ['方案对比', `${site.demoUrl}/compare.html`],
          ],
        },
        {
          label: '组件包',
          links: [
            ['npm Core', 'https://www.npmjs.com/package/@file-viewer/core'],
            ['npm CLI', 'https://www.npmjs.com/package/@file-viewer/cli'],
            ['npm Web Component', 'https://www.npmjs.com/package/@file-viewer/web'],
            ['npm Vue 3', 'https://www.npmjs.com/package/@file-viewer/vue3'],
            ['npm React', 'https://www.npmjs.com/package/@file-viewer/react'],
            ['npm Svelte', 'https://www.npmjs.com/package/@file-viewer/svelte'],
          ],
        },
        {
          label: '社区与支持',
          links: [
            ['GitHub 开源总仓', site.githubUrl],
            ['GitHub Wiki', `${site.githubUrl}/wiki`],
            ['Gitee 开源总仓', 'https://gitee.com/flyfish-dev/file-viewer'],
            ['GitHub Sponsors', 'https://github.com/sponsors/wybaby168'],
            ['国内赞赏', 'https://dev.flyfish.group/sponsor?source=github'],
            ['企业技术支持', 'https://dev.flyfish.group/shop'],
          ],
        },
      ]
    : [
        {
          label: 'Product',
          links: [
            ['File Viewer website', `${site.productUrl}/en/`],
            ['Live demo', site.demoUrl],
            ['Compare demo', `${site.demoUrl}/compare.html`],
          ],
        },
        {
          label: 'Packages',
          links: [
            ['npm Core', 'https://www.npmjs.com/package/@file-viewer/core'],
            ['npm CLI', 'https://www.npmjs.com/package/@file-viewer/cli'],
            ['npm Web Component', 'https://www.npmjs.com/package/@file-viewer/web'],
            ['npm Vue 3', 'https://www.npmjs.com/package/@file-viewer/vue3'],
            ['npm React', 'https://www.npmjs.com/package/@file-viewer/react'],
            ['npm Svelte', 'https://www.npmjs.com/package/@file-viewer/svelte'],
          ],
        },
        {
          label: 'Community & support',
          links: [
            ['GitHub repository', site.githubUrl],
            ['GitHub Wiki', `${site.githubUrl}/wiki`],
            ['GitHub Sponsors', 'https://github.com/sponsors/wybaby168'],
            ['Enterprise support', 'https://dev.flyfish.group/shop'],
          ],
        },
      ];
  return (
    <header className="fv-site-header">
      <div className="fv-site-header__inner">
        <a className="fv-site-header__brand" href={localePath(locale)} aria-label={chinese ? 'File Viewer 文档首页' : 'File Viewer documentation home'}>
          <Brand locale={locale} />
        </a>
        <FullSearchTrigger className="fv-site-search" />
        <nav className="fv-site-nav" aria-label={chinese ? '主导航' : 'Primary navigation'}>
          <a className={docsActive ? 'is-active' : undefined} href={localePath(locale)}>{chinese ? '文档' : 'Docs'}</a>
          <a className={quickstartActive ? 'is-active' : undefined} href={quickstartPath}><IconRocket size={15} stroke={1.9} aria-hidden="true" />{chinese ? '快速开始' : 'Quickstart'}</a>
          <a className={cliActive ? 'is-active' : undefined} href={cliPath}><IconTerminal2 size={15} stroke={1.9} aria-hidden="true" />CLI</a>
          <a className={ecosystemActive ? 'is-active' : undefined} href={ecosystemPath}>{chinese ? '生态接入' : 'Ecosystem'}</a>
          <a className={formatsActive ? 'is-active' : undefined} href={formatsPath}>{chinese ? '支持格式' : 'Formats'}</a>
          <details className="fv-resources-menu">
            <summary>
              {chinese ? '资源' : 'Resources'}
              <IconChevronDown size={14} stroke={1.8} aria-hidden="true" />
            </summary>
            <div className="fv-resources-menu__panel">
              {resourceGroups.map((group) => (
                <section key={group.label}>
                  <strong>{group.label}</strong>
                  {group.links.map(([label, url]) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">{label}</a>
                  ))}
                </section>
              ))}
            </div>
          </details>
        </nav>
        <div className="fv-site-header__tools">
          <LanguageLink locale={locale} />
          <ThemeSwitch className="fv-theme-switch" mode="light-dark" />
          <GitHubStarsLink />
        </div>
      </div>
    </header>
  );
}
