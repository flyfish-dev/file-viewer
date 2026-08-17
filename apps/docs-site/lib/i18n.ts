import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
  hideLocale: 'default-locale',
  fallbackLanguage: null,
});

export type DocsLocale = (typeof i18n.languages)[number];
