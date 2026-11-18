import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { dirname, relative, resolve } from 'node:path'
import { lstat, readFile, readdir, realpath, rmdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { captureBundleEvidence } from '../../../build-support/bundle-evidence.mjs'
import { writePrebundledNoticeReceipt } from '../../../build-support/prebundled-notices.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const evidence = captureBundleEvidence(build, packageDir, 'pdf-identity-repair', {
  includeWorkspacePackages: ['@file-viewer/renderer-pdf']
})

const chunksDir = resolve(packageDir, 'dist/chunks')
const previousChunks = await lstat(chunksDir).catch(error => {
  if (error.code === 'ENOENT') return null
  throw error
})
if (previousChunks) {
  assert.equal(await realpath(resolve(packageDir, 'dist')), resolve(packageDir, 'dist'))
  assert.ok(previousChunks.isDirectory() && !previousChunks.isSymbolicLink(),
    'The parser chunk output must be a real owner directory')
  const receiptPath = resolve(packageDir, 'dist/prebundled-notices.json')
  const receiptIdentity = await lstat(receiptPath)
  assert.ok(receiptIdentity.isFile() && !receiptIdentity.isSymbolicLink(), 'Previous chunk receipt must be a regular owner file')
  const previousReceipt = JSON.parse(await readFile(receiptPath, 'utf8'))
  assert.equal(previousReceipt.schemaVersion, 1)
  assert.equal(previousReceipt.kind, 'prebundled-runtime-notice')
  assert.equal(previousReceipt.packageName, '@file-viewer/capability-pdf-identity-repair')
  const previousRuntime = new Map(Object.entries(previousReceipt.runtimeFiles)
    .filter(([path]) => path.startsWith('dist/chunks/') && path.endsWith('.js')))
  const owned = []
  for (const entry of await readdir(chunksDir, { withFileTypes: true })) {
    assert.ok(entry.isFile() && !entry.isSymbolicLink(), 'Unknown parser chunk output node')
    const path = `dist/chunks/${entry.name}`
    const fingerprint = previousRuntime.get(path)
    const legalSidecar = path.endsWith('.js.LEGAL.txt') && previousRuntime.has(path.slice(0, -'.LEGAL.txt'.length))
    assert.ok(fingerprint || legalSidecar, 'Unknown parser chunk output file')
    const destination = resolve(chunksDir, entry.name)
    const identity = await lstat(destination)
    assert.ok(identity.isFile() && !identity.isSymbolicLink(), 'Parser chunk output identity changed')
    if (fingerprint) {
      const bytes = await readFile(destination)
      assert.equal(bytes.length, fingerprint.bytes)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), fingerprint.sha256)
    }
    owned.push({ destination, identity, path })
  }
  assert.deepEqual(owned.filter(row => previousRuntime.has(row.path)).map(row => row.path).sort(),
    [...previousRuntime.keys()].sort(), 'Previous parser chunks are incomplete')
  for (const { destination, identity } of owned) {
    const current = await lstat(destination)
    assert.ok(current.isFile() && !current.isSymbolicLink() &&
      current.dev === identity.dev && current.ino === identity.ino, 'Parser chunk output ownership changed')
    await unlink(destination)
  }
  await rmdir(chunksDir)
}

// Keep registration small and load the self-contained parsers on first use.
const result = await evidence.build({
  entryPoints: [resolve(packageDir, 'src/index.ts')],
  outdir: resolve(packageDir, 'dist'),
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2019',
  minify: true,
  external: ['@file-viewer/core'],
  sourcemap: false,
  legalComments: 'external',
  plugins: [
    {
      name: 'shared-pdf-renderer-registration',
      setup(builder) {
        builder.onResolve({ filter: /^@file-viewer\/renderer-pdf$/ }, (args) => ({
          path: args.path,
          external: true
        }))
      }
    }
  ]
})
await evidence.finish()
const moduleOutputs = Object.fromEntries(Object.entries(result.metafile.outputs)
  .filter(([path]) => path.endsWith('.js'))
  .map(([path, output]) => [relative(packageDir, resolve(path)).split('\\').join('/'), output]))
const runtimePaths = Object.keys(moduleOutputs).sort()
await writeFile(resolve(packageDir, '.build/pdf-identity-repair-outputs.json'),
  JSON.stringify(moduleOutputs, null, 2) + '\n', { mode: 0o600 })
await writePrebundledNoticeReceipt({
  packageRoot: packageDir, runtimePaths,
  noticePath: 'dist/pdf-identity-repair.THIRD_PARTY_LICENSES.txt'
})
