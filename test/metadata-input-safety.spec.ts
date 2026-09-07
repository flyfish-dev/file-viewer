import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeChmText } from '../packages/renderers/chm/src/security'
import { inspectIllustratorPdfSurface } from '../packages/renderers/design/src/illustratorPreflight'
import { parseAdobePresetResource } from '../packages/renderers/design/src/adobePresetParser'
import { DEFAULT_PHOTOSHOP_PARSE_LIMITS } from '../packages/renderers/design/src/limits'

const bytes = (value: string) => new TextEncoder().encode(value).buffer
const legacyHtml = (prefix: string) => new Uint8Array([...new TextEncoder().encode(prefix), 0xe9])

describe('bounded metadata input processing', () => {
  it('reads actual meta charset attributes rather than lookalike names', () => {
    for (const meta of [
      '<meta charset=" windows-1252 ">',
      '<META CHARSET=windows-1252>',
      '<meta content="text/html; charset=windows-1252" http-equiv="content-type">'
    ]) {
      expect(decodeChmText(legacyHtml(meta), 'utf-8')).toBe(`${meta}é`)
    }
    const falseAttribute = '<meta data-charset=windows-1252>'
    expect(decodeChmText(legacyHtml(falseAttribute), 'utf-8')).toBe(`${falseAttribute}�`)
    const withGreaterThan = '<meta data-description="a>b" charset="windows-1252">'
    expect(decodeChmText(legacyHtml(withGreaterThan), 'utf-8')).toBe(`${withGreaterThan}é`)
  })

  it('handles the full sniff limit and absent charset values without ambiguity', () => {
    for (const value of [
      '<meta charset=' + ' '.repeat(8100) + '>',
      '<meta content="charset=' + ' '.repeat(8100) + '">',
      '<meta'.repeat(1640)
    ]) {
      expect(decodeChmText(new TextEncoder().encode(value))).toBe(value)
    }
  })

  it('recognizes an Illustrator XML namespace, not the URI inside an arbitrary URL', () => {
    expect(
      inspectIllustratorPdfSurface(
        bytes('%PDF-1.7\n<x:xmpmeta xmlns:ai="http://ns.adobe.com/illustrator/">')
      ).illustratorEvidence
    ).toBe(true)
    for (const uri of [
      'https://evil.invalid/?next=http://ns.adobe.com/illustrator/',
      'http://ns.adobe.com/illustrator/extra',
      'http://user@ns.adobe.com/illustrator/',
      'http://ns.adobe.com:80/illustrator/',
      'http://ns.adobe.com/other/../illustrator/'
    ]) {
      expect(
        inspectIllustratorPdfSurface(bytes(`%PDF-1.7\n<x xmlns:ai="${uri}">`)).illustratorEvidence
      ).toBe(false)
    }
    expect(
      inspectIllustratorPdfSurface(
        bytes('%PDF-1.7\n<x data-xmlns:ai="http://ns.adobe.com/illustrator/">')
      ).illustratorEvidence
    ).toBe(false)
    expect(
      inspectIllustratorPdfSurface(bytes('%PDF-1.7\n/AIPrivateData 1 0 R')).illustratorEvidence
    ).toBe(true)
  })

  it('trims only trailing PAT identifier nulls and leaves internal nulls intact', () => {
    const fixture = readFileSync('apps/viewer-demo/public/example/photoshop-patterns.pat')
    const parse = (value: Uint8Array) =>
      parseAdobePresetResource(
        value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer,
        'pat',
        DEFAULT_PHOTOSHOP_PARSE_LIMITS
      )
    const original = parse(fixture)
    if (original.format !== 'pat') throw new Error('Expected PAT fixture')
    const id = original.patterns[0]!.id
    const start = fixture.indexOf(Buffer.from(id))
    expect(start).toBeGreaterThan(0)
    const trailing = Buffer.from(fixture)
    trailing[start + id.length - 1] = 0
    const internal = Buffer.from(fixture)
    internal[start + 1] = 0
    const tailResult = parse(trailing)
    const innerResult = parse(internal)
    if (tailResult.format !== 'pat' || innerResult.format !== 'pat')
      throw new Error('Expected PAT results')
    expect(tailResult.patterns[0]!.id).toBe(id.slice(0, -1))
    expect(innerResult.patterns[0]!.id).toBe(`${id[0]}\0${id.slice(2)}`)
    expect(tailResult.patterns[0]!.rgba).toEqual(original.patterns[0]!.rgba)
  })
})
