import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import * as core from '../packages/core/src'
import * as headless from '../packages/core/src/headless'
import * as browser from '../packages/core/src/browser'
import * as source from '../packages/core/src/source'

const entries = { core, headless, browser, source }

describe('public text encoding contracts', () => {
  it('retains encoding options when passing declarative options between wrappers', () => {
    const options = { text: { encoding: 'iso-8859-2' as const, fallbackEncoding: 'windows-1251' as const } }
    expect(core.parseFileViewerOptions(core.serializeFileViewerOptions(options)!)).toEqual(options)
  })

  it.each(Object.entries(entries))('exports the same decoder helpers through %s', (_name, entry) => {
    expect(entry.DEFAULT_FILE_VIEWER_TEXT_FALLBACK_ENCODING).toBe('gb18030')
    expect(entry.isSingleByteFileViewerTextEncoding('windows-1251')).toBe(true)
    expect(entry.decodeFileViewerTextBuffer(new Uint8Array([0xd6, 0xe4]).buffer, 'auto', 'windows-1252'))
      .toEqual({ text: 'Öä', encoding: 'windows-1252' })
  })

  it('type-checks all public option entries and rejects unsupported options', () => {
    const fixture = fileURLToPath(new URL('./fixtures/text-encoding/public-contracts.ts', import.meta.url))
    const program = ts.createProgram([fixture], {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ['lib.dom.d.ts', 'lib.es2020.d.ts'],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      types: []
    })
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')))
      .toEqual([])
  })
})
