import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))

test('the opt-in package owns pdf-lib without changing the base renderer dependency boundary', async () => {
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
    await symlink(
      dirname(require.resolve('pdf-lib/package.json')),
      join(capability, 'node_modules/pdf-lib'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
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
      const { repairMalformedIdentityCjkFonts } = await import('@file-viewer/capability-pdf-identity-repair');
      const { getFileViewerPdfIdentityFontRepair } = await import('@file-viewer/renderer-pdf');
      assert.equal(getFileViewerPdfIdentityFontRepair(), repairMalformedIdentityCjkFonts);
      const bytes = new Uint8Array(await readFile('fixture.pdf'));
      const result = await repairMalformedIdentityCjkFonts(bytes);
      assert.equal(result.bytes, bytes);
      assert.equal(result.repairedFonts, 0);
    `
      ],
      { cwd: root, encoding: 'utf8', timeout: 10000 }
    )
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
