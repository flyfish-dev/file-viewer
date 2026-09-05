#!/usr/bin/env node
// Issue #242: a project that installed 3.0.0 could not finish `vite build`.
//
// `@fontsource-variable/noto-sans-sc` was a runtime dependency of `@file-viewer/renderer-pdf`
// in 2.4, and that is how an installed app resolved a font source, so the required-asset check that
// vite-plugin has applied to pdf assets since 2.4 passed. 3.0.0 moved the font to devDependencies,
// leaving no source for `pdf-cjk-font-fallback` in an installed app, and `copyAssets` then aborted
// `vite build` on that missing required asset, which is why rolling the version back looked like the fix.
//
// 3.0.1 moved font ownership onto the presets that activate the pdf renderer, and made the asset
// optional so a genuinely missing font is a warning instead of a build failure. These are the
// three structural contracts that must stay true. The behavioural copyAssets path is covered by
// the deeper private gate scripts/verify-vite-plugin-auto-scan.mjs.
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(packageDir, '../../..')
const presetsRoot = join(sourceRoot, 'packages', 'presets')
export const pdfRendererPackageName = '@file-viewer/renderer-pdf'
export const pdfCjkFontPackageName = '@fontsource-variable/noto-sans-sc'
// Either source gives copyAssets a PDF CJK fallback font to self-host.
export const pdfCjkFontSourcePackages = ['@file-viewer/assets-standard', pdfCjkFontPackageName]

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

// Presets that turn on the pdf renderer without a font source are the #242 regression.
export async function findPresetsMissingPdfCjkFontSource() {
  const missing = []
  for (const { dir, packageJson } of await readPresetPackages()) {
    const dependencies = packageJson.dependencies || {}
    if (!dependencies[pdfRendererPackageName]) {
      continue
    }
    if (!pdfCjkFontSourcePackages.some((name) => dependencies[name])) {
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
    `[issue-242] these presets activate ${pdfRendererPackageName} without a PDF CJK fallback font ` +
      `source: ${missing.join(', ')}. Declare ${pdfCjkFontSourcePackages.join(' or ')} so ` +
      `copyAssets can self-host the font for an installed app.`
  )

  // renderer-pdf must not take the font back: that is what put it out of reach of the app.
  const rendererPdfJson = JSON.parse(
    await readFile(join(sourceRoot, 'packages', 'renderers', 'pdf', 'package.json'), 'utf8')
  )
  const rendererSelfOwnedFonts = Object.keys(rendererPdfJson.dependencies || {}).filter((name) =>
    /fontsource|noto/i.test(name)
  )
  assert(
    rendererSelfOwnedFonts.length === 0,
    `[issue-242] ${pdfRendererPackageName} must not declare its own font dependencies, found ` +
      `${rendererSelfOwnedFonts.join(', ')}. A font under the renderer is invisible to an ` +
      `installed app and re-creates the missing-asset build failure.`
  )

  // A missing optional asset has to stay optional, or a preset without a font breaks the build.
  const pluginSource = await readFile(join(packageDir, 'src', 'index.ts'), 'utf8')
  const start = pluginSource.indexOf(`'pdf-cjk-font-fallback'`)
  assert(start >= 0, `[issue-242] the pdf-cjk-font-fallback asset copy disappeared from the plugin`)
  const end = pluginSource.indexOf(`'pptx-worker'`, start)
  assert(end > start, `[issue-242] cannot bound the pdf-cjk-font-fallback copy block`)
  const block = pluginSource.slice(start, end)
  assert(
    /pdfCjkFontSourceAvailable \? undefined : false/.test(block),
    `[issue-242] pdf-cjk-font-fallback must stay an optional asset: the copy call has to pass ` +
      `the required flag as \`pdfCjkFontSourceAvailable ? undefined : false\` so an installed ` +
      `app without a font source gets a warning instead of a failed vite build.`
  )
  assert(
    !/\bthrow\b/.test(block),
    `[issue-242] pdf-cjk-font-fallback must not throw when the font source is absent.`
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
      `(${result.checkedPresets.join(', ')}) each declare a CJK font source, ` +
      `${pdfRendererPackageName} declares none, and the asset stays optional.`
  )
}
