import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))

test('the opt-in repair is self-contained without changing the base renderer dependency boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fv-pdf-capability-owner-'))
  try {
    const renderer = join(root, 'node_modules/@file-viewer/renderer-pdf')
    const capability = join(root, 'node_modules/@file-viewer/capability-pdf-identity-repair')
    await mkdir(renderer, { recursive: true })
    await mkdir(join(capability, 'node_modules'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await writeFile(
      join(renderer, 'package.json'),
      '{"name":"@file-viewer/renderer-pdf","type":"module","exports":"./index.js"}'
    )
    await writeFile(
      join(renderer, 'index.js'),
      'let repair; export function registerFileViewerPdfIdentityFontRepair(value) { repair = value }; export function getFileViewerPdfIdentityFontRepair() { return repair }'
    )
    await writeFile(
      join(capability, 'package.json'),
      '{"name":"@file-viewer/capability-pdf-identity-repair","type":"module","exports":"./index.js"}'
    )
    await cp(join(packageDir, 'dist/index.js'), join(capability, 'index.js'))
    const { PDFDocument } = require('pdf-lib')
    const pdf = await PDFDocument.create()
    pdf.addPage().drawText('PDF capability import boundary')
    await writeFile(join(root, 'fixture.pdf'), await pdf.save())
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import assert from 'node:assert/strict';
      import { readFile } from 'node:fs/promises';
      import { createRequire } from 'node:module';
      const base = createRequire(process.cwd() + '/node_modules/@file-viewer/renderer-pdf/package.json');
      assert.throws(() => base.resolve('pdf-lib'), { code: 'MODULE_NOT_FOUND' });
      const capability = createRequire(process.cwd() + '/node_modules/@file-viewer/capability-pdf-identity-repair/package.json');
      assert.throws(() => capability.resolve('pdf-lib'), { code: 'MODULE_NOT_FOUND' });
      const { repairMalformedIdentityCjkFonts } = await import('@file-viewer/capability-pdf-identity-repair');
      const { getFileViewerPdfIdentityFontRepair } = await import('@file-viewer/renderer-pdf');
      assert.equal(getFileViewerPdfIdentityFontRepair(), repairMalformedIdentityCjkFonts);
      const bytes = new Uint8Array(await readFile('fixture.pdf'));
      const result = await repairMalformedIdentityCjkFonts(bytes);
      assert.equal(result.bytes, bytes);
      assert.equal(result.repairedFonts, 0);
      const inspection = globalThis[Symbol.for('file-viewer.document-inspection.v1')];
      assert.equal(typeof inspection.pdfReader, 'function');
      const metadata = await inspection.pdfReader(bytes, new AbortController().signal);
      assert.deepEqual(metadata.signatures, []);
    `
      ],
      { cwd: root, encoding: 'utf8', timeout: 10000 }
    )
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('the bundled repair retains all original upstream grants and a private input inventory', async () => {
  const notices = await readFile(
    join(packageDir, 'dist/pdf-identity-repair.THIRD_PARTY_LICENSES.txt'),
    'utf8'
  )
  assert.match(notices, /pdf-lib@1\.17\.1/)
  assert.match(notices, /Copyright \(c\) 2019 Andrew Dillon/)
  const inventory = JSON.parse(
    await readFile(join(packageDir, '.build/pdf-identity-repair-inputs.json'), 'utf8')
  )
  assert(inventory.packages.some((item) => item.name === 'pdf-lib' && item.version === '1.17.1'))
})
