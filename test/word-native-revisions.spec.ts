import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseHTML } from 'linkedom'
import { describe, expect, it } from 'vitest'
import { parseMsDoc } from '../packages/renderers/doc/src/msdoc/parser'
import { renderMsDoc } from '../packages/renderers/doc/src/render/html'
import { charPropsToState } from '../packages/renderers/doc/src/msdoc/properties'
import type { ParagraphBlock } from '../packages/renderers/doc/src/types'

const root = 'packages/renderers/doc/test/fixtures/native-revisions'
const parsed = parseMsDoc(readFileSync(`${root}/native-revisions.doc`))
const oracle = JSON.parse(readFileSync(`${root}/native-oracle.json`, 'utf8'))
const documentFor = (source = parsed, reviewMode: 'all' | 'final' | 'original' = 'all') =>
  parseHTML(`<html><body>${renderMsDoc(source, { reviewMode }).html}</body></html>`).document
const textWithBreaks = (node: Node): string =>
  node.nodeName.toLowerCase() === 'br'
    ? '\n'
    : node.nodeType === 3
      ? (node.textContent ?? '')
      : [...node.childNodes].map(textWithBreaks).join('')
const paragraphs = (document: ReturnType<typeof documentFor>) =>
  [...document.querySelectorAll('p')].map(textWithBreaks)

describe('Microsoft Word generated DOC revisions', () => {
  it('pins native binary files and Word accept/reject reference bytes', () => {
    for (const file of oracle.files) {
      const bytes = readFileSync(`${root}/${file.filename}`)
      expect(bytes.length).toBe(file.bytes)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256)
    }
    expect(oracle.revisionCount).toBe(18)
  })

  it.each(['final', 'original'] as const)(
    'matches Word %s paragraph and break semantics',
    (mode) => {
      const reference = parseMsDoc(readFileSync(`${root}/native-revisions-${mode}.doc`))
      expect(paragraphs(documentFor(parsed, mode))).toEqual(paragraphs(documentFor(reference)))
      expect(paragraphs(documentFor(parsed, mode))).toEqual(
        oracle.references[mode].paragraphs.map((text: string) => text || '\n')
      )
    }
  )

  it('preserves unchanged text and original formatting inside deleted text', () => {
    const document = documentFor()
    const unchanged = [...document.querySelectorAll('p')].find((p) =>
      p.textContent.startsWith('Case repeated:')
    )!
    expect(unchanged.querySelector('ins,del')).toBeNull()
    expect(document.querySelector('del[style*="font-weight:700"]')?.textContent).toBe('BETA')
    expect([...document.querySelectorAll('del')].map((n) => n.textContent).join('')).toContain(
      'REMOVE_BREAK'
    )
  })

  it('filters table cell revisions without removing unchanged cells', () => {
    for (const mode of ['final', 'original'] as const) {
      const cells = [...documentFor(parsed, mode).querySelectorAll('td')].map(
        (td) => td.textContent
      )
      expect(cells).toEqual([
        'Item',
        'Value',
        'Contract',
        mode === 'final' ? 'NEW_AMOUNT' : 'OLD_AMOUNT',
        'Unchanged',
        mode === 'final' ? 'NEW_AMOUNT' : 'OLD_AMOUNT'
      ])
    }
  })

  it('retains the native soft-break and paragraph-mark revision flags in the AST', () => {
    const blocks = parsed.blocks.filter((block) => block.type === 'paragraph')
    expect(blocks.filter((block) => block.paragraphMark?.revisionDeleted)).toHaveLength(1)
    expect(blocks.filter((block) => block.paragraphMark?.revisionInserted)).toHaveLength(1)
    expect(
      blocks
        .flatMap((block) => block.inlines)
        .filter((node) => node.type === 'lineBreak' && node.style?.revisionDeleted)
    ).toHaveLength(1)
  })
})

describe('DOC revision boundary isolation', () => {
  const base = parsed.blocks.find((block) => block.type === 'paragraph')!
  const paragraph = (
    text: string,
    mark: ParagraphBlock['paragraphMark'] = {},
    storyKind = 'main'
  ): ParagraphBlock => ({
    ...base,
    text,
    paragraphMark: mark,
    storyKind,
    inlines: [{ type: 'text', text, style: charPropsToState([]) }]
  })
  const nativeTable = parsed.blocks.find((block) => block.type === 'table')!

  it.each(['final', 'original'] as const)(
    'merges consecutive removed marks in %s without mutating the parsed tree',
    (mode) => {
      const mark = mode === 'final' ? { revisionDeleted: true } : { revisionInserted: true }
      const input = {
        ...parsed,
        blocks: [paragraph('A', mark), paragraph('B', mark), paragraph('C')]
      }
      const before = JSON.stringify(input)
      expect(paragraphs(documentFor(input, mode))).toEqual(['ABC'])
      expect(paragraphs(documentFor(input, 'all'))).toEqual(['A', 'B', 'C'])
      expect(JSON.stringify(input)).toBe(before)
    }
  )

  it('does not merge across table, story, or cell boundaries', () => {
    const marked = paragraph('A', { revisionDeleted: true })
    const table = {
      ...nativeTable,
      rows: [
        {
          ...nativeTable.rows[0],
          cells: [
            { ...nativeTable.rows[0].cells[0], paragraphs: [marked] },
            { ...nativeTable.rows[0].cells[1], paragraphs: [paragraph('B')] }
          ]
        }
      ]
    }
    const input = {
      ...parsed,
      blocks: [
        marked,
        table,
        paragraph('C', { revisionDeleted: true }),
        paragraph('D', {}, 'textbox')
      ]
    }
    const document = documentFor(input, 'final')
    expect(paragraphs(document)).toEqual(['A', 'C', 'D'])
    expect([...document.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['A', 'B'])
  })

  it('merges within one table cell without discarding another cell', () => {
    const table = {
      ...nativeTable,
      rows: [
        {
          ...nativeTable.rows[0],
          cells: [
            {
              ...nativeTable.rows[0].cells[0],
              paragraphs: [paragraph('A', { revisionDeleted: true }), paragraph('B')]
            },
            { ...nativeTable.rows[0].cells[1], paragraphs: [paragraph('C')] }
          ]
        }
      ]
    }
    expect(
      [...documentFor({ ...parsed, blocks: [table] }, 'final').querySelectorAll('td')].map(
        (td) => td.textContent
      )
    ).toEqual(['AB', 'C'])
  })

  it.each(['lineBreak', 'pageBreak'] as const)(
    'filters %s revisions and keeps legacy unmarked nodes',
    (type) => {
      const block = paragraph('')
      block.inlines = [
        { type, style: { ...charPropsToState([]), revisionDeleted: true } },
        { type, style: { ...charPropsToState([]), revisionInserted: true } },
        { type },
        { type: 'text', text: 'remaining', style: charPropsToState([]) }
      ]
      const selector = type === 'lineBreak' ? 'br' : '.msdoc-page-break'
      const input = { ...parsed, blocks: [block] }
      expect(documentFor(input, 'all').querySelectorAll(selector)).toHaveLength(3)
      expect(documentFor(input, 'final').querySelectorAll(selector)).toHaveLength(2)
      expect(documentFor(input, 'original').querySelectorAll(selector)).toHaveLength(2)
    }
  )
})
