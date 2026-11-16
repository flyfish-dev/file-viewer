import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseUmdBook } from '../packages/renderers/ebook/src/umd/parser'

function loadFixture(name: string): ArrayBuffer {
  const buffer = readFileSync(join(__dirname, '..', 'apps', 'viewer-demo', 'public', 'example', name))
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

describe('umd ebook parser', () => {
  it('parses metadata, chapter titles and zlib text segments', () => {
    const book = parseUmdBook(loadFixture('book.umd'))

    expect(book.kind).toBe('text')
    expect(book.title).toBe('Flyfish UMD 电子书样本')
    expect(book.titleIsFallback).toBe(false)
    expect(book.author).toBe('Flyfish Viewer')
    expect(book.chapters).toHaveLength(2)
    expect(book.chapters[0].title).toBe('第一章 旧格式醒来')
    expect(book.chapters[0].content).toContain('UMD 是早期移动阅读器常见的电子书封装格式')
    expect(book.chapters[1].content).toContain('预览器会把章节偏移还原成目录')
    expect(book.warnings).toEqual([])
  })
  it('distinguishes an authored title from the same generated fallback text', () => {
    const title = 'UMD 电子书'
    const bytes = new Uint8Array(9 + title.length * 2)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, 0xde9a9b89, true)
    bytes[4] = 0x23
    view.setUint16(5, 2, true)
    bytes[8] = 5 + title.length * 2
    for (let index = 0; index < title.length; index++) view.setUint16(9 + index * 2, title.charCodeAt(index), true)
    expect(parseUmdBook(bytes.buffer)).toMatchObject({ title, titleIsFallback: false })
    expect(parseUmdBook(bytes.buffer.slice(0, 4))).toMatchObject({ title, titleIsFallback: true })
    expect(() => parseUmdBook(new ArrayBuffer(4))).toThrowError(expect.objectContaining({ code: 'UMD_INVALID_FILE' }))
  })
})
