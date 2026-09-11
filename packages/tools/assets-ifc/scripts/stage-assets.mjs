import { createRequire } from 'node:module'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const webIfcDir = dirname(require.resolve('web-ifc'))
const fragmentsEntry = require.resolve('@thatopen/fragments')
const fragmentsPackageDir = resolve(dirname(fragmentsEntry), '..')
const targetDir = resolve(packageDir, 'viewer/wasm/model')
const manifestPath = resolve(packageDir, 'viewer/file-viewer-asset-pack.json')

async function findWorker(root) {
  const preferred = []
  const fallback = []
  const visit = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        await visit(path)
        continue
      }
      const name = entry.name.toLowerCase()
      if (name !== 'worker.mjs' && name !== 'worker.js') continue
      if (path.toLowerCase().includes('/worker/')) preferred.push(path)
      else fallback.push(path)
    }
  }
  await visit(root)
  const candidates = [...preferred, ...fallback]
  if (!candidates.length) {
    throw new Error(`Unable to locate the @thatopen/fragments worker below ${root}`)
  }
  return candidates[0]
}

const fragmentsWorker = await findWorker(fragmentsPackageDir)
const fragmentsWorkerPackagePath = relative(fragmentsPackageDir, fragmentsWorker).replaceAll('\\', '/')

const assets = [
  {
    id: 'model-web-ifc-wasm',
    sourcePath: resolve(webIfcDir, 'web-ifc.wasm'),
    filename: 'web-ifc.wasm',
    kind: 'wasm',
    optionPath: 'ifc.wasmUrl',
    packagePath: 'web-ifc/web-ifc.wasm',
    description: 'Pinned web-ifc 0.0.77 single-thread WebAssembly parser and geometry engine.',
  },
  {
    id: 'model-web-ifc-mt-wasm',
    sourcePath: resolve(webIfcDir, 'web-ifc-mt.wasm'),
    filename: 'web-ifc-mt.wasm',
    kind: 'wasm',
    optionPath: 'ifc.wasmMtUrl',
    packagePath: 'web-ifc/web-ifc-mt.wasm',
    description: 'Pinned web-ifc 0.0.77 multi-thread WebAssembly parser and geometry engine.',
  },
  {
    id: 'model-web-ifc-license',
    sourcePath: resolve(webIfcDir, 'LICENSE.md'),
    filename: 'LICENSE.web-ifc-MPL-2.0.md',
    kind: 'license',
    packagePath: 'web-ifc/LICENSE.md',
    description: 'Mozilla Public License 2.0 text distributed with web-ifc 0.0.77.',
  },
  {
    id: 'model-thatopen-fragments-worker',
    sourcePath: fragmentsWorker,
    filename: 'fragments-worker.mjs',
    kind: 'worker',
    optionPath: 'ifc.thatOpen.workerUrl',
    packagePath: `@thatopen/fragments/${fragmentsWorkerPackagePath}`,
    description: 'Pinned @thatopen/fragments 3.4.7 module worker for IFC culling, LOD and model operations.',
  },
]

await rm(resolve(packageDir, 'viewer'), { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })
for (const asset of assets) {
  await cp(asset.sourcePath, resolve(targetDir, asset.filename), { force: true })
}

const fragmentsLicense = `MIT License\n\nCopyright (c) That Open Company\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`
await writeFile(resolve(targetDir, 'LICENSE.thatopen-fragments-MIT.txt'), fragmentsLicense, 'utf8')
assets.push({
  id: 'model-thatopen-fragments-license',
  sourcePath: resolve(targetDir, 'LICENSE.thatopen-fragments-MIT.txt'),
  filename: 'LICENSE.thatopen-fragments-MIT.txt',
  kind: 'license',
  packagePath: '@thatopen/fragments (MIT license notice)',
  description: 'MIT license notice for @thatopen/fragments 3.4.7 and its redistributed worker.',
})

const rendererAssets = assets.map(asset => ({
  id: asset.id,
  rendererId: 'model',
  kind: asset.kind,
  target: 'public',
  required: true,
  defaultPath: `wasm/model/${asset.filename}`,
  packagePath: asset.packagePath,
  ...(asset.optionPath ? { optionPath: asset.optionPath } : {}),
  description: asset.description,
}))

const manifest = {
  schemaVersion: 1,
  packageName: '@file-viewer/assets-ifc',
  packageVersion: '3.0.3',
  copyGroups: ['model'],
  receiptFilename: 'file-viewer-assets-ifc.receipt.json',
  rendererAssetManifests: [{ rendererId: 'model', assets: rendererAssets }],
}
await mkdir(dirname(manifestPath), { recursive: true })
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

const webIfcLicense = await readFile(resolve(targetDir, 'LICENSE.web-ifc-MPL-2.0.md'), 'utf8')
if (!webIfcLicense.includes('Mozilla Public License')) throw new Error('web-ifc MPL-2.0 license text was not staged')
const worker = await readFile(resolve(targetDir, 'fragments-worker.mjs'), 'utf8')
if (!worker.includes('postMessage') && !worker.includes('onmessage')) {
  throw new Error(`Unexpected That Open worker candidate: ${basename(fragmentsWorker)}`)
}
console.log(`[assets-ifc] staged web-ifc 0.0.77 plus @thatopen/fragments 3.4.7 worker (${assets.length} runtime/license files)`)
