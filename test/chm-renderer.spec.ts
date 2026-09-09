import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { CHM_HARD_LIMITS, resolveChmOptions } from '../packages/renderers/chm/src/model'
import {
  assertChmMarkupBudget,
  decodeChmText,
  extractChmSearchText,
  MAX_CHM_CSS_TEXT_LENGTH,
  MAX_CHM_HTML_MARKUP_TOKENS,
  MAX_CHM_HTML_TEXT_LENGTH,
  normalizeChmPath,
  resolveChmReference,
  sanitizeChmCss,
} from '../packages/renderers/chm/src/security'
import { ChmWorkerClient } from '../packages/renderers/chm/src/workerClient'

const sourceRoot = resolve(import.meta.dirname, '..')
const fixturePath = resolve(sourceRoot, 'apps/viewer-demo/public/example/putty-0.85.chm')
const rendererRoot = resolve(sourceRoot, 'packages/renderers/chm')
const wasmRoot = resolve(sourceRoot, 'packages/renderers/chm/src/wasm')

const importChmWasm = async () => {
  const files = await readdir(wasmRoot)
  const glueName = files.find(name => name === 'chm_wasm.js')
  const binaryName = files.find(name => name.endsWith('_bg.wasm'))
  expect(glueName, 'wasm-bindgen JavaScript glue must be committed').toBeTruthy()
  expect(binaryName, 'compiled CHM WebAssembly must be committed').toBeTruthy()

  const moduleUrl = pathToFileURL(resolve(wasmRoot, glueName!)).href
  const module = await import(/* @vite-ignore */ moduleUrl)
  const binary = await readFile(resolve(wasmRoot, binaryName!))
  await module.default({ module_or_path: binary })
  return module
}

