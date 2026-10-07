/** Rebuild the normal pnpm patch from a hash-pinned installed baseline.
 * Build/review tooling only. Never run while a package manager is installing.
 * --baseline-only reconstructs the old comparison runtime offline from Git.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { transformGridMetrics } from './lib/docx-grid-metrics.mjs';
const root = path.resolve(import.meta.dirname, '..');
const baselineCommit = '2fc54c12293aa9a9ffae03d642553450be49f8df';
const runtimeVersion = '0.3.32+compat.20260924.grid';
const pinPath = path.join(root, 'patches/docx-engine-compatibility.json');
const baselinePath = path.join(root, 'test/docx-grid-metrics/baseline.json');
const patchRelative = 'patches/@file-viewer__docx@0.3.32.patch';
const patchPath = path.join(root, patchRelative);
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const pin = JSON.parse(await readFile(pinPath, 'utf8'));
const require = createRequire(path.join(root, 'packages/renderers/word/package.json'));
const dist = path.join(path.dirname(require.resolve('@file-viewer/docx/package.json')), 'dist');
const baseDir = path.resolve(process.env.DOCX_GRID_BASE_DIR || path.join(root, 'output/docx-grid-metrics/base'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const names = Object.keys(baseline.sha256);
const workspaceTemp = await mkdtemp(path.join(tmpdir(), 'docx-grid-'));
function git(args, cwd = workspaceTemp, expected = [0]) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.error || !expected.includes(r.status)) throw new Error(`git ${args[0]} failed: ${r.error || r.stderr}`);
  return r.stdout;
}
async function verify(directory, expected) {
  for (const [name, hash] of Object.entries(expected)) assert.equal(sha(await readFile(path.join(directory, name))), hash, name);
}
try {
  const patch = await readFile(patchPath);
  assert.equal(sha(patch), pin.patchSha256, 'current package patch checksum');
  await verify(dist, pin.sha256);
  if (process.argv.includes('--baseline-only')) {
    const recovered = path.join(workspaceTemp, 'recovered');
    await mkdir(path.join(recovered, 'dist'), { recursive: true });
    for (const name of names) await copyFile(path.join(dist, name), path.join(recovered, 'dist', name));
    git(['apply', '--reverse', '--unsafe-paths', patchPath], recovered);
    const previousPatch = git(['show', `${baselineCommit}:${patchRelative}`], root);
    assert.equal(sha(previousPatch), baseline.patchSha256, 'comparison Git object checksum');
    const previousPath = path.join(workspaceTemp, 'previous.patch');
    await writeFile(previousPath, previousPatch);
    git(['apply', '--unsafe-paths', previousPath], recovered);
    await verify(path.join(recovered, 'dist'), baseline.sha256);
    await mkdir(baseDir, { recursive: true });
    for (const name of names) await copyFile(path.join(recovered, 'dist', name), path.join(baseDir, name));
    console.log('Hash-pinned comparison runtime reconstructed:', baseDir);
  } else {
    assert.equal(pin.patchSha256, baseline.patchSha256, 'this update must start from the specified baseline');
    await verify(dist, baseline.sha256);
    await mkdir(baseDir, { recursive: true });
    const original = path.join(workspaceTemp, 'original');
    const modified = path.join(workspaceTemp, 'modified');
    for (const dir of [original, modified]) await mkdir(path.join(dir, 'dist'), { recursive: true });
    for (const name of names) {
      await copyFile(path.join(dist, name), path.join(baseDir, name));
      await copyFile(path.join(dist, name), path.join(original, 'dist', name));
      const result = transformGridMetrics(await readFile(path.join(dist, name), 'utf8'), name);
      await writeFile(path.join(modified, 'dist', name), result);
    }
    git(['apply', '--reverse', '--unsafe-paths', patchPath], original);
    let combined = git(['diff', '--no-index', '--no-color', '--no-ext-diff', '--unified=3', 'original', 'modified'], workspaceTemp, [1]);
    combined = combined.replaceAll('a/original/dist/', 'a/dist/').replaceAll('b/modified/dist/', 'b/dist/');
    const candidate = path.join(workspaceTemp, 'candidate.patch');
    await writeFile(candidate, combined);
    git(['apply', '--check', '--unsafe-paths', candidate], original);
    git(['apply', '--unsafe-paths', candidate], original);
    const hashes = {};
    for (const name of names) {
      const result = await readFile(path.join(modified, 'dist', name));
      assert.deepEqual(await readFile(path.join(original, 'dist', name)), result, name);
      hashes[name] = sha(result);
    }
    const patchSha256 = sha(combined);
    const lockPath = path.join(root, 'pnpm-lock.yaml');
    const lock = await readFile(lockPath, 'utf8');
    assert.ok(lock.includes(baseline.patchSha256), 'declared pnpm patch identity');
    const assetsPath = path.join(root, 'packages/core/src/platform/assets.ts');
    const assets = await readFile(assetsPath, 'utf8');
    assert.equal(assets.split(JSON.stringify(baseline.runtimeVersion)).length, 2, 'prior Worker cache identity');
    const resultPin = { ...pin, patchSha256, sha256: hashes, runtimeVersion, gridMetrics: {
      baselineCommit, baselinePinSha256: sha(await readFile(baselinePath)),
      transform: 'scripts/lib/docx-grid-metrics.mjs',
      transformSha256: sha(await readFile(path.join(root, 'scripts/lib/docx-grid-metrics.mjs'))),
      method: 'hash-pinned build-time transformation; no upstream source-build claim'
    }};
    await writeFile(patchPath, combined);
    await writeFile(pinPath, JSON.stringify(resultPin, null, 2) + '\n');
    await writeFile(lockPath, lock.replaceAll(baseline.patchSha256, patchSha256));
    await writeFile(assetsPath, assets.replace(JSON.stringify(baseline.runtimeVersion), JSON.stringify(runtimeVersion)));
    for (const name of names) await copyFile(path.join(modified, 'dist', name), path.join(dist, name));
    await mkdir(path.join(root, 'apps/viewer-demo/public/vendor/docx'), { recursive: true });
    await copyFile(path.join(dist, 'docx-preview.worker.js'), path.join(root, 'apps/viewer-demo/public/vendor/docx/docx.worker.js'));
    console.log('Rebuilt and re-applied five-entry pnpm patch:', patchSha256);
  }
} finally {
  await rm(workspaceTemp, { recursive: true, force: true });
}
