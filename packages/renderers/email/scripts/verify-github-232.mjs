import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEml } from '../dist/email.js'

// GitHub PR #232 adopted postal-mime 3.0.0 purely for EML header correctness, so
// this gate locks the four behaviours that were the whole reason for the upgrade:
//
//   1. charset label fallback (the fixture declares the non-standard gb_2312-80
//      label and an RFC 2047 encoded-word subject and display name);
//   2. RFC 5322 header unfolding (the recipient list and the Received chain are
//      folded across continuation lines);
//   3. duplicated single-value headers keep the first occurrence;
//   4. the to/cc address lists stay in document order.
//
// It runs through the renderer's own parse path, so a downgrade, an upstream API
// shape change, or a regression in the address normalisation fails here instead of
// silently mis-rendering a customer mailbox.

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
const postalRange = String(manifest.dependencies['postal-mime'])

assert.ok(
  /^(?:\^|~)?3\./.test(postalRange),
  'the EML renderer must stay on postal-mime 3.x header parsing, found ' + postalRange
)

const fixtureText = (
  await readFile(join(packageDir, 'test', 'fixtures', 'github-232-headers.eml'), 'utf8')
).replace(/\r?\n/g, '\n')

// Mail user agents send CRLF, but Git normalises the checked-in fixture to LF, so
// the same message is parsed both ways and header folding cannot depend on either.
const variants = [
  ['LF', fixtureText],
  ['CRLF', fixtureText.replace(/\n/g, '\r\n')]
]

// The renderer turns inline images into object URLs, which Node does not provide.
const objectUrls = []
globalThis.URL.createObjectURL = () => 'blob:file-viewer-email-gate'
globalThis.URL.revokeObjectURL = () => {}

const subject = '\u5b63\u5ea6\u62a5\u8868\u5df2\u53d1\u9001 - \u8d22\u52a1\u90e8'

for (const [label, source] of variants) {
  const bytes = new TextEncoder().encode(source)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const parsed = await parseEml(buffer, 'fallback-name.eml', objectUrls, new Map())
  const where = label + ' fixture: '

  // 1. Charset resolution, for the subject and for an encoded-word display name.
  assert.equal(parsed.subject, subject, where + 'expected the GB2312 subject to decode')
  assert.equal(parsed.from.length, 1, where + 'expected one From address after first-wins')
  assert.equal(
    parsed.from[0].address,
    'finance@example.com',
    where + 'expected the first From to win'
  )
  assert.equal(parsed.from[0].name, subject, where + 'expected the encoded-word name to decode')

  // 1. The body only decodes if the non-standard gb_2312-80 label falls back to GB2312.
  assert.ok(
    parsed.text.includes('\u7b2c\u4e09\u5b63\u5ea6\u62a5\u8868'),
    where + 'expected the GB2312 body to decode'
  )
  assert.ok(
    !parsed.text.includes('\uFFFD'),
    where + 'expected no replacement characters from charset fallback'
  )

  // 2 + 4. The folded To list only yields both recipients when unfolding is correct,
  // and the renderer must show them in the order the message actually listed them.
  assert.deepEqual(
    parsed.to.map((item) => item.address),
    ['alice@example.com', 'bob@example.com'],
    where + 'expected both folded recipients in document order'
  )
  assert.deepEqual(
    parsed.to.map((item) => item.name),
    ['Alice', 'Bob'],
    where + 'expected the folded display names in document order'
  )
  assert.deepEqual(
    parsed.cc.map((item) => item.address),
    ['carol@example.com'],
    where + 'expected the Cc list to stay separate from To'
  )

  // The raw header panel keeps what the sender sent, including the folded
  // continuation of the Received chain and the duplicated Message-ID values.
  const headers = String(parsed.headers)
  assert.ok(
    headers.includes('From: forged@example.org'),
    where + 'expected the raw header view to keep the second From'
  )
  assert.ok(
    headers.includes('<first-1234@example.com>'),
    where + 'expected the first Message-ID to stay visible'
  )
  assert.ok(
    headers.includes('<second-5678@example.com>'),
    where + 'expected the second Message-ID to stay visible'
  )
  assert.ok(
    headers.includes('(Postfix) with ESMTP id 4Q2Z1F'),
    where + 'expected the first Received continuation to survive'
  )
  assert.ok(
    headers.includes('for <alice@example.com>'),
    where + 'expected the second Received continuation to survive'
  )
  for (const line of headers.split('\n')) {
    if (!line || /^\s/.test(line)) {
      continue
    }
    assert.ok(line.includes(':'), where + 'expected indented continuations only, found ' + line)
  }

  // The same parse path still exposes attachments with their decoded content.
  assert.deepEqual(
    parsed.attachments.map((item) => [item.name, item.mimeType, item.size]),
    [['q3-report.txt', 'application/octet-stream', 5]],
    where + 'expected the attachment list to survive header parsing'
  )
  assert.equal(
    new TextDecoder().decode(await parsed.attachments[0].load()),
    'hello',
    where + 'expected the attachment payload to decode'
  )
}

console.log(
  '[github-232] EML charset, unfolding, first-wins and address order verified for LF and CRLF on postal-mime ' +
    postalRange +
    '.'
)
