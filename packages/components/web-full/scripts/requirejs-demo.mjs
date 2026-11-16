import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

// The maintained Vite HTML entry and its local source input are also the
// standalone regression page. Keep their original bytes, including i18n.
export const requireJsDemoInputs = [
  'requirejs.html',
  'src/locale.ts',
  'licenses/requirejs-2.3.7.txt'
]

const fingerprint = (path, bytes) => ({
  path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')
})
const sourceInputs = async sourceDir => Promise.all(requireJsDemoInputs.map(async path =>
  fingerprint(path, await readFile(resolve(sourceDir, path)))))

export async function copyRequireJsDemoInputs(sourceDir, targetDir) {
  const inputs = await Promise.all(requireJsDemoInputs.map(async path =>
    ({ path, bytes: await readFile(resolve(sourceDir, path)) })))
  for (const { path, bytes } of inputs) {
    const target = resolve(targetDir, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes)
  }
  const proof = { schemaVersion: 1, owner: 'apps/component-demo',
    inputs: inputs.map(({ path, bytes }) => fingerprint(path, bytes)) }
  await writeFile(resolve(targetDir, 'SOURCE.json'), JSON.stringify(proof, null, 2) + '\n')
  return proof
}

export async function buildRequireJsDemo(sourceDir, outputDir) {
  sourceDir = resolve(sourceDir)
  outputDir = resolve(outputDir)
  if (sourceDir === outputDir || sourceDir.startsWith(outputDir + sep) || outputDir.startsWith(sourceDir + sep))
    throw new Error('RequireJS fixture output must be separate from its source inputs')
  // Read every declared input before creating output. Missing canonical files
  // must never fall back to the retired public/ HTML or a previously built page.
  const inputs = await sourceInputs(sourceDir)
  await mkdir(outputDir, { recursive: true })
  if ((await readdir(outputDir)).length) throw new Error('RequireJS fixture output directory is not empty')
  const { build, version } = await import('vite')
  const moduleIds = new Set()
  const result = await build({
    root: sourceDir,
    configFile: false,
    envDir: false,
    base: './',
    publicDir: false,
    logLevel: 'warn',
    plugins: [{
      name: 'requirejs-demo-input-proof',
      generateBundle() {
        for (const id of this.getModuleIds()) if (isAbsolute(id) && !id.includes('?')) moduleIds.add(id)
      }
    }],
    build: {
      outDir: outputDir,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: false,
      rollupOptions: { input: resolve(sourceDir, 'requirejs.html') }
    }
  })
  assert.deepEqual(await sourceInputs(sourceDir), inputs, 'RequireJS source inputs changed while compiling')
  const modules = await Promise.all([...moduleIds].sort().map(async path =>
    fingerprint(relative(sourceDir, path).replaceAll('\\', '/'), await readFile(path))))
  const outputs = await Promise.all(result.output.map(async entry =>
    fingerprint(entry.fileName, await readFile(resolve(outputDir, entry.fileName)))))
  const proof = { schemaVersion: 1, owner: 'apps/component-demo',
    toolchain: { node: process.versions.node, vite: version }, inputs, modules, outputs }
  await writeFile(resolve(outputDir, 'BUILD.json'), JSON.stringify(proof, null, 2) + '\n')
  return proof
}
