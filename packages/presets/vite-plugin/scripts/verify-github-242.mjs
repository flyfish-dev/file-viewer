#!/usr/bin/env node
// Issue #242: a project that installed 3.0.0 could not finish `vite build`.
//
// `@fontsource-variable/noto-sans-sc` was a runtime dependency of `@file-viewer/renderer-pdf`
// in 2.4, and that is how an installed app resolved a font source, so the required-asset check that
// vite-plugin has applied to pdf assets since 2.4 passed. 3.0.0 moved the font to devDependencies,
// leaving no source for `pdf-cjk-font-fallback` in an installed app, and `copyAssets` then aborted
// `vite build` on that missing required asset, which is why rolling the version back looked like the fix.
//
// The renderer now owns the runtime font dependency again. A missing font is an incomplete
// installation, not an optional capability, so copyAssets must fail with an actionable error
// instead of silently dropping CJK fallback support. verify-github-242-copy.mjs also runs the
// production copyAssets hook with no workspace fallback, in public CI and private checks.
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(packageDir, '../../..')
const presetsRoot = join(sourceRoot, 'packages', 'presets')
export const pdfRendererPackageName = '@file-viewer/renderer-pdf'
export const pdfCjkFontPackageName = '@fontsource-variable/noto-sans-sc'
export const pdfCjkFontSourcePackages = [pdfCjkFontPackageName]

async function readRendererPdfPackage() {
  return JSON.parse(
    await readFile(join(sourceRoot, 'packages', 'renderers', 'pdf', 'package.json'), 'utf8')
  )
}

async function readPresetPackages() {
  const entries = await readdir(presetsRoot, { withFileTypes: true })
  const presets = []
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    try {
      const packageJson = JSON.parse(
        await readFile(join(presetsRoot, entry.name, 'package.json'), 'utf8')
      )
      presets.push({ dir: entry.name, packageJson })
    } catch {
      // packages/presets/vite-plugin and any future tooling dir are not presets.
    }
  }
  return presets.sort((left, right) => left.dir.localeCompare(right.dir))
}

// Every PDF preset reaches the renderer-owned font dependency transitively.
export async function findPresetsMissingPdfCjkFontSource() {
  const rendererPdfJson = await readRendererPdfPackage()
  const rendererOwnsFont = Boolean(
    (rendererPdfJson.dependencies || {})[pdfCjkFontPackageName]
  )
  const missing = []
  for (const { dir, packageJson } of await readPresetPackages()) {
    const dependencies = packageJson.dependencies || {}
    if (!dependencies[pdfRendererPackageName]) {
      continue
    }
    if (!rendererOwnsFont) {
      missing.push(packageJson.name || dir)
    }
  }
  return missing
}

export async function verifyGithub242() {
  const presets = await readPresetPackages()
  const pdfPresets = presets.filter(
    ({ packageJson }) => (packageJson.dependencies || {})[pdfRendererPackageName]
  )
  assert(
    pdfPresets.length >= 3,
    `[issue-242] expected the pdf renderer to be active in several presets, found ` +
      `${pdfPresets.length}. A preset set that no longer includes the pdf renderer makes this ` +
      `gate vacuous, so it has to be rewritten together with the profiles.`
  )

  const missing = await findPresetsMissingPdfCjkFontSource()
  assert(
    missing.length === 0,
    `[issue-242] these presets activate ${pdfRendererPackageName}, but its runtime dependency ` +
      `${pdfCjkFontPackageName} is missing: ${missing.join(', ')}. Direct renderer installs ` +
      `must provide the CJK fallback source for copyAssets.`
  )

  const rendererPdfJson = await readRendererPdfPackage()
  assert.equal(
    (rendererPdfJson.dependencies || {})[pdfCjkFontPackageName],
    '5.3.0',
    `[issue-242] ${pdfRendererPackageName} must keep ${pdfCjkFontPackageName} as its runtime ` +
      `dependency so direct installs can self-host the CJK fallback.`
  )

  const pluginSource = await readFile(join(packageDir, 'src', 'index.ts'), 'utf8')
  const start = pluginSource.indexOf(`'pdf-cjk-font-fallback'`)
  assert(start >= 0, `[issue-242] the pdf-cjk-font-fallback asset copy disappeared from the plugin`)
  const end = pluginSource.indexOf(`'pptx-worker'`, start)
  assert(end > start, `[issue-242] cannot bound the pdf-cjk-font-fallback copy block`)
  const block = pluginSource.slice(start, end)
  assert(
    !/pdfCjkFontSourceAvailable\s*\?\s*undefined\s*:\s*false/.test(block),
    `[issue-242] pdf-cjk-font-fallback must remain required. An incomplete renderer install ` +
      `must fail instead of silently removing CJK fallback support.`
  )
  assert(
    /\n\s*true\n\s*\)/.test(block),
    `[issue-242] pdf-cjk-font-fallback must explicitly remain a required asset.`
  )

  return {
    checkedPresets: pdfPresets.map(({ packageJson }) => packageJson.name),
    fontSources: pdfCjkFontSourcePackages
  }
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
if (invokedDirectly) {
  const result = await verifyGithub242()
  console.log(
    `[vite-plugin] issue #242 gate: ${result.checkedPresets.length} pdf presets ` +
      `(${result.checkedPresets.join(', ')}) each reach the CJK font source transitively, ` +
      `${pdfRendererPackageName} owns ${pdfCjkFontPackageName}, and the asset stays required.`
  )
}
