import type {
  FileViewerOptions as RootOptions,
  FileViewerTextOptions as RootTextOptions,
  FileViewerSingleByteTextEncoding as RootSingleByte,
  FileViewerTextEncoding as RootEncoding
} from '../../../packages/core/src/index'
import type {
  FileViewerOptions as HeadlessOptions,
  FileViewerTextOptions as HeadlessTextOptions,
  FileViewerSingleByteTextEncoding as HeadlessSingleByte,
  FileViewerTextEncoding as HeadlessEncoding
} from '../../../packages/core/src/headless'
import type {
  FileViewerOptions as BrowserOptions,
  FileViewerTextOptions as BrowserTextOptions,
  FileViewerSingleByteTextEncoding as BrowserSingleByte,
  FileViewerTextEncoding as BrowserEncoding
} from '../../../packages/core/src/browser'
import type {
  FileViewerTextOptions as ContractTextOptions,
  FileViewerSpreadsheetOptions
} from '../../../packages/core/src/contracts/types'
import type {
  FileViewerSingleByteTextEncoding as SourceSingleByte,
  FileViewerTextEncoding as SourceEncoding
} from '../../../packages/core/src/source'

const singleByte = [
  'iso-8859-1', 'iso-8859-2', 'iso-8859-15',
  'windows-1250', 'windows-1251', 'windows-1252'
] as const satisfies readonly (RootSingleByte & HeadlessSingleByte & BrowserSingleByte & SourceSingleByte)[]

for (const encoding of singleByte) {
  const text = { encoding, fallbackEncoding: encoding } satisfies RootTextOptions & HeadlessTextOptions & BrowserTextOptions & ContractTextOptions
  const options = { text } satisfies RootOptions & HeadlessOptions & BrowserOptions
  const label: RootEncoding & HeadlessEncoding & BrowserEncoding & SourceEncoding = encoding
  void [options, label]
}

const existingEncodings = ['auto', 'utf-8', 'utf-16le', 'utf-16be', 'gbk', 'gb18030'] as const
for (const encoding of existingEncodings) {
  const text = { encoding } satisfies RootTextOptions & HeadlessTextOptions & BrowserTextOptions & ContractTextOptions
  void text
}
for (const fallbackEncoding of ['utf-8', 'gbk', 'gb18030'] as const) {
  const text = { fallbackEncoding } satisfies RootTextOptions & HeadlessTextOptions & BrowserTextOptions & ContractTextOptions
  void text
}

// These errors must stay errors, so this suite detects accidental type widening.
// @ts-expect-error Unknown labels are not part of the declarative option contract.
const unknown: RootTextOptions = { encoding: 'arbitrary-charset' }
// @ts-expect-error Auto cannot recursively be used as its own fallback.
const recursive: HeadlessTextOptions = { fallbackEncoding: 'auto' }
// @ts-expect-error UTF-16 is detected before the fallback, not a fallback option.
const utf16: BrowserTextOptions = { fallbackEncoding: 'utf-16be' }
// @ts-expect-error CSV/TSV retain the independent spreadsheet encoding contract.
const spreadsheet: FileViewerSpreadsheetOptions = { textEncoding: 'windows-1252' }
void [unknown, recursive, utf16, spreadsheet]
