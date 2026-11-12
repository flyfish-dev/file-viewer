// Synthetic real CMS inputs for deep reading tests. Never uses production keys.
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '../../../../..')
const require = createRequire(path.join(root, 'packages/renderers/pdf/package.json'))
const { PDFDocument, StandardFonts } = require('pdf-lib')
const output = path.resolve(
  process.env.SIGNATURE_PANEL_FIXTURES || path.join(root, 'output/signature-panel-fixtures')
)
await mkdir(output, { recursive: true })
const pdf = await PDFDocument.create()
pdf.setCreationDate(new Date('2026-01-01T00:00:00Z'))
pdf.setModificationDate(new Date('2026-01-01T00:00:00Z'))
const font = await pdf.embedFont(StandardFonts.Helvetica)
for (let p = 1; p <= 12; p++) {
  const page = pdf.addPage([612, 792])
  for (let l = 1; l <= 32; l++)
    page.drawText(`SYNTHETIC PANEL TEST - PAGE ${p} - LINE ${l}`, {
      x: 35,
      y: 750 - l * 21,
      size: 12,
      font
    })
}
await writeFile(path.join(output, 'reading.pdf'), await pdf.save())
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<synthetic>\n' +
  Array.from(
    { length: 1200 },
    (_, n) =>
      `  <line id="${n + 1}">Synthetic reading line ${n + 1}: ${'A deliberately long readable XML field. '.repeat(5)}</line>`
  ).join('\n') +
  '\n</synthetic>\n'
await writeFile(path.join(output, 'reading.xml'), xml)
const temporary = await mkdtemp(path.join(tmpdir(), 'signature-panel-key-'))
await chmod(temporary, 0o700)
try {
  const key = path.join(temporary, 'ephemeral.pem'),
    cert = path.join(temporary, 'public.pem')
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      key,
      '-out',
      cert,
      '-subj',
      '/CN=Synthetic signature panel test only/OU=Long certificate text for narrow hosts without real identity',
      '-days',
      '3650'
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  await chmod(key, 0o600)
  for (const name of ['reading.pdf', 'reading.xml', 'reading.xml.p7m'])
    execFileSync(
      'openssl',
      [
        'cms',
        '-sign',
        '-binary',
        '-nodetach',
        '-in',
        path.join(output, name),
        '-signer',
        cert,
        '-inkey',
        key,
        '-outform',
        'DER',
        '-out',
        path.join(output, name + '.p7m')
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    )
  await writeFile(path.join(output, 'public-test-certificate.pem'), await readFile(cert))
} finally {
  await rm(temporary, { recursive: true, force: true })
}
const files = {}
for (const name of [
  'reading.pdf',
  'reading.xml',
  'reading.pdf.p7m',
  'reading.xml.p7m',
  'reading.xml.p7m.p7m',
  'public-test-certificate.pem'
]) {
  const bytes = await readFile(path.join(output, name))
  files[name] = {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')
  }
}
await writeFile(
  path.join(output, 'manifest.json'),
  JSON.stringify(
    {
      source:
        'Synthetic real-format PDF/XML CMS generated solely for panel reading tests; not customer originals',
      generator: 'generate-panel-fixtures.mjs',
      signing:
        'Ephemeral local RSA test key removed in finally; certificate untrusted; fresh runs create different signed bytes',
      openssl: execFileSync('openssl', ['version'], {
        encoding: 'utf8'
      }).trim(),
      files
    },
    null,
    2
  ) + '\n'
)
console.log(
  'Generated public synthetic PDF/XML CMS inputs and destroyed the temporary signing key.'
)
