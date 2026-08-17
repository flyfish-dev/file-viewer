import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Provider } from '@/components/provider';
import { FileViewerDocsLayout } from '@/components/docs-layout';
import { site } from '@/lib/shared';
import '../global.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: {
    default: 'File Viewer Documentation',
    template: '%s | File Viewer Documentation',
  },
  description: site.description,
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1020' },
  ],
};

export default function EnglishRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <body>
        <Provider locale="en">
          <FileViewerDocsLayout locale="en">{children}</FileViewerDocsLayout>
        </Provider>
      </body>
    </html>
  );
}
