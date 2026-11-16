import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { browserCoreAliases } from '../../../build-support/browser-runtime-options.mjs';

export default defineConfig({
  root: fileURLToPath(new URL('../../../../', import.meta.url)),
  resolve: { alias: browserCoreAliases(fileURLToPath(new URL('../../../../', import.meta.url))) },
  test: { environment: 'jsdom', include: ['test/issue-488-epub-resource-policy.spec.ts', 'test/issue-488-epub-renderer-lifecycle.spec.ts', 'test/epubjs.spec.ts', 'test/issue-300-epub-viewport-media.spec.ts'] },
});