describe('CHM path and URL security boundary', () => {
  it('normalizes safe internal paths without permitting root escape', () => {
    expect(normalizeChmPath('/help/./using/../index.html')).toBe('/help/index.html')
    expect(normalizeChmPath('help/index.html')).toBe('/help/index.html')
    for (const path of [
      '../../secret.txt',
      '/../../secret.txt',
      '/%2e%2e/%2e%2e/secret.txt',
      'C:\\Windows\\win.ini',
      '\\\\server\\share\\secret.txt',
      '/safe\0evil.html',
    ]) {
      expect(normalizeChmPath(path), path).toBeNull()
    }
  })

  it('classifies links without turning active schemes into navigable content', () => {
    expect(resolveChmReference('/help/start.html', 'next.html#usage')).toMatchObject({
      kind: 'internal',
      path: '/help/next.html',
      fragment: 'usage',
    })
    expect(resolveChmReference('/help/start.html', '#usage')).toEqual({
      kind: 'fragment',
      fragment: 'usage',
    })
    expect(resolveChmReference('/help/start.html', 'https://example.com/docs')).toMatchObject({
      kind: 'external',
      url: 'https://example.com/docs',
    })
    expect(resolveChmReference('/help/start.html', 'data:image/png;base64,iVBORw0KGgo=')).toMatchObject({
      kind: 'data',
    })
    expect(resolveChmReference('/help/start.html', 'ms-its:manual.chm::/help/index.html')).toMatchObject({
      kind: 'internal',
      path: '/help/index.html',
    })
    expect(resolveChmReference('/help/start.html', 'mk:@MSITStore:manual.chm::/help/index.html')).toMatchObject({
      kind: 'internal',
      path: '/help/index.html',
    })
    for (const url of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'about:blank',
      'blob:https://attacker.invalid/id',
      'data:text/html,<script>alert(1)</script>',
    ]) {
      expect(resolveChmReference('/help/start.html', url), url).toMatchObject({ kind: 'blocked' })
    }
  })

  it('decodes BOM and legacy Windows text locally', () => {
    expect(decodeChmText(new Uint8Array([0xef, 0xbb, 0xbf, 0x43, 0x48, 0x4d]))).toBe('CHM')
    expect(decodeChmText(new Uint8Array([0x50, 0x75, 0x54, 0x54, 0x59]), 'windows-1252')).toBe('PuTTY')
  })

  it('sanitizes pathological CSS in linear time with bounded resource discovery', () => {
    const startedAt = performance.now()
    const pathological = `${'url('.repeat(100_000)}${'expression('.repeat(100_000)}${'('.repeat(100_000)}`
    const importResult = sanitizeChmCss(`@import ${'('.repeat(100_000)}`, '/help/theme.css')
    const functionResult = sanitizeChmCss(pathological, '/help/theme.css')
    const elapsedMs = performance.now() - startedAt
    expect(elapsedMs).toBeLessThan(1_500)
    expect(importResult.resourcePaths).toHaveLength(0)
    expect(functionResult.resourcePaths).toHaveLength(0)

    const functional = sanitizeChmCss(
      '@import url(https://attacker.invalid/a.css);a{background:u\\72l(https://attacker.invalid/a.png)}b{background:url(../images/local.png)}',
      '/help/theme.css'
    )
    expect(functional.css).not.toContain('attacker.invalid')
    expect(functional.resourcePaths).toEqual(['/images/local.png'])

    const oversized = sanitizeChmCss('a'.repeat(MAX_CHM_CSS_TEXT_LENGTH + 1), '/help/theme.css')
    expect(oversized).toEqual({ css: '', resourcePaths: [] })
  })

  it('extracts search text and rejects markup bombs in bounded linear time', () => {
    expect(extractChmSearchText(
      '<h1>Safe &amp; searchable</h1><script>secret()</script><style>.hidden{}</style><p>topic&nbsp;text</p>'
    )).toBe('Safe & searchable topic text')

    const startedAt = performance.now()
    const pathological = `${'<script>'.repeat(100_000)}${'<'.repeat(100_000)}`
    expect(extractChmSearchText(pathological)).toBe('')
    expect(extractChmSearchText('&'.repeat(200_000))).toHaveLength(200_000)
    expect(performance.now() - startedAt).toBeLessThan(1_000)

    const markupBomb = '<'.repeat(MAX_CHM_HTML_MARKUP_TOKENS + 1)
    expect(() => assertChmMarkupBudget(
      markupBomb,
      MAX_CHM_HTML_TEXT_LENGTH,
      MAX_CHM_HTML_MARKUP_TOKENS,
      'HTML'
    )).toThrow(/CHM_LIMIT_EXCEEDED/)
    const attributeBomb = `<div ${'a '.repeat(MAX_CHM_HTML_MARKUP_TOKENS * 3 + 1)}>`
    expect(() => assertChmMarkupBudget(
      attributeBomb,
      MAX_CHM_HTML_TEXT_LENGTH,
      MAX_CHM_HTML_MARKUP_TOKENS,
      'HTML'
    )).toThrow(/tag fields/)
  })
})

