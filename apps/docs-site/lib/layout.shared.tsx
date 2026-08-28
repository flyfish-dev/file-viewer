import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { IconExternalLink, IconFileDescription, IconTerminal2 } from '@tabler/icons-react';
import { Brand } from '@/components/brand';
import { GitHubStarsLink } from '@/components/github-stars-link';
import { LanguageLink } from '@/components/language-link';
import { localePath, site } from './shared';

export function baseOptions(locale: 'en' | 'zh'): BaseLayoutProps {
  const chinese = locale === 'zh';

  return {
    i18n: false,
    nav: {
      title: <Brand locale={locale} />,
      url: localePath(locale),
      transparentMode: 'none',
    },
    searchToggle: {
      enabled: true,
    },
    themeSwitch: {
      enabled: true,
      mode: 'light-dark-system',
    },
    links: [
      {
        text: chinese ? '快速开始' : 'Quickstart',
        url: localePath(locale, 'guide/quickstart'),
        active: 'nested-url',
      },
      {
        icon: <IconTerminal2 size={17} stroke={1.8} />,
        text: 'CLI',
        url: localePath(locale, 'guide/cli'),
      },
      {
        text: chinese ? '生态接入' : 'Ecosystem',
        url: localePath(locale, 'guide/ecosystem'),
      },
      {
        text: chinese ? '格式支持' : 'Formats',
        url: localePath(locale, 'guide/formats'),
      },
      {
        icon: <IconFileDescription size={17} stroke={1.8} />,
        text: chinese ? '在线体验' : 'Live demo',
        url: site.demoUrl,
        external: true,
        secondary: true,
      },
      {
        type: 'custom',
        secondary: true,
        children: <GitHubStarsLink />,
      },
      {
        type: 'custom',
        secondary: true,
        children: <LanguageLink locale={locale} />,
      },
      {
        type: 'icon',
        label: chinese ? '打开 File Viewer 官网' : 'Open the File Viewer website',
        text: chinese ? '官网' : 'Website',
        icon: <IconExternalLink size={17} stroke={1.8} />,
        url: site.productUrl,
      },
    ],
  };
}
