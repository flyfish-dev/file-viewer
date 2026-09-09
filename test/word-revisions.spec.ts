import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseHTML } from 'linkedom'
import { describe, expect, it } from 'vitest'
import { parseMsDoc } from '../packages/renderers/doc/src/msdoc/parser'
import { renderMsDoc } from '../packages/renderers/doc/src/render/html'
import { decodeSprm, SprmCodes } from '../packages/renderers/doc/src/msdoc/sprm'
import { createDocxOptions } from '../packages/renderers/word/src/wordDocx'

const bytes = readFileSync('packages/renderers/doc/test/fixtures/github-255-revisions.doc')
const parsed = parseMsDoc(bytes)
const company = '\u7532\u65b9\uff1a'
const inserted = '\u6d4b\u8bd5\u4fee\u8ba2'
const html = (options = {}) =>
  parseHTML(`<html><body>${renderMsDoc(parsed, options).html}</body></html>`).document

describe('original GitHub 255 DOC revision records', () => {
  it('uses the exact public attachment, not a renamed or synthesized replacement', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '762969dde787960b8e33e65ac11b5c85247c648329e69f560dd7554633cc706f'
    )
  })

  it('decodes insertion and deletion records instead of treating them as unknown styles', () => {
    expect(decodeSprm(SprmCodes.sprmCFRMarkDel, Uint8Array.of(0x81))).toMatchObject({
      name: 'revisionDeleted',
      value: true
    })
    expect(decodeSprm(SprmCodes.sprmCFRMark, Uint8Array.of(0))).toMatchObject({
      name: 'revisionInserted',
      value: false
    })
    const paragraph = parsed.blocks.find(
      (block) => block.type === 'paragraph' && block.text.includes(inserted)
    )!
    if (paragraph.type !== 'paragraph') throw new Error('Missing revised paragraph')
    expect(
      paragraph.inlines.find((node) => node.type === 'text' && node.text === '2222')?.style
    ).toMatchObject({ revisionDeleted: true })
  })

  it('shows actual deleted and inserted runs by default without marking unchanged copies', () => {
    const document = html()
    expect([...document.querySelectorAll('del')].map((node) => node.textContent).join('')).toBe(
      '2222'
    )
    expect([...document.querySelectorAll('ins')].map((node) => node.textContent).join('')).toBe(
      inserted
    )
    expect(document.querySelectorAll('[data-msdoc-change="delete"]')).toHaveLength(1)
  })

  it.each([
    ['final', `${company}${inserted}`],
    ['original', `${company}2222`]
  ])('renders %s without leaking the other revision state', (reviewMode, expected) => {
    const document = html({ reviewMode })
    const paragraph = [...document.querySelectorAll('p')].find((node) =>
      node.textContent?.startsWith(company)
    )!
    expect(paragraph.textContent).toBe(expected)
    expect(document.querySelector('ins,del')).toBeNull()
  })
})

describe('DOCX revision mode integration', () => {
  it('retains revisions by default and forwards explicit review modes', () => {
    const target = parseHTML('<html><body><div></div></body></html>').document.querySelector(
      'div'
    )! as unknown as HTMLDivElement
    expect(createDocxOptions(target, undefined, () => {}).reviewMode).toBe('all')
    for (const reviewMode of ['all', 'final', 'original'] as const) {
      expect(
        createDocxOptions(target, { options: { docx: { reviewMode } } } as any, () => {}).reviewMode
      ).toBe(reviewMode)
    }
  })
})