describe('CHM parser redistribution boundary', () => {
  it('ships pinned permissive-code provenance and notices with the npm package', async () => {
    const packageJson = JSON.parse(await readFile(resolve(rendererRoot, 'package.json'), 'utf8')) as {
      files?: string[]
      license?: string
    }
    const notices = await readFile(resolve(rendererRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8')
    const rustNotices = await readFile(resolve(rendererRoot, 'rust/NOTICE.md'), 'utf8')
    const rustDependencyLicenses = await readFile(
      resolve(rendererRoot, 'rust/THIRD_PARTY_LICENSES.md'),
      'utf8'
    )
    const cargoLock = await readFile(resolve(rendererRoot, 'rust/Cargo.lock'))
    const license = await readFile(resolve(rendererRoot, 'LICENSE'), 'utf8')
    const noticeClosure = `${notices}\n${rustNotices}`
    expect(packageJson.license).toBe('Apache-2.0')
    expect(packageJson.files).toContain('LICENSE')
    expect(packageJson.files).toContain('THIRD_PARTY_NOTICES.md')
    expect(packageJson.files).toContain('rust/NOTICE.md')
    expect(packageJson.files).toContain('rust/THIRD_PARTY_LICENSES.md')
    expect(packageJson.files).toContain('rust/src')
    expect(noticeClosure).toContain('RustChm')
    expect(noticeClosure).toContain('5418439a40812079b479acec40719cddedcb583c')
    expect(noticeClosure).toContain('FastChm')
    expect(noticeClosure).toContain('2c22935ba0a1fc7a5a3d3d9785c970058c4d00f0')
    expect(noticeClosure).toContain('MIT License')
    expect(noticeClosure).toContain('Copyright (c) 2026 yeroo')
    expect(license).toContain('Apache License')
    expect(license).toContain('Version 2.0, January 2004')

    const cargoLockSha256 = createHash('sha256').update(cargoLock).digest('hex')
    expect(rustDependencyLicenses).toContain(`Cargo.lock SHA-256: \`${cargoLockSha256}\``)
    for (const [crate, version, spdx] of [
      ['bumpalo', '3.20.3', 'MIT OR Apache-2.0'],
      ['cfg-if', '1.0.4', 'MIT OR Apache-2.0'],
      ['encoding_rs', '0.8.35', '(Apache-2.0 OR MIT) AND BSD-3-Clause'],
      ['futures-core', '0.3.34', 'MIT OR Apache-2.0'],
      ['futures-task', '0.3.34', 'MIT OR Apache-2.0'],
      ['futures-util', '0.3.34', 'MIT OR Apache-2.0'],
      ['js-sys', '0.3.104', 'MIT OR Apache-2.0'],
      ['once_cell', '1.21.4', 'MIT OR Apache-2.0'],
      ['pin-project-lite', '0.2.17', 'Apache-2.0 OR MIT'],
      ['proc-macro2', '1.0.107', 'MIT OR Apache-2.0'],
      ['quote', '1.0.47', 'MIT OR Apache-2.0'],
      ['rustversion', '1.0.23', 'MIT OR Apache-2.0'],
      ['serde', '1.0.229', 'MIT OR Apache-2.0'],
      ['serde_core', '1.0.229', 'MIT OR Apache-2.0'],
      ['serde_derive', '1.0.229', 'MIT OR Apache-2.0'],
      ['serde-wasm-bindgen', '0.6.5', 'MIT'],
      ['slab', '0.4.12', 'MIT'],
      ['syn', '2.0.119', 'MIT OR Apache-2.0'],
      ['syn', '3.0.4', 'MIT OR Apache-2.0'],
      ['thiserror', '2.0.20', 'MIT OR Apache-2.0'],
      ['thiserror-impl', '2.0.20', 'MIT OR Apache-2.0'],
      ['unicode-ident', '1.0.24', '(MIT OR Apache-2.0) AND Unicode-3.0'],
      ['wasm-bindgen', '0.2.127', 'MIT OR Apache-2.0'],
      ['wasm-bindgen-macro', '0.2.127', 'MIT OR Apache-2.0'],
      ['wasm-bindgen-macro-support', '0.2.127', 'MIT OR Apache-2.0'],
      ['wasm-bindgen-shared', '0.2.127', 'MIT OR Apache-2.0'],
    ]) {
      expect(rustDependencyLicenses, `${crate} ${version} license inventory`).toContain(
        `| ${crate} | ${version} | ${spdx} |`
      )
    }
    expect(rustDependencyLicenses).toContain('(Apache-2.0 OR MIT) AND BSD-3-Clause')
    expect(rustDependencyLicenses).toContain('Copyright © WHATWG (Apple, Google, Mozilla, Microsoft).')
    expect(rustDependencyLicenses).toContain('Neither the name of the copyright holder nor the names of its')
    expect(rustDependencyLicenses).toContain('EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.')
    expect(rustDependencyLicenses).toContain('Copyright (c) 2019 Cloudflare, Inc.')
    expect(rustDependencyLicenses).toContain('Copyright (c) 2019 Carl Lerche')
    expect(rustDependencyLicenses).toContain('The above copyright notice and this permission notice shall be included in all')
    expect(rustDependencyLicenses).toContain('OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE')
    expect(rustDependencyLicenses).toContain('UNICODE LICENSE V3')
    expect(rustDependencyLicenses).toContain('Copyright © 1991-2023 Unicode, Inc.')
    expect(rustDependencyLicenses).toContain('dealings in these Data Files or Software without prior written\nauthorization of the copyright holder.')
    expect(rustDependencyLicenses).toContain('Apache License\nVersion 2.0, January 2004')
    expect(rustDependencyLicenses).toContain('APPENDIX: How to apply the Apache License to your work.')

    const rustSources = (await readdir(resolve(rendererRoot, 'rust/src')))
      .filter(name => name.endsWith('.rs'))
    const rustSourceText = (await Promise.all(rustSources.map(name =>
      readFile(resolve(rendererRoot, 'rust/src', name), 'utf8')))).join('\n')
    expect(rustSourceText).not.toMatch(/libchm|CHMLib|cabextract/i)
  })
})

describe('CHM client allocation limits', () => {
  it('clamps caller limits to the Rust WASM hard ceilings', () => {
    const resolved = resolveChmOptions({
      maxArchiveBytes: Number.MAX_SAFE_INTEGER,
      maxEntries: Number.MAX_SAFE_INTEGER,
      maxEntryBytes: Number.MAX_SAFE_INTEGER,
      maxTotalDecompressedBytes: Number.MAX_SAFE_INTEGER,
      maxHtmlBytes: Number.MAX_SAFE_INTEGER,
    })
    expect(resolved).toMatchObject(CHM_HARD_LIMITS)
  })

  it('rejects an oversized archive before slicing or posting it', async () => {
    const posted: unknown[] = []
    class FakeWorker {
      addEventListener() {}
      removeEventListener() {}
      terminate() {}
      postMessage(message: unknown) { posted.push(message) }
    }
    vi.stubGlobal('Worker', FakeWorker)
    const client = new ChmWorkerClient({ maxArchiveBytes: 4 })
    const source = new ArrayBuffer(8)
    let sliced = false
    Object.defineProperty(source, 'slice', {
      value: () => {
        sliced = true
        return new ArrayBuffer(0)
      },
    })
    try {
      await expect(client.open(source)).rejects.toMatchObject({
        code: 'CHM_LIMIT_EXCEEDED',
        message: 'CHM_LIMIT_EXCEEDED: source is 8 bytes; limit is 4.',
      })
      expect(sliced).toBe(false)
      expect(posted).toHaveLength(0)
    } finally {
      client.destroy()
      vi.unstubAllGlobals()
    }
  })
})

describe('compiled Rust CHM WebAssembly', () => {
  it('opens the official compressed PuTTY fixture and reads its home topic', async () => {
    const wasm = await importChmWasm()
    const source = await readFile(fixturePath)
    const archive = new wasm.ChmArchive(new Uint8Array(source))
    try {
      const manifest = archive.manifest() as Record<string, unknown>
      const entries = archive.entries() as Array<Record<string, unknown>>
      const homePath = String(manifest.homePath || manifest.home_path || '')
      expect(entries.length).toBeGreaterThan(400)
      expect(homePath).toMatch(/\.html?$/i)
      expect(entries.some(entry => String(entry.path || entry.name || '') === homePath)).toBe(true)

      const home = archive.read(homePath) as Uint8Array
      expect(home.byteLength).toBeGreaterThan(500)
      expect(decodeChmText(home, 'windows-1252')).toMatch(/PuTTY|<html/i)

      for (const unsafePath of ['../../#SYSTEM', 'C:\\Windows\\win.ini', '\\\\server\\share\\file']) {
        expect(() => archive.read(unsafePath), unsafePath).toThrow()
      }
    } finally {
      if (typeof archive.dispose === 'function') archive.dispose()
      else archive.free()
    }

    const corrupted = new Uint8Array(source)
    corrupted.set(new TextEncoder().encode('BAD!'), 0)
    expect(() => new wasm.ChmArchive(corrupted)).toThrow()
    expect(() => new wasm.ChmArchive(new Uint8Array(source), { maxEntries: 1 })).toThrow()
  }, 30_000)
})
