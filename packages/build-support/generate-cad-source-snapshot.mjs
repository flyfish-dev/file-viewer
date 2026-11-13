import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { generateCadSourceSnapshot, planCadSourceSnapshot } from './cad-source-producer.mjs'

const usage = `Usage:
  node packages/build-support/generate-cad-source-snapshot.mjs --version <x.y.z> [--source-root <clean-worktree>] [--write]

The default is read-only planning: no files, installs or builds. Write mode
requires clean committed source whose root/core/CAD versions all match the new
version, and the recipe's actual Node 24.20.0/npm 11.19.0 toolchain. It never
changes PATH, HOME or the reported toolchain. Run this CLI with that Node runtime.

Write mode performs two fresh standalone npm ci --ignore-scripts installations
and real builds (source, then extracted-archive replay). It installs no browser.
Only after both succeed does it write the new version's snapshot and local ZIP/
receipt. Existing different bytes or modes are rejected, never overwritten.
It does not update the normal CAD ZIP/source offer, freeze versions, publish,
stage or commit. Local reproduction does not establish actual Full equivalence,
immutable public source availability, or release qualification. See CAD-SOURCE-PRODUCER.md.`

const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--help') {
  process.stdout.write(usage + '\n')
} else {
  const options = { sourceRoot: resolve(import.meta.dirname, '../..') }
  const seen = new Set()
  let write = false
  for (let index = 0; index < args.length; index++) {
    const name = args[index]
    assert.ok(!seen.has(name), 'Duplicate CAD producer argument: ' + name)
    seen.add(name)
    if (name === '--write') write = true
    else {
      assert.ok(['--version', '--source-root'].includes(name), 'Unknown CAD producer argument: ' + name)
      const value = args[++index]
      assert.ok(value && !value.startsWith('--'), 'Missing CAD producer argument value: ' + name)
      options[name === '--version' ? 'version' : 'sourceRoot'] = value
    }
  }
  assert.ok(options.version, usage)
  const result = write ? await generateCadSourceSnapshot(options) : (await planCadSourceSnapshot(options)).plan
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
}
