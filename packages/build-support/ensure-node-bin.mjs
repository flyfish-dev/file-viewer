import { access, chmod } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
if (!process.argv.slice(2).length) throw new Error('Usage: ensure-node-bin.mjs <repository-relative-path> [...]')
for (const input of process.argv.slice(2)) {
  const target = resolve(sourceRoot, input)
  const relation = relative(sourceRoot, target)
  if (!relation || relation.startsWith('..')) throw new Error(`Bin path escapes source root: ${input}`)
  await access(target)
  if (process.platform !== 'win32') await chmod(target, 0o755)
  console.log(`[node-bin] verified ${relation}`)
}
