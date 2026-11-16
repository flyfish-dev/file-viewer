import type JSZip from 'jszip'

export interface StoredRowSizing {
  /** Rows with source sizing that the vendor reader otherwise drops. */
  fixedRows: number[]
  autoHeightDisabled?: boolean
}

const decodeAttribute = (value: string) =>
  value.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (_, token: string) => {
      if (token[0] !== '#')
        return (
          (
            { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<
              string,
              string
            >
          )[token] || ''
        )
      const code =
        token[1].toLowerCase() === 'x'
          ? parseInt(token.slice(2), 16)
          : parseInt(token.slice(1), 10)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    },
  )

/** Streaming lexical scan: cells/text are discarded, never accumulated as a worksheet DOM. */
export const createRowSizingScanner = () => {
  let buffer = '',
    skipping = '',
    lastRow = 0
  const fixed = new Set<number>()
  const push = (chunk: string) => {
    buffer += chunk
    for (;;) {
      if (skipping) {
        const end = buffer.indexOf(skipping)
        if (end < 0) {
          buffer = buffer.slice(-skipping.length)
          return
        }
        buffer = buffer.slice(end + skipping.length)
        skipping = ''
        continue
      }
      const start = buffer.indexOf('<')
      if (start < 0) {
        buffer = ''
        return
      }
      buffer = buffer.slice(start)
      if (buffer.startsWith('<!--')) {
        buffer = buffer.slice(4)
        skipping = '-->'
        continue
      }
      if (buffer.startsWith('<![CDATA[')) {
        buffer = buffer.slice(9)
        skipping = ']]>'
        continue
      }
      if (/^<!DOCTYPE/i.test(buffer))
        throw new Error('Row sizing does not expand XML document types')
      let end = -1,
        quote = ''
      for (let i = 1; i < buffer.length; i++) {
        const c = buffer[i]
        if (quote) {
          if (c === quote) quote = ''
          continue
        }
        if (c === '"' || c === "'") quote = c
        else if (c === '>') {
          end = i
          break
        }
      }
      if (end < 0) {
        if (buffer.length > 65536)
          throw new Error('Row sizing XML tag exceeds the preview limit')
        return
      }
      const tag = buffer.slice(0, end + 1)
      buffer = buffer.slice(end + 1)
      const row = /^<(?:[\w.-]+:)?row\b/.exec(tag)
      if (!row) continue
      const attrs: Record<string, string> = {}
      let tail = tag.slice(row[0].length)
      while (tail.trim() && !/^\s*\/?>/.test(tail)) {
        const attr = /^\s+([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(tail)
        if (!attr) throw new Error('Invalid row sizing attribute')
        attrs[attr[1]] = decodeAttribute(attr[2] ?? attr[3])
        tail = tail.slice(attr[0].length)
      }
      const index = attrs.r === undefined ? lastRow + 1 : Number(attrs.r)
      if (!Number.isSafeInteger(index) || index < 1 || index > 1048576)
        throw new Error('Invalid source row index')
      lastRow = index
      const hasHeight = Object.prototype.hasOwnProperty.call(attrs, 'ht')
      const validHeight =
        hasHeight &&
        attrs.ht.trim() !== '' &&
        Number.isFinite(Number(attrs.ht)) &&
        Number(attrs.ht) >= 0
      const custom =
        attrs.customHeight !== undefined &&
        !/^(?:0|false)$/i.test(attrs.customHeight)
      if ((custom && !validHeight) || (hasHeight && !validHeight))
        fixed.add(index - 1)
      if (fixed.size > 100000)
        throw new Error('Row sizing hints exceed the preview limit')
    }
  }
  return {
    push,
    finish: (): StoredRowSizing => {
      if (skipping || buffer.trim())
        throw new Error('Incomplete row sizing XML')
      return { fixedRows: [...fixed] }
    },
  }
}

export const readStoredRowSizing = async (
  zip: JSZip,
  part: string,
): Promise<StoredRowSizing> => {
  const file = zip.file(part)
  if (!file) return { fixedRows: [], autoHeightDisabled: true }
  try {
    return await new Promise<StoredRowSizing>((resolve, reject) => {
      const scanner = createRowSizingScanner(),
        decoder = new TextDecoder()
      const stream = file.internalStream('uint8array')
      let finished = false,
        bytes = 0
      const fail = (error: unknown) => {
        if (finished) return
        finished = true
        stream.pause()
        reject(error)
      }
      stream.on('data', (chunk) => {
        if (finished) return
        bytes += chunk.byteLength
        if (bytes > 128 * 1024 * 1024) {
          fail(new Error('Row sizing XML exceeds the preview limit'))
          return
        }
        try {
          scanner.push(decoder.decode(chunk, { stream: true }))
        } catch (error) {
          fail(error)
        }
      })
      stream.on('error', fail)
      stream.on('end', () => {
        if (finished) return
        try {
          scanner.push(decoder.decode())
          const result = scanner.finish()
          finished = true
          resolve(result)
        } catch (error) {
          fail(error)
        }
      })
      stream.resume()
    })
  } catch (error) {
    console.warn(
      '[file-viewer] Automatic row sizing disabled: source row metadata could not be verified.',
      error,
    )
    return { fixedRows: [], autoHeightDisabled: true }
  }
}
