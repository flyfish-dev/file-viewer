import { browserCoreAliases } from '../packages/build-support/browser-runtime-options.mjs'
import { fileURLToPath } from 'node:url';

const local = (path) => fileURLToPath(new URL(path, import.meta.url));
export default {
  root: local('../'),
  base: '/preview/',
  optimizeDeps: { entries: ['test/fixtures/spreadsheet-comments/index.html'] },
  server: { host: '127.0.0.1', port: 43143, strictPort: true },
  resolve: {
    dedupe: ['@file-viewer/core'],
    alias: [
      ...browserCoreAliases(local('../')),
    ],
  },
};
