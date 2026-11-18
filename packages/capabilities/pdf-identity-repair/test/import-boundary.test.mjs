import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))

const javascriptFiles = async (directory, prefix = '') => {
  const files = []
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await javascriptFiles(directory, path))
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path)
  }
  return files.sort()
}

test('the opt-in repair is self-contained without changing the base renderer dependency boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fv-pdf-capability-owner-'))
  try {
    const core = join(root, 'node_modules/@file-viewer/core')
    const renderer = join(root, 'node_modules/@file-viewer/renderer-pdf')
    const capability = join(root, 'node_modules/@file-viewer/capability-pdf-identity-repair')
    await mkdir(core, { recursive: true })
    await mkdir(renderer, { recursive: true })
    await mkdir(join(capability, 'node_modules'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await writeFile(
      join(core, 'package.json'),
      '{"name":"@file-viewer/core","type":"module","exports":"./index.js"}'
    )
    // Use the real host registration implementation without giving the fixture
    // any optional parser dependencies.
    await cp(
      join(dirname(require.resolve('@file-viewer/core/package.json')), 'dist/features/document/inspection.js'),
      join(core, 'index.js')
    )
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
      '{"name":"@file-viewer/capability-pdf-identity-repair","type":"module","exports":"./dist/index.js"}'
    )
    await cp(join(packageDir, 'dist'), join(capability, 'dist'), { recursive: true })
    for (const path of await javascriptFiles(join(capability, 'dist'))) {
      if (path === 'index.js') continue
      const destination = join(capability, 'dist', path)
      const original = await readFile(destination, 'utf8')
      await writeFile(destination,
        `globalThis.__fileViewerPdfParserLoads.push(${JSON.stringify(path)});\n${original}`)
    }
    const moduleOutputs = JSON.parse(await readFile(
      join(packageDir, '.build/pdf-identity-repair-outputs.json'), 'utf8'))
    const parserModules = Object.entries(moduleOutputs)
      .filter(([path, output]) => path !== 'dist/index.js' && Object.keys(output.inputs).length > 0)
      .map(([path]) => path.slice('dist/'.length))
    assert.ok(parserModules.length > 0, 'The real split build must identify its parser modules')
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
      globalThis.__fileViewerPdfParserLoads = [];
      const { repairMalformedIdentityCjkFonts } = await import('@file-viewer/capability-pdf-identity-repair');
      const { getFileViewerPdfIdentityFontRepair } = await import('@file-viewer/renderer-pdf');
      assert.equal(getFileViewerPdfIdentityFontRepair(), repairMalformedIdentityCjkFonts);
      assert.equal(typeof globalThis[Symbol.for('file-viewer.document-inspection.v1')].pdfReader, 'function');
      const parserModules = ${JSON.stringify(parserModules)};
      const loadedAtImport = [...globalThis.__fileViewerPdfParserLoads];
      assert.deepEqual(loadedAtImport.filter(path => parserModules.includes(path)), [], 'Import and registration must not load parser modules');
      const bytes = new Uint8Array(await readFile('fixture.pdf'));
      const result = await repairMalformedIdentityCjkFonts(bytes);
      assert.equal(result.bytes, bytes);
      assert.equal(result.repairedFonts, 0);
      assert.ok(globalThis.__fileViewerPdfParserLoads.some(path => parserModules.includes(path)), 'The real repair call must load its parser');
      const loadedAfterRepair = globalThis.__fileViewerPdfParserLoads.length;
      const repairLoads = [...globalThis.__fileViewerPdfParserLoads];
      const inspection = globalThis[Symbol.for('file-viewer.document-inspection.v1')];
      assert.equal(typeof inspection.pdfReader, 'function');
      const metadata = await inspection.pdfReader(bytes, new AbortController().signal);
      assert.deepEqual(metadata.signatures, []);
      assert.ok(globalThis.__fileViewerPdfParserLoads.length > loadedAfterRepair, 'The real metadata call must load its parser');
      console.log(JSON.stringify({ kind: 'actual-split-parser-module-load-phases', parserModules,
        import: loadedAtImport, repair: repairLoads, metadata: globalThis.__fileViewerPdfParserLoads }));
    `
      ],
      { cwd: root, encoding: 'utf8', timeout: 10000 }
    )
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout)
    console.log(result.stdout.trim())
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
  assert.equal(inventory.packages.some((item) => item.name === '@file-viewer/core'), false,
    'The optional parser must share host Core instead of embedding another Core dependency graph')
  assert.equal(inventory.files.some((item) =>
    item.owner.startsWith('@file-viewer/core@') || item.path.startsWith('packages/core/')), false,
    'Host Core modules must remain outside the optional parser input inventory')
  const receipt = JSON.parse(await readFile(join(packageDir, 'dist/prebundled-notices.json'), 'utf8'))
  assert.deepEqual(Object.keys(receipt.runtimeFiles).sort(),
    (await javascriptFiles(join(packageDir, 'dist'))).map(path => `dist/${path}`),
    'The receipt must bind every shipped JavaScript chunk')
})
