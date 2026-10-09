# Single-byte text encodings

## Problem and compatibility

An ISO-8859-1 file containing `Die Straße in Saarbrücken` previously decoded
as `Die Stra遝 in Saarbr點ken`. Auto mode fell back to GB18030 and the text
options offered no single-byte override. The original public contribution is
[PR #326](https://github.com/flyfish-dev/file-viewer/pull/326).

The default remains GB18030. Auto detection still checks, in order:

1. UTF-8 or UTF-16 byte-order mark
2. BOM-less UTF-16 byte structure
3. Strictly valid UTF-8
4. `text.fallbackEncoding`, defaulting to `gb18030`

Set a fallback for a collection of legacy files:

```ts
const options = { text: { fallbackEncoding: 'windows-1252' } }
```

When the source encoding is known, pin it explicitly:

```ts
const options = { text: { encoding: 'iso-8859-1' } }
```

Both options support `iso-8859-1`, `iso-8859-2`, `iso-8859-15`,
`windows-1250`, `windows-1251`, and `windows-1252`. Decoder helpers also
normalize common aliases such as `latin1`, `cp1252`, and `cp1251`.
The declarative TypeScript options use the canonical labels.

A byte sequence may be valid in more than one encoding. For example, `C3 A4`
is `ä` in UTF-8 and `Ã¤` in Windows-1252. Setting only the fallback keeps UTF-8
precedence; an explicit encoding is required to select the legacy reading.
Browsers map the ISO-8859-1 label to Windows-1252 under the WHATWG Encoding
Standard, including the Euro sign and typographic punctuation in `80–9F`.

No decoder dependency or consumer runtime floor is added. The same option is
forwarded through code, Markdown, HTML preview/source, XML profiles, patch,
LRC lyrics, and virtual large-text rendering. CSV/TSV retain their separate
`spreadsheet.textEncoding` option. The source buffer and downloaded bytes
are not transcoded.

## Large-text boundaries

Each supported single-byte decoder produces one UTF-16 code unit per source
byte. The virtual renderer therefore uses byte boundaries directly for long
line segments and search offsets, including bytes `80–BF` that otherwise look
like UTF-8 continuation bytes. UTF-8 and GB18030 keep their existing boundary
logic. UTF-16 stays on the nonvirtual path.

## Regression gates

Run the unit, public-contract, and real-browser checks together:

```sh
pnpm test:text-single-byte-encodings
```

The root `pnpm test` command includes this gate, and Public CI installs the
required browser before running it. The focused Node suites are:

```sh
pnpm exec vitest run test/text-single-byte-encodings.spec.ts test/text-encoding-contracts.spec.ts
```

Coverage includes the original Latin-1 and Cyrillic binary fixtures, all six
single-byte labels, explicit versus fallback precedence, valid UTF-8, BOM,
UTF-16 in both byte orders, preserved default GBK decoding, unknown aliases,
all public core option/type entries, 1024-byte line segments, and exact byte
offsets for 200 search matches crossing a 256 KiB chunk boundary. Negative type
checks retain the independent CSV/TSV contract and reject unsupported labels.

The browser harness exercises actual rendered content and search navigation.
Node/JSDOM and type checks do not establish a browser pass; browser evidence
must come from an environment that can launch the browser. The adaptation
preserves the newer Markdown highlighting, anchors, and shared gestures.
