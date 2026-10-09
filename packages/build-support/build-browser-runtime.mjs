import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveBundleLicense, writeBundleNotices } from './bundle-notices.mjs'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')

/** Build the reviewed SDK bytes into an ordinary browser package, including lazy chunks and workers. */
export async function buildBrowserRuntime({ packageDir, entries, requiredVersions, readmeLicensePackages = [], wasmHashes = [] }) {
  packageDir = resolve(packageDir)
  const root = resolve(import.meta.dirname, '../..')
  const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
  const require = createRequire(join(packageDir, 'package.json'))
  const { build } = await import(pathToFileURL(require.resolve('vite')).href)
  const temporary = join(root, '.release/runtime-build', manifest.name.replaceAll('/', '__'))
  const inputs = new Set()
  const inventory = () => ({
    name: 'file-viewer-runtime-inventory',
    generateBundle(_, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const id of Object.keys(output.modules)) {
          if (!id.startsWith('\0') && isAbsolute(id) && !id.includes('?')) inputs.add(id)
        }
      }
    }
  })
  await rm(temporary, { recursive: true, force: true })
  await build({
    root: packageDir, configFile: false, base: './', publicDir: false,
    logLevel: 'warn', plugins: [inventory()],
    worker: {
      format: 'es', plugins: () => [inventory()],
      // A consuming bundler may emit an already-built Worker URL as one opaque
      // asset. Keep its decoder imports inside that Worker so no sibling chunk
      // silently disappears during the application's second build.
      rolldownOptions: { output: { inlineDynamicImports: true } }
    },
    build: {
      outDir: temporary, emptyOutDir: true, target: 'es2020', minify: 'esbuild', sourcemap: false,
      lib: {
        entry: Object.fromEntries(entries.map(name => [name, join(packageDir, 'src', `${name}.ts`)])),
        formats: ['es'], fileName: (_, name) => `${name}.js`
      },
      rolldownOptions: { external: id => /^@file-viewer\//.test(id) }
    }
  })
  const packages = new Map()
  const sourceFiles = {}
  for (const id of [...inputs].sort()) {
    assert.ok((await stat(id)).isFile(), `Runtime input must be a regular file: ${id}`)
    sourceFiles[relative(root, id).replaceAll('\\', '/')] = hash(await readFile(id))
    if (!id.includes('/node_modules/')) continue
    let directory = dirname(id)
    while (dirname(directory) !== directory) {
      try {
        const metadataBytes = await readFile(join(directory, 'package.json'))
        const metadata = JSON.parse(metadataBytes)
        if (metadata.name && metadata.version) {
          const licenseFiles = (await readdir(directory)).filter(name => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name)).sort()
          if (readmeLicensePackages.includes(metadata.name)) licenseFiles.push('README.md')
          packages.set(`${metadata.name}@${metadata.version}`, {
            name: metadata.name, version: metadata.version,
            license: await resolveBundleLicense(directory, metadata),
            repository: metadata.repository?.url || metadata.repository || null,
            packageJsonSha256: hash(metadataBytes),
            licenseFiles: Object.fromEntries(await Promise.all(licenseFiles.map(async name => [name, hash(await readFile(join(directory, name)))])))
          })
          break
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      directory = dirname(directory)
    }
  }
  for (const [name, version] of Object.entries(requiredVersions)) {
    const actual = [...packages.values()].filter(entry => entry.name === name)
    assert.ok(actual.length > 0, `Required reviewed runtime input is missing: ${name}`)
    assert.ok(actual.every(entry => entry.version === version), `Unreviewed bundled ${name} version`)
  }
  await writeBundleNotices({ inputs: Object.fromEntries([...inputs].map(id => [id, {}])) }, join(temporary, 'THIRD_PARTY_LICENSES.txt'), { readmeLicensePackages })
  const files = {}
  const embeddedWasm = new Set()
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) { await inspect(path); continue }
      assert.ok(entry.isFile(), 'Runtime outputs must not contain symbolic links')
      const bytes = await readFile(path)
      files[relative(temporary, path).replaceAll('\\', '/')] = { bytes: bytes.length, sha256: hash(bytes) }
      if (path.endsWith('.js')) {
        const text = bytes.toString('utf8')
        assert.doesNotMatch(text, /(?:from\s*|import\s*\()['"](?:@cornerstonejs\/|@kitware\/|mermaid(?:\/|['"]))/)
        for (const match of text.matchAll(/data:application\/wasm;base64,([A-Za-z0-9+/=]+)/g)) embeddedWasm.add(hash(Buffer.from(match[1], 'base64')))
      }
    }
  }
  await inspect(temporary)
  for (const expected of wasmHashes) assert.ok(embeddedWasm.has(expected), `Reviewed codec WASM is missing from the built runtime: ${expected}`)
  const receipt = {
    schemaVersion: 1, packageName: manifest.name, packageVersion: manifest.version,
    build: { vite: require('vite/package.json').version, format: 'esm', target: 'es2020', assetBase: './' },
    sourceLockSha256: hash(await readFile(join(root, 'pnpm-lock.yaml'))),
    packages: [...packages.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version)),
    sourceFiles, files, reviewedWasmHashes: wasmHashes
  }
  await writeFile(join(temporary, 'bundled-runtime.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  // TypeScript owns declarations; this normal build replaces only JavaScript and generated runtime assets.
  const destination = join(packageDir, 'dist')
  await mkdir(destination, { recursive: true })
  const removePreviousRuntime = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        await removePreviousRuntime(path)
        if ((await readdir(path)).length === 0) await rm(path, { recursive: true })
      } else if (!entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.ts.map') && !entry.name.endsWith('.tsbuildinfo')) {
        await rm(path)
      }
    }
  }
  // Old hashed chunks must not survive a rebuild and reintroduce previous SDK bytes.
  await removePreviousRuntime(destination)
  await cp(temporary, destination, { recursive: true })
  await rm(temporary, { recursive: true, force: true })
  console.log(`[bundled-runtime] ${manifest.name}: ${packages.size} reviewed dependency inputs, ${Object.keys(files).length} outputs, ${wasmHashes.length} verified codecs`)
}
