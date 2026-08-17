import type { Metadata } from 'next';
import { Brand } from '@/components/brand';
import './global.css';

export const metadata: Metadata = {
  title: 'Page not found | File Viewer Documentation',
  description: 'The requested File Viewer documentation page does not exist.',
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

export default function GlobalNotFound() {
  return (
    <html lang="en-US">
      <body>
        <main className="fv-not-found">
          <Brand locale="en" />
          <span>404</span>
          <h1>That document moved.</h1>
          <p>The page you requested does not exist. Return to the documentation index or start with the quickstart.</p>
          <nav aria-label="404 recovery links">
            <a href="/">Documentation home</a>
            <a href="/guide/quickstart">Open quickstart</a>
          </nav>
          <p lang="zh-CN">没有找到这个文档页面。你也可以返回<a href="/zh">中文文档首页</a>。</p>
        </main>
      </body>
    </html>
  );
}
