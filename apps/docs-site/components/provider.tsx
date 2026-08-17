'use client';

import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { i18nProvider, uiTranslations } from 'fumadocs-ui/i18n';
import { zhCN } from '@fumadocs/language/zh-cn';
import { i18n } from '@/lib/i18n';
import SearchDialog from './search';

const zhPack = zhCN();
const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    en: {
      displayName: 'English',
    },
    zh: {
      ...zhPack.value,
      displayName: '简体中文',
    },
  });

export function Provider({ children, locale }: { children: ReactNode; locale: 'en' | 'zh' }) {
  return (
    <RootProvider
      i18n={i18nProvider(translations, locale)}
      search={{ SearchDialog, preload: true }}
      theme={{ defaultTheme: 'system', enableSystem: true }}
    >
      {children}
    </RootProvider>
  );
}
