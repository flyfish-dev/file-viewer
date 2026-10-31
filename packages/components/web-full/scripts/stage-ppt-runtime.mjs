import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  PPT_RUNTIME_REQUIRED_FILES,
  PPT_RUNTIME_VERSION,
  verifyPptRuntimeDirectory
} from './ppt-runtime-integrity.mjs'

const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

// Demo bootstrap files and prior build outputs are copies, not runtime owners.
// Resolve the official build dependency before touching the destination so an
// incomplete install or changed package cannot leave a misleading asset tree.
export async function stageInstalledPptRuntime(targetDirectory) {
  const owner = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  if (owner.devDependencies?.['@file-viewer/ppt'] !== PPT_RUNTIME_VERSION) {
    throw new Error('[ppt-runtime-stage] The official PPT build dependency must match the integrity verifier')
  }
  const require = createRequire(packageJsonPath)
  return stagePptRuntimeFrom(dirname(require.resolve('@file-viewer/ppt/package.json')), targetDirectory)
}

// Copy and re-verify an official runtime directory. Exported separately so tests
// can exercise the same checks against a fixture package directory.
export async function stagePptRuntimeFrom(sourceDirectory, targetDirectory) {
  const source = resolve(sourceDirectory)
  const target = resolve(targetDirectory)
  const sourceWithinTarget = relative(target, source)
  if (sourceWithinTarget === '' || (sourceWithinTarget !== '..' && !sourceWithinTarget.startsWith(`..${sep}`) && !isAbsolute(sourceWithinTarget))) {
    throw new Error('[ppt-runtime-stage] Refusing to replace the installed runtime or its parent')
  }
  await verifyPptRuntimeDirectory(source)
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })
  const files = []
  for (const filename of PPT_RUNTIME_REQUIRED_FILES) {
    await mkdir(dirname(join(target, filename)), { recursive: true })
    await copyFile(join(source, filename), join(target, filename))
    const [original, copied] = await Promise.all([
      readFile(join(source, filename)),
      readFile(join(target, filename))
    ])
    if (!original.equals(copied)) {
      throw new Error(`[ppt-runtime-stage] Copied bytes differ from the official package: ${filename}`)
    }
    files.push({ filename, bytes: copied.length, sha256: sha256(copied) })
  }
  const verification = await verifyPptRuntimeDirectory(target)
  return { sourcePackage: '@file-viewer/ppt', sourceVersion: PPT_RUNTIME_VERSION, files, ...verification }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node stage-ppt-runtime.mjs <runtime-directory>')
  }
  const receipt = await stageInstalledPptRuntime(process.argv[2])
  console.log(JSON.stringify(receipt, null, 2))
}
