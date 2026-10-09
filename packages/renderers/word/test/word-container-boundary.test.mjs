import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import JSZip from 'jszip'
import { resolveFileViewerWordContainer } from '../dist/index.js'
import { convertWordMlToDocx } from '../dist/wordMl.js'

const WORDML = 'http://schemas.microsoft.com/office/word/2003/wordml'
const bytes = (source) => new TextEncoder().encode(source).buffer
const body =
  '<w:body><w:p><w:r><w:t>Boundary control</w:t></w:r></w:p></w:body>'
const document = (namespace = WORDML) =>
  `<w:wordDocument xmlns:w="${namespace}">${body}</w:wordDocument>`

for (const [name, source] of [
  ['namespace suffix', document(`${WORDML}.attacker.invalid`)],
  ['namespace prefix', document(`https://attacker.invalid/${WORDML}`)],
  [
    'namespace query value',
    document(`https://attacker.invalid/?next=${WORDML}`)
  ],
  [
    'unrelated root namespace',
    `<w:wordDocument xmlns:w="urn:other" xmlns:unused="${WORDML}">${body}</w:wordDocument>`
  ],
  [
    'namespace-looking attribute text',
    `<w:wordDocument note='xmlns:w="${WORDML}"' xmlns:w="urn:other">${body}</w:wordDocument>`
  ],
  [
    'namespace marker in content',
    `<w:wordDocument xmlns:w="urn:other"><w:body>${WORDML}</w:body></w:wordDocument>`
  ],
  [
    'nested WordML element',
    `<root xmlns:w="${WORDML}"><w:wordDocument>${body}</w:wordDocument></root>`
  ],
  [
    'comment-only WordML marker',
    `<!-- <w:wordDocument xmlns:w="${WORDML}"> --><root/>`
  ],
  [
    'unbound root prefix',
    `<w:wordDocument xmlns="${WORDML}"><body/></w:wordDocument>`
  ],
  [
    'duplicate namespace attribute',
    `<w:wordDocument xmlns:w="${WORDML}" xmlns:w="urn:other">${body}</w:wordDocument>`
  ]
]) {
  test(`WordML routing rejects ${name} before conversion`, async () => {
    const input = bytes(source)
    assert.equal(resolveFileViewerWordContainer(input), 'binary')
    const dom = new JSDOM('<div id="host"></div>')
    try {
      await assert.rejects(
        convertWordMlToDocx(input, dom.window.document.getElementById('host')),
        /Invalid Word 2003 XML document/
      )
    } finally {
      dom.window.close()
    }
  })
}

for (const [name, source] of [
  ['prefixed root', document()],
  [
    'default namespace',
    `<wordDocument xmlns="${WORDML}"><body><p><r><t>Boundary control</t></r></p></body></wordDocument>`
  ],
  [
    'alternate prefix and quote',
    document()
      .replaceAll('w:', 'doc:')
      .replace('xmlns:w=', 'xmlns:doc=')
      .replace(`"${WORDML}"`, `'${WORDML}'`)
  ],
  [
    'processing instructions and comments',
    `\ufeff<?xml version="1.0"?>\n<?mso-application progid="Word.Document"?>\n<!-- prologue -->\n${document()}`
  ],
  [
    'greater-than sign inside an attribute',
    document().replace('<w:wordDocument ', '<w:wordDocument note="a > b" ')
  ],
  [
    'numeric namespace references',
    document().replace(
      WORDML,
      WORDML.replace(':', '&#58;').replaceAll('/', '&#x2F;')
    )
  ]
]) {
  test(`WordML routing and conversion preserve ${name}`, async () => {
    const input = bytes(source)
    assert.equal(resolveFileViewerWordContainer(input), 'wordml')
    const dom = new JSDOM('<div id="host"></div>')
    try {
      const zip = await JSZip.loadAsync(
        await convertWordMlToDocx(
          input,
          dom.window.document.getElementById('host')
        )
      )
      assert.match(
        await zip.file('word/document.xml').async('string'),
        /Boundary control/
      )
    } finally {
      dom.window.close()
    }
  })
}

test('WordML marker text does not steal HTML or plain-text routes', () => {
  assert.equal(
    resolveFileViewerWordContainer(
      bytes(`<html><body><!-- ${document()} --><p>HTML</p></body></html>`)
    ),
    'html'
  )
  assert.equal(
    resolveFileViewerWordContainer(bytes(`Quoted XML example: ${document()}`)),
    'text'
  )
})

