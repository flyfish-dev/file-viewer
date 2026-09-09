// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'

const require = createRequire(import.meta.url)
const browserContext: Record<string, unknown> = {
  setTimeout,
  clearTimeout,
  setImmediate,
  clearImmediate
}
runInNewContext(readFileSync(require.resolve('jszip/dist/jszip.js'), 'utf8'), browserContext)
const browserZip = browserContext.JSZip as typeof JSZip

describe.each([
  ['Node', JSZip],
  ['browser bundle', browserZip]
] as const)('ZIP cross-realm input: %s', (_label, Zip) => {
  it.each(['typed array', 'array buffer'])('round-trips a foreign %s', async (kind) => {
    const input = runInNewContext(
      kind === 'typed array'
        ? 'new Uint8Array([65, 66, 67])'
        : 'new Uint8Array([65, 66, 67]).buffer'
    )
    expect(input instanceof Uint8Array).toBe(false)
    expect(input instanceof ArrayBuffer).toBe(false)
    const zip = new Zip().file('content.txt', input)
    const archive = await zip.generateAsync({ type: 'uint8array' })
    const foreignArchive = runInNewContext('Uint8Array.from(bytes)', { bytes: [...archive] })
    const reopened = await Zip.loadAsync(foreignArchive)
    expect(await reopened.file('content.txt')!.async('string')).toBe('ABC')
  })
})
