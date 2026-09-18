# @file-viewer/renderer-email

Browser-native `.eml`, Outlook `.msg`, and `.mbox` preview with body/header switching, attachment download and nested attachment preview. No server conversion or runtime CDN is used.

## Usage

```ts
import { FileViewer } from '@file-viewer/vue3'
import { emailRenderer } from '@file-viewer/renderer-email'

const options = {
  builtinRenderers: 'none',
  renderers: emailRenderer,
}
```

Pass a real `File` named `message.msg`, or a URL with the original filename. The existing email route selects the MSG parser lazily; EML/MBOX do not import the MSG decoder.

For attachment previews, compose the corresponding PDF, image, Word and other renderers. The host supplies the standard `renderNestedBuffer` callback. Embedded Outlook messages are extracted as `.msg`, not renamed to text; original attachment bytes are retained for download.

### Rich-text Outlook messages

The full preset already includes the Word renderer and RTF capability:

```ts
import allRenderers from '@file-viewer/preset-all'
const options = { preset: allRenderers }
```

For a selective integration, install `@file-viewer/renderer-word` and `@file-viewer/capability-rtf` alongside the email renderer:

```ts
import { emailRenderer } from '@file-viewer/renderer-email'
import { wordRenderer } from '@file-viewer/renderer-word'
import '@file-viewer/capability-rtf'

const options = {
  builtinRenderers: 'none',
  renderers: [emailRenderer, wordRenderer],
}
```

Compressed RTF is decompressed locally. HTML-encapsulated RTF can supply an HTML body; ordinary rich RTF uses the existing RTF.js capability through the nested renderer contract. An email-only installation retains readable plain text with a notice when rich rendering is unavailable. Email RTF always blocks external resources and links, even when the host opts into them for other document types.

## Outlook MSG coverage

- Unicode and ANSI properties; Outlook codepages, Unicode `bodyHtml` and binary `html`, BOM and HTML charset handling.
- Subject, From, on-behalf-of Sender, separate To/Cc/Bcc, submission/delivery time, original transport headers and a clearly labeled metadata fallback for drafts.
- HTML, plain text and RTF body switching; tables, authored styles and local CID/Content-Location raster images.
- MIME-aware attachment names, lazy binary extraction, downloads and nested MSG preview. Unknown sizes are shown as unknown until extraction, not as zero bytes.
- Body uses the available height until an attachment opens. Closing an attachment restores body space and keyboard focus. Pending views and owned object URLs are cleaned up on replacement, cancellation and unmount.
- Simplified Chinese, English, Japanese and German notices follow the viewer locale. Narrow-host layout and light/dark presentation are supported.

EML/MBOX remain on `postal-mime`; MBOX still previews its first message and reports the count rather than implementing a mailbox browser.

## Privacy, limits and compatibility

Email HTML is read-only in an empty-sandbox iframe. Sanitization and a restrictive CSP block scripts, forms, embedded documents, local paths, external stylesheets, fonts, tracking images and remote resource requests. Only owned local image resources and raster image data URLs are allowed. External hyperlinks are not activated. This applies to EML/MBOX as well as MSG: emails that relied on remote images will no longer fetch them automatically. Normal origins use blob URLs; opaque-origin WebViews use bounded local data URLs for inline images.

Limits: 128 MiB MSG source/individual attachment, 32 MiB HTML or decompressed RTF, 32 MiB eagerly extracted inline images, 1,024 attachments and 4,096 recipients per message, 32,768 CFB directory entries and 24 storage levels. HTML additionally bounds node count and serialized/inline expansion. Malformed, cyclic, truncated or excessive input fails explicitly. These are defensive bounds, not a claim of a complete adversarial parser audit.

S/MIME/IRM decryption and signature verification are **not** implemented. Protected/signed message classes are identified with a notice; only available content is displayed. MSG contacts, tasks, appointments, OLE activation and every Outlook-specific MAPI property are not complete Outlook replacements. RTF fidelity is limited by the installed RTF capability. No claim of pixel-identical Outlook rendering is made without a matching real-file comparison.

## Verification

```sh
pnpm --filter @file-viewer/renderer-email verify:email
pnpm exec playwright install chromium
pnpm --filter @file-viewer/renderer-email verify:msg:browser
```

The existing root email regression gate invokes `verify:email`, preserving the EML #232 checks and adding the MSG tests. `test/msg.test.mjs` includes actual installed-MsgReader tests over generated CFB v3/v4, ANSI, Unicode, RTF and nested-message fixtures. Those integration cases are required by default; `MSG_UNIT_ONLY=1` is only an explicitly reported offline subset.

The browser gate uses the emitted production renderer and real Chromium with explicit Reader/RTF host API fixtures. It covers layout, sanitization, downloads, races and disposal, **not** installed-parser integration or RTF.js visual parity. It writes screenshots and a JSON report to `output/msg-browser/`. See [fixture provenance](test/fixtures/README.md).
