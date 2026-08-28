'use client';

import { usePathname } from 'next/navigation';
import { IconLanguage } from '@tabler/icons-react';

export function LanguageLink({ locale }: { locale: 'en' | 'zh' }) {
  const pathname = usePathname() ?? (locale === 'zh' ? '/zh' : '/');
  const target = locale === 'zh'
    ? pathname.replace(/^\/zh(?=\/|$)/, '') || '/'
    : `/zh${pathname === '/' ? '' : pathname}`;

  return (
    <a
      className="fv-language-link"
      href={target}
      aria-label={locale === 'zh' ? 'Switch to English' : '切换到简体中文'}
    >
      <IconLanguage size={17} stroke={1.8} aria-hidden="true" />
      {locale === 'zh' ? 'EN' : '中文'}
    </a>
  );
}
