import { createHash } from 'node:crypto'
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isolatePdfJsWebpackRuntime,
  pdfJsRuntimeIsolationTransform,
  pdfJsRuntimeModificationNotice,
} from './pdfjs-runtime-transform.mjs'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pdfJsRoot = resolve(packageDir, 'node_modules/pdfjs-dist')
const vendorRoot = resolve(packageDir, 'dist/vendor/pdfjs')
const legacyFontVendorRoot = resolve(packageDir, 'dist/vendor/noto-sans-sc')
const provenancePath = resolve(vendorRoot, 'provenance.json')
const outputPath = resolve(packageDir, 'dist/pdf.js')
const expectedVersion = '5.4.624'
const checkOnly = process.argv.includes('--check')

const runtimeFiles = [
  ['legacy/build/pdf.mjs', 'legacy/build/pdf.mjs'],
  ['legacy/build/pdf.worker.mjs', 'legacy/build/pdf.worker.mjs'],
  ['legacy/web/pdf_viewer.mjs', 'legacy/web/pdf_viewer.mjs'],
]
const assetDirectories = ['cmaps', 'wasm', 'standard_fonts']
const requiredAssetFiles = [
  'cmaps/UniGB-UCS2-H.bcmap',
  'cmaps/Adobe-GB1-UCS2.bcmap',
  'wasm/jbig2.wasm',
  'wasm/openjpeg.wasm',
  'wasm/qcms_bg.wasm',
  'standard_fonts/FoxitFixed.pfb',
]

const sha256 = value => createHash('sha256').update(value).digest('hex')
const readBuffer = path => readFile(path)
const exists = async path => access(path).then(() => true, () => false)
const packageJson = JSON.parse(await readFile(resolve(pdfJsRoot, 'package.json'), 'utf8'))
if (packageJson.version !== expectedVersion) {
  throw new Error(`PDF.js runtime version drifted: expected ${expectedVersion}, found ${packageJson.version}`)
}

const assertOutputImports = async () => {
  const output = await readFile(outputPath, 'utf8')
  if (output.includes("'pdfjs-dist/legacy/") || output.includes('"pdfjs-dist/legacy/')) {
    throw new Error('PDF renderer still imports PDF.js from a package dependency.')
  }
  for (const [, target] of runtimeFiles) {
    const importPath = `./vendor/pdfjs/${target}`
    if (!output.includes(importPath)) {
      throw new Error(`PDF renderer is missing staged runtime import ${importPath}`)
    }
  }
}

const verify = async () => {
  const provenance = JSON.parse(await readFile(provenancePath, 'utf8'))
  if (provenance.schemaVersion !== 3 || provenance.runtimeTransform !== pdfJsRuntimeIsolationTransform) {
    throw new Error('PDF.js provenance is missing the webpack 4 runtime isolation transform.')
  }
  if (provenance.packageName !== 'pdfjs-dist' || provenance.version !== expectedVersion) {
    throw new Error('PDF.js provenance package/version does not match the pinned runtime.')
  }
  if (JSON.stringify(provenance.assetDirectories) !== JSON.stringify(assetDirectories)) {
    throw new Error('PDF.js staged asset provenance does not match the pinned offline payload.')
  }
  if (!Array.isArray(provenance.runtimeFiles) || provenance.runtimeFiles.length !== runtimeFiles.length) {
    throw new Error('PDF.js provenance must cover the three staged browser runtime files.')
  }
  for (const [, target] of runtimeFiles) {
    const record = provenance.runtimeFiles.find(entry => entry.path === target)
    if (!record) throw new Error(`PDF.js provenance is missing ${target}`)
    const content = await readBuffer(resolve(vendorRoot, target))
    const source = await readBuffer(resolve(pdfJsRoot, target))
    if (
      record.sourceSha256 !== sha256(source) ||
      record.sourceSize !== source.byteLength ||
      !Number.isInteger(record.runtimeBindingReplacements) ||
      record.runtimeBindingReplacements < 1 ||
      record.sha256 !== sha256(content) ||
      record.size !== content.byteLength
    ) {
      throw new Error(`PDF.js staged runtime hash mismatch: ${target}`)
    }
    if (/\b__webpack_(modules|module_cache|exports|require)__\b/.test(content.toString('utf8'))) {
      throw new Error(`PDF.js staged runtime was not isolated for webpack 4: ${target}`)
    }
    if (!content.toString('utf8').startsWith(pdfJsRuntimeModificationNotice)) {
      throw new Error(`PDF.js staged runtime is missing its modification notice: ${target}`)
    }
  }
  for (const record of [provenance.license, provenance.notice]) {
    if (!record?.path || !record.sha256) throw new Error('PDF.js provenance is missing license or notice metadata.')
    const content = await readBuffer(resolve(vendorRoot, record.path))
    if (record.sha256 !== sha256(content) || record.size !== content.byteLength) {
      throw new Error(`PDF.js staged notice hash mismatch: ${record.path}`)
    }
  }
  for (const path of requiredAssetFiles) {
    if (!await exists(resolve(vendorRoot, path))) {
      throw new Error(`PDF.js staged asset is missing: ${path}`)
    }
  }
  if (await exists(legacyFontVendorRoot)) {
    throw new Error('PDF renderer must not duplicate the standard profile CJK font payload.')
  }
  await assertOutputImports()
  console.log(`[renderer-pdf] verified PDF.js ${expectedVersion} browser runtime provenance`)
}

