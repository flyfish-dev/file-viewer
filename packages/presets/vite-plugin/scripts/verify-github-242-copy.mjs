import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const directory = await mkdtemp(join(tmpdir(), 'file-viewer-pdf-assets-'))
const originalCwd = process.cwd()
const originalWarn = console.warn
try {
  for (const mode of ['missing-font', 'valid-font', 'partial-standard-font', 'broken-font', 'missing-worker']) {
    const root = join(directory, mode)
    async function file(name, content) {
      const path = join(root, name)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
    }
    await file('package.json', JSON.stringify({ type: 'module', dependencies: { '@file-viewer/renderer-pdf': '1.0.0' } }))
    await file('node_modules/@file-viewer/renderer-pdf/package.json', JSON.stringify({ name: '@file-viewer/renderer-pdf', version: '1.0.0', main: 'index.js', dependencies: { 'pdfjs-dist': '1.0.0', '@fontsource-variable/noto-sans-sc': '1.0.0' } }))
    await file('node_modules/@file-viewer/renderer-pdf/index.js', 'export {}')
    await file('node_modules/pdfjs-dist/package.json', JSON.stringify({ name: 'pdfjs-dist', version: '1.0.0', main: 'index.js' }))
    await file('node_modules/pdfjs-dist/index.js', 'export {}')
    for (const path of ['cmaps/test.bcmap', 'wasm/test.wasm', 'standard_fonts/test.pfb', ...(mode === 'missing-worker' ? [] : ['legacy/build/pdf.worker.mjs'])]) {
      await file(`node_modules/pdfjs-dist/${path}`, `fixture:${path}`)
    }
    if (mode === 'valid-font' || mode === 'partial-standard-font' || mode === 'broken-font') {
      await file('node_modules/@fontsource-variable/noto-sans-sc/package.json', JSON.stringify({ name: '@fontsource-variable/noto-sans-sc', version: '1.0.0', main: 'wght.css' }))
      await file('node_modules/@fontsource-variable/noto-sans-sc/wght.css', '@font-face{font-family:Fixture;src:url(./files/font.woff2)}')
      await file('node_modules/@fontsource-variable/noto-sans-sc/files/font.woff2', 'synthetic-font-bytes')
      if (mode === 'valid-font' || mode === 'partial-standard-font') await file('node_modules/@fontsource-variable/noto-sans-sc/LICENSE', 'synthetic-license-fixture')
    }
    if (mode === 'partial-standard-font') {
      await file('node_modules/@file-viewer/assets-standard/package.json', JSON.stringify({ name: '@file-viewer/assets-standard', version: '1.0.0' }))
      await file('node_modules/@file-viewer/assets-standard/viewer/vendor/pdf/fonts/noto-sans-sc.css', '@font-face{font-family:Incomplete;src:url(./files/font.woff2)}')
      await file('node_modules/@file-viewer/assets-standard/viewer/vendor/pdf/fonts/files/font.woff2', 'incomplete-standard-font-bytes')
    }
    // Copy the production plugin itself outside the monorepo. Neither module
    // resolution nor process.cwd() can fall back to a workspace-owned font.
    const isolatedPlugin = join(root, 'plugin.mjs')
    await copyFile(join(packageDir, 'dist/index.js'), isolatedPlugin)
    process.chdir(root)
    const { fileViewerRenderers } = await import(pathToFileURL(isolatedPlugin).href)
    const plugin = fileViewerRenderers({ formats: ['pdf'], preset: false, scan: false, copyAssets: { mode: 'build', baseDir: 'assets' } })
    plugin.configResolved({ root, publicDir: join(root, 'public'), base: '/', build: { outDir: 'dist' } })
    const warnings = []
    console.warn = (...args) => warnings.push(args.join(' '))
    if (mode === 'missing-font' || mode === 'broken-font' || mode === 'missing-worker') {
      await assert.rejects(
        plugin.closeBundle(),
        mode === 'missing-worker'
          ? /pdf-worker/
          : /pdf-cjk-font-fallback[\s\S]*repair @file-viewer\/renderer-pdf/
      )
    } else {
      await plugin.closeBundle()
      assert.equal(await readFile(join(root, 'dist/assets/vendor/pdf/pdf.worker.mjs'), 'utf8'), 'fixture:legacy/build/pdf.worker.mjs')
      assert.equal(warnings.length, 0)
      assert.equal(await readFile(join(root, 'dist/assets/vendor/pdf/fonts/files/font.woff2'), 'utf8'), 'synthetic-font-bytes')
      assert.equal(await readFile(join(root, 'dist/assets/vendor/pdf/fonts/OFL-1.1.txt'), 'utf8'), 'synthetic-license-fixture')
    }
    console.warn = originalWarn
    console.log(`[issue-242] isolated production copyAssets hook passed: ${mode}`)
  }
} finally {
  console.warn = originalWarn
  process.chdir(originalCwd)
  await rm(directory, { recursive: true, force: true })
}
