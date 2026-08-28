export const site = {
  name: 'File Viewer Documentation',
  shortName: 'File Viewer',
  origin: 'https://doc.file-viewer.app',
  productUrl: 'https://file-viewer.app',
  demoUrl: 'https://demo.file-viewer.app',
  githubUrl: 'https://github.com/flyfish-dev/file-viewer',
  description:
    'Integrate File Viewer in browser applications with offline-first packages, on-demand renderers, self-hosting, and 244 registered file extensions.',
  descriptionZh:
    '在浏览器应用中集成 File Viewer，覆盖离线优先组件、按需渲染器、私有部署与 244 个已注册文件扩展名。',
} as const;

export function localePath(locale: 'en' | 'zh', path = '') {
  const normalized = path === '/' ? '' : path.replace(/^\//, '');
  if (locale === 'zh') return `/zh${normalized ? `/${normalized}` : ''}`;
  return normalized ? `/${normalized}` : '/';
}