if (checkOnly) {
  await verify()
} else {
  await mkdir(vendorRoot, { recursive: true })
  await rm(legacyFontVendorRoot, { recursive: true, force: true })
  const provenance = {
    schemaVersion: 3,
    packageName: 'pdfjs-dist',
    version: expectedVersion,
    sourceRepository: 'https://github.com/mozilla/pdf.js',
    licenseSpdx: 'Apache-2.0',
    runtimeTransform: pdfJsRuntimeIsolationTransform,
    runtimeFiles: [],
    assetDirectories,
  }

  for (const [source, target] of runtimeFiles) {
    const targetPath = resolve(vendorRoot, target)
    await mkdir(dirname(targetPath), { recursive: true })
    const sourceContent = await readBuffer(resolve(pdfJsRoot, source))
    const transformed = isolatePdfJsWebpackRuntime(sourceContent.toString('utf8'))
    if (transformed.replacements < 1) {
      throw new Error(`PDF.js runtime did not contain the expected webpack bindings: ${source}`)
    }
    await writeFile(targetPath, transformed.output, 'utf8')
    const content = await readBuffer(targetPath)
    provenance.runtimeFiles.push({
      path: target,
      sourceSize: sourceContent.byteLength,
      sourceSha256: sha256(sourceContent),
      runtimeBindingReplacements: transformed.replacements,
      size: content.byteLength,
      sha256: sha256(content),
    })
  }

  for (const directory of assetDirectories) {
    await cp(resolve(pdfJsRoot, directory), resolve(vendorRoot, directory), {
      recursive: true,
      force: true,
    })
  }
  const licenseTarget = resolve(vendorRoot, 'LICENSE')
  await cp(resolve(pdfJsRoot, 'LICENSE'), licenseTarget)
  const licenseContent = await readBuffer(licenseTarget)
  provenance.license = {
    path: 'LICENSE',
    source: 'LICENSE',
    size: licenseContent.byteLength,
    sha256: sha256(licenseContent),
  }

  const upstreamNotice = ['NOTICE', 'NOTICE.txt'].map(name => resolve(pdfJsRoot, name))
  let noticeSource = null
  for (const candidate of upstreamNotice) {
    if (await exists(candidate)) {
      noticeSource = candidate
      break
    }
  }
  const noticeTarget = resolve(vendorRoot, 'NOTICE')
  if (noticeSource) {
    await cp(noticeSource, noticeTarget)
  } else {
    await writeFile(
      noticeTarget,
      `PDF.js browser runtime\n\nPackage: pdfjs-dist@${expectedVersion}\nSource: https://github.com/mozilla/pdf.js\nLicense: Apache-2.0 (see LICENSE)\n\nThe upstream npm package does not contain a standalone NOTICE file.\n`,
      'utf8',
    )
  }
  const noticeContent = await readBuffer(noticeTarget)
  provenance.notice = {
    path: 'NOTICE',
    upstreamPresent: Boolean(noticeSource),
    source: noticeSource ? relative(pdfJsRoot, noticeSource) : null,
    size: noticeContent.byteLength,
    sha256: sha256(noticeContent),
  }

  const output = await readFile(outputPath, 'utf8')
  const rewritten = output
    .replaceAll("'pdfjs-dist/legacy/build/pdf.mjs'", "'./vendor/pdfjs/legacy/build/pdf.mjs'")
    .replaceAll("'pdfjs-dist/legacy/build/pdf.worker.mjs'", "'./vendor/pdfjs/legacy/build/pdf.worker.mjs'")
    .replaceAll("'pdfjs-dist/legacy/web/pdf_viewer.mjs'", "'./vendor/pdfjs/legacy/web/pdf_viewer.mjs'")
  if (rewritten === output && !runtimeFiles.every(([, target]) => output.includes(`./vendor/pdfjs/${target}`))) {
    throw new Error('Could not isolate the PDF.js browser runtime imports.')
  }
  await writeFile(outputPath, rewritten, 'utf8')
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8')
  await verify()
}
