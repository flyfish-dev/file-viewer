import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { retainedBundleLicense } from './bundle-notices.mjs';

const workspace = resolve(import.meta.dirname, '../..');
const reviewed = [
  { name: 'ag-psd', version: '34.2.1', license: 'MIT', file: 'ag-psd-MIT.txt', sha256: '3907e1664a7d749644e33d1936ccad8c3d23df35277fca9ecec61146b46dc8fd' },
  { name: 'fzstd', version: '0.1.1', license: 'MIT', file: 'fzstd-MIT.txt', sha256: '62249119bb7df6e54300f37a37145c26a6d4420410aac8881a119c5b427cf751' },
  { name: 'saxes', version: '6.0.0', license: 'ISC', file: 'saxes-ISC.txt', sha256: '0fac2374380621b22e6b50451057721a9c52935b02d16d106a9f04897f061d0e' },
];

/** Retain actual upstream texts, including inherited attribution; never synthesize copyright. */
export async function stageDesignLicenseTexts({ packageRoot = join(workspace, 'packages/renderers/design') } = {}) {
  const require = createRequire(join(packageRoot, 'package.json'));
  const writes = [];
  for (const entry of reviewed) {
    let directory = dirname(require.resolve(entry.name));
    let metadata;
    for (;;) {
      metadata = await readFile(join(directory, 'package.json')).then(bytes => JSON.parse(bytes)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      });
      if (metadata?.name === entry.name) break;
      assert.notEqual(directory, dirname(directory), `Design dependency owner not found: ${entry.name}`);
      directory = dirname(directory);
    }
    assert.equal(metadata.version, entry.version, `Unreviewed design dependency version: ${entry.name}`);
    assert.equal(metadata.license, entry.license, `Design dependency grant changed: ${entry.name}`);
    const retained = await retainedBundleLicense(metadata);
    const bytes = retained?.bytes || await readFile(join(directory, 'LICENSE'));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `Original design license drift: ${entry.name}`);
    writes.push({ target: join(packageRoot, 'LICENSES', entry.file), bytes, ...entry });
  }
  // ag-psd's original MIT text also attributes its PDF.js CMYK conversion to
  // Apache-2.0. Reuse the complete original Apache text already retained here.
  const inheritedApache = await readFile(join(packageRoot, 'LICENSES', 'Stet-Apache-2.0.txt'));
  assert.equal(createHash('sha256').update(inheritedApache).digest('hex'),
    '281755c6f4d045a464a29eb720c3e7586175c621352675dce144ca74bd1228cb',
    'Original inherited ag-psd Apache license drift');
  for (const { target, bytes } of writes) await writeFile(target, bytes);
  return writes.map(({ target, name, version, sha256 }) => ({ target, name, version, sha256 }));
}
