import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptDir, '..')
const source = join(packageRoot, 'src/vendor/mp4v')
const target = join(packageRoot, 'dist/vendor/mp4v')

await rm(target, { recursive: true, force: true })
await mkdir(dirname(target), { recursive: true })
await cp(source, target, { recursive: true })
console.log(`[renderer-media] Copied Apache-2.0 MP4V decoder assets to ${target}`)
