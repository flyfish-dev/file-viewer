import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

export async function assertFullAssetDependencies(manifest, packageJsonPath) {
  const require = createRequire(packageJsonPath)
  for (const name of ['@file-viewer/assets-cad', '@file-viewer/assets-drawing']) {
    const spec = manifest.dependencies?.[name]
    if (typeof spec !== 'string' || (spec.replace(/^workspace:/, '') !== manifest.version && !spec.startsWith('file:'))) {
      throw new Error(`[web-full-iife] ${name} must match the full package version`)
    }
    const installed = JSON.parse(await readFile(require.resolve(`${name}/package.json`), 'utf8'))
    if (installed.name !== name || installed.version !== manifest.version) {
      throw new Error(`[web-full-iife] ${name}@${installed.version} must match the full package version ${manifest.version}`)
    }
  }
}