test('WordML sniffing remains bounded without parsing a truncated document body', () => {
  assert.equal(
    resolveFileViewerWordContainer(
      bytes(document().replace('Boundary control', 'a'.repeat(70000)))
    ),
    'wordml'
  )
  assert.equal(
    resolveFileViewerWordContainer(
      bytes(
        `<w:wordDocument note="${'a'.repeat(65536)}" xmlns:w="${WORDML}">${body}</w:wordDocument>`
      )
    ),
    'binary'
  )
  assert.equal(
    resolveFileViewerWordContainer(
      bytes(`<w:wordDocument xmlns:w="${WORDML}"`)
    ),
    'binary'
  )
})

test('ZIP and OLE signatures retain precedence over embedded WordML text', () => {
  const xml = new TextEncoder().encode(document())
  for (const [signature, expected] of [
    [[0x50, 0x4b, 0x03, 0x04], 'openxml'],
    [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 'binary']
  ]) {
    assert.equal(
      resolveFileViewerWordContainer(
        Uint8Array.from([...signature, ...xml]).buffer
      ),
      expected
    )
  }
})

for (const name of ['😀', 'a😀', 'Ⅰ', 'a\u200C']) {
  test(`WordML preserves the XML 1.0 attribute name ${JSON.stringify(name)}`, async () => {
    const source = document().replace(
      '<w:wordDocument ',
      `<w:wordDocument ${name}="x" `
    )
    const input = bytes(source)
    const dom = new JSDOM('<div id="host"></div>')
    try {
      // The existing converter is the independent well-formedness control.
      const zip = await JSZip.loadAsync(
        await convertWordMlToDocx(
          input,
          dom.window.document.getElementById('host')
        )
      )
      assert.match(
        await zip.file('word/document.xml').async('string'),
        /Boundary control/
      )
      assert.equal(resolveFileViewerWordContainer(input), 'wordml')
    } finally {
      dom.window.close()
    }
  })
}

test('WordML accepts legal XML 1.0 namespace prefixes beyond Unicode letters', async () => {
  for (const prefix of ['😀', 'Ⅰ', '\u200Cdoc']) {
    const source = document()
      .replaceAll('w:', `${prefix}:`)
      .replace('xmlns:w=', `xmlns:${prefix}=`)
    const input = bytes(source)
    const dom = new JSDOM('<div id="host"></div>')
    try {
      await convertWordMlToDocx(
        input,
        dom.window.document.getElementById('host')
      )
      assert.equal(resolveFileViewerWordContainer(input), 'wordml')
    } finally {
      dom.window.close()
    }
  }
})

for (const [encoding, attributes] of [
  ['windows-1252', 'é="1" à="2"'],
  ['ISO-8859-1', 'øø="1" þþ="2"']
]) {
  test(`WordML decodes ${encoding} before comparing root attribute names`, async () => {
    const source = Buffer.from(
      `<?xml version="1.0" encoding="${encoding}"?>` +
        document().replace('<w:wordDocument ', `<w:wordDocument ${attributes} `),
      'latin1'
    )
    const input = source.buffer.slice(
      source.byteOffset,
      source.byteOffset + source.byteLength
    )
    const dom = new JSDOM('<div id="host"></div>')
    try {
      await convertWordMlToDocx(input, dom.window.document.getElementById('host'))
      assert.equal(resolveFileViewerWordContainer(input), 'wordml')
    } finally {
      dom.window.close()
    }
  })
}

test('a truncated UTF-8 sample tail does not collapse distinct XML root names', async () => {
  const header =
    `<w:wordDocument a\u200C="1" a\u200D="2" xmlns:w="${WORDML}">` +
    '<w:body><w:p><w:r><w:t>'
  const source =
    header +
    'a'.repeat(65535 - Buffer.byteLength(header)) +
    'é</w:t></w:r></w:p></w:body></w:wordDocument>'
  const input = bytes(source)
  const dom = new JSDOM('<div id="host"></div>')
  try {
    await convertWordMlToDocx(input, dom.window.document.getElementById('host'))
    assert.equal(resolveFileViewerWordContainer(input), 'wordml')
  } finally {
    dom.window.close()
  }
})
