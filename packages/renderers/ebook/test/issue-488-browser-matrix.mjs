import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const runner = fileURLToPath(new URL('./issue-488-offline-browser.mjs', import.meta.url));
const output = resolve(process.env.EPUB_488_MATRIX_OUTPUT || join(root, 'output/issue-488'));

for (const engine of ['chromium', 'firefox', 'webkit']) {
  const result = spawnSync(process.execPath, [runner], {
    cwd: root,
    env: { ...process.env, EPUB_488_BROWSER: engine, EPUB_488_OUTPUT: join(output, engine) },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `${engine} external-resource verification was interrupted`);
  assert.equal(result.status, 0, `${engine} external-resource verification failed`);
}
