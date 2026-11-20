import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { stageDesignLicenseTexts } from './stage-design-license-texts.mjs';

test('normal design staging retains complete original bytes and inherited sax attribution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'design-original-grants-'));
  try {
    await mkdir(join(root, 'LICENSES')); await mkdir(join(root, 'node_modules'));
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(join(root, 'LICENSES/Stet-Apache-2.0.txt'), await readFile(new URL('../renderers/design/LICENSES/Stet-Apache-2.0.txt', import.meta.url)));
    const require = createRequire(new URL('../renderers/design/package.json', import.meta.url));
    for (const name of ['ag-psd', 'fzstd', 'saxes']) {
      let directory = dirname(require.resolve(name));
      for (;;) {
        const meta = await readFile(join(directory, 'package.json')).then(bytes => JSON.parse(bytes)).catch(() => null);
        if (meta?.name === name) break;
        directory = dirname(directory);
      }
      await symlink(directory, join(root, 'node_modules', name));
    }
    const receipt = await stageDesignLicenseTexts({ packageRoot: root });
    for (const item of receipt) assert.deepEqual(await readFile(item.target), await readFile(new URL(`../renderers/design/LICENSES/${item.target.split('/').at(-1)}`, import.meta.url)));
    const saxes = await readFile(join(root, 'LICENSES/saxes-ISC.txt'), 'utf8');
    // The upstream itself uses "Contributors"; retain it verbatim rather than
    // inventing a more specific holder from package authorship metadata.
    assert.match(saxes, /Copyright \(c\) Contributors/);
    assert.match(saxes, /Isaac|Schlueter/);
    const agPsd = await readFile(join(root, 'LICENSES/ag-psd-MIT.txt'), 'utf8');
    assert.match(agPsd, /CMYK to RGB conversion coefficients[\s\S]*pdf\.js[\s\S]*Copyright 2012 Mozilla Foundation/);
    assert.match(agPsd, /Apache License, Version 2\.0/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('an unreviewed dependency cannot overwrite existing original materials', async () => {
  const root = await mkdtemp(join(tmpdir(), 'design-drift-grants-'));
  try {
    await mkdir(join(root, 'LICENSES')); await mkdir(join(root, 'node_modules/ag-psd'), { recursive: true });
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(join(root, 'node_modules/ag-psd/package.json'), JSON.stringify({ name: 'ag-psd', version: '99.0.0', license: 'MIT', main: 'index.js' }));
    await writeFile(join(root, 'node_modules/ag-psd/index.js'), '');
    await writeFile(join(root, 'LICENSES/ag-psd-MIT.txt'), 'retained before failed validation');
    await assert.rejects(() => stageDesignLicenseTexts({ packageRoot: root }), /Unreviewed design dependency version/);
    assert.equal(await readFile(join(root, 'LICENSES/ag-psd-MIT.txt'), 'utf8'), 'retained before failed validation');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('inherited Apache material must be present and exact before any grant is overwritten', async () => {
  for (const inherited of [null, 'changed Apache license']) {
    const root = await mkdtemp(join(tmpdir(), 'design-inherited-grant-'));
    try {
      await mkdir(join(root, 'LICENSES')); await mkdir(join(root, 'node_modules'));
      await writeFile(join(root, 'package.json'), '{}');
      const require = createRequire(new URL('../renderers/design/package.json', import.meta.url));
      for (const name of ['ag-psd', 'fzstd', 'saxes']) {
        let directory = dirname(require.resolve(name));
        for (;;) {
          const meta = await readFile(join(directory, 'package.json')).then(bytes => JSON.parse(bytes)).catch(() => null);
          if (meta?.name === name) break;
          directory = dirname(directory);
        }
        await symlink(directory, join(root, 'node_modules', name));
      }
      await writeFile(join(root, 'LICENSES/ag-psd-MIT.txt'), 'retained before failed validation');
      if (inherited !== null) await writeFile(join(root, 'LICENSES/Stet-Apache-2.0.txt'), inherited);
      await assert.rejects(() => stageDesignLicenseTexts({ packageRoot: root }),
        inherited === null ? /ENOENT/ : /Original inherited ag-psd Apache license drift/);
      assert.equal(await readFile(join(root, 'LICENSES/ag-psd-MIT.txt'), 'utf8'), 'retained before failed validation');
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
