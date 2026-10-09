import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  controls, crossingFixture, encodings, paths, renderFixture, searchFixture,
  searchMatchCount, segmentationFixture, segmentBytes, validateFixtures
} from './single-byte-encodings/fixtures.mjs'

const workspace = fileURLToPath(new URL('../../../../', import.meta.url))
const demoRequire = createRequire(new URL('../../../../apps/viewer-demo/package.json', import.meta.url))
const artifacts = resolve(process.env.TEXT_ENCODING_ARTIFACTS || resolve(workspace, 'output/text-single-byte-encodings'))

validateFixtures()
if (process.argv.includes('--check-fixtures')) {
  console.log('Single-byte fixtures validated; no bundle or browser was run.')
} else {
  await runBrowsers()
}

async function runBrowsers() {
  const { build } = demoRequire('esbuild')
  const { outputFiles } = await build({
    entryPoints: [fileURLToPath(new URL('./single-byte-encodings/browser-entry.mjs', import.meta.url))],
    // Use the exact checkout's core and renderers, never stale dist output.
    alias: { '@file-viewer/core': resolve(workspace, 'packages/core/src/index.ts') },
    bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2022', logLevel: 'silent'
  })
  if (process.argv.includes('--check-bundle')) {
    console.log(`Single-byte fixtures and browser bundle validated (${outputFiles[0].contents.byteLength} bytes); no browser was imported or run and no browser evidence was written.`)
    return
  }
  const { chromium, webkit } = await import('playwright')
  const report = {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).trim(),
    bundleSha256: createHash('sha256').update(outputFiles[0].contents).digest('hex'),
    status: 'running', engines: []
  }
  if (artifacts) await mkdir(artifacts, { recursive: true })
  try {
    for (const [name, engine] of Object.entries({ chromium, webkit })) {
      const browser = await engine.launch({ headless: true })
      const result = { name, version: browser.version(), checks: [], errors: [], requests: [] }
      report.engines.push(result)
      let page
      try {
        page = await browser.newPage({ viewport: { width: 1100, height: 720 } })
        page.setDefaultTimeout(10_000)
        page.on('pageerror', error => result.errors.push(error.message))
        await page.route('**/*', route => {
          result.requests.push(route.request().url())
          return route.abort()
        })
        await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}#target{height:100%;width:100%;overflow:auto}</style></head><body><div id="target"></div></body></html>')
        await page.addScriptTag({ content: outputFiles[0].text })
        await page.waitForFunction(() => !!window.encodingHarness)
        const mount = (path, bytes, text) => page.evaluate(options => window.encodingHarness.mount(options), { path, bytes, text })

        for (const fixture of encodings) {
          for (const mode of ['explicit', 'fallback']) {
            const text = mode === 'explicit'
              ? { encoding: fixture.encoding, fallbackEncoding: 'gb18030' }
              : { encoding: 'auto', fallbackEncoding: fixture.encoding }
            for (const path of paths) {
              await assertRendered(page, mount, fixture, path, text)
              result.checks.push(`${fixture.encoding}/${mode}/${path}`)
              if (artifacts && path === 'largeText' && fixture.encoding === 'windows-1251' && mode === 'fallback') {
                await page.locator('#target').screenshot({ path: resolve(artifacts, `${name}-windows-1251-rendered.png`) })
              }
            }
          }
          await assertSegments(page, mount, fixture)
          result.checks.push(`${fixture.encoding}/64 consecutive 1024-byte segments`)
          await assertSearch(page, mount, fixture)
          result.checks.push(`${fixture.encoding}/200 exact byte offsets and next/previous navigation`)
          const crossing = crossingFixture(fixture)
          await mount('largeText', crossing.bytes, { fallbackEncoding: fixture.encoding })
          const crossingState = await page.evaluate(query => window.encodingHarness.provider().search(query), crossing.query)
          assert.equal(crossingState.total, 1, `${fixture.encoding}: a cross-chunk query must appear once`)
          assert.equal(crossingState.current.byteOffset, crossing.offset)
          result.checks.push(`${fixture.encoding}/query crossing 256 KiB search boundary`)
        }

        for (const fixture of controls) {
          for (const path of paths) {
            await assertRendered(page, mount, fixture, path, fixture.options ?? { fallbackEncoding: 'windows-1251' })
            result.checks.push(`${fixture.name}/${path}`)
          }
        }
        assert.deepEqual(await page.evaluate(() => window.encodingHarness.unmount()), { children: 0, search: false })
        assert.deepEqual(result.errors, [], `${name}: no unhandled browser errors`)
        assert.deepEqual(result.requests, [], `${name}: all rendering remains offline`)
        result.status = 'passed'
        console.log(`${name}: ${result.checks.length} text-encoding groups passed`)
      } catch (error) {
        result.status = 'failed'
        if (artifacts && page) await page.screenshot({ path: resolve(artifacts, `${name}-failure.png`), fullPage: true }).catch(() => {})
        throw error
      } finally {
        await browser.close()
      }
    }
    report.status = 'passed'
  } catch (error) {
    report.status = 'failed'
    report.error = error.stack || String(error)
    throw error
  } finally {
    if (artifacts) await writeFile(resolve(artifacts, 'CURRENT.json'), JSON.stringify(report, null, 2) + '\n')
  }
}

async function assertRendered(page, mount, fixture, path, text) {
  const { bytes, source } = renderFixture(path, fixture)
  const label = `${fixture.encoding ?? fixture.name}/${path}`
  const state = await mount(path, bytes, text)
  assert.equal(state.unchanged, true, `${label}: source bytes stay unchanged`)
  if (path === 'markdown') {
    assert.equal(state.markdown, fixture.text, label)
    assert.ok(await page.locator('.markdown-body pre code .hljs-keyword').count(), `${label}: Markdown code highlighting remains active`)
  } else if (path === 'html') {
    const paragraph = page.frameLocator('.html-preview-frame').locator('#encoded')
    await paragraph.waitFor({ state: 'visible' })
    assert.equal(await paragraph.textContent(), fixture.text, `${label}: sandboxed preview`)
    assert.equal(await page.locator('.html-preview-frame').getAttribute('sandbox'), '')
    await page.locator('button[data-html-view="source"]').click()
    await page.locator('.html-source-view code').waitFor({ state: 'visible' })
    assert.equal(await page.locator('.html-source-view code').textContent(), source, `${label}: source toggle`)
    await page.locator('button[data-html-view="preview"]').click()
    await paragraph.waitFor({ state: 'visible' })
    assert.equal(await paragraph.textContent(), fixture.text, `${label}: repeat preview`)
  } else if (path === 'patch') {
    assert.ok(state.patch.includes(fixture.text), `${label}: actual diff2html source cell`)
    assert.equal(await page.locator('.patch-fallback').count(), 0)
  } else if (path === 'lrc') {
    assert.deepEqual(state.lyrics, [fixture.text, 'second line'], `${label}: annotated lyrics`)
    assert.equal(await page.locator('.lrc-cue').first().getAttribute('data-time-ms'), '1000')
    await page.locator('button[data-lrc-mode="2"]').click()
    assert.equal(await page.locator('.lrc-source').textContent(), source, `${label}: exact lyrics source`)
    await page.locator('button[data-lrc-mode="1"]').click()
    assert.equal(await page.locator('.lrc-phrase').first().textContent(), fixture.text, `${label}: lyrics only`)
    await page.locator('button[data-lrc-mode="0"]').click()
    assert.equal(await page.locator('.lrc-phrase').first().textContent(), fixture.text, `${label}: repeat annotated view`)
  } else if (path === 'largeText' && !fixture.utf16) {
    assert.equal(state.virtual, true, label)
    assert.equal(state.encoding, fixture.encoding ?? fixture.resolvedEncoding, `${label}: resolved encoding`)
    assert.deepEqual(state.rows, source.split('\n'), label)
  } else {
    assert.equal(state.source, source, label)
    assert.equal(state.virtual, false, `${label}: UTF-16 stays on the regular renderer`)
  }
  if (path === 'xml') assert.deepEqual(state.diagnostics, ['no-match'], `${label}: decoded XML parses without an engine`)
}

async function assertSegments(page, mount, fixture) {
  const { bytes, text } = segmentationFixture(fixture.encoding)
  await mount('largeText', bytes, { fallbackEncoding: fixture.encoding })
  const content = page.locator('.code-virtual-content')
  const label = page.locator('.code-line-segments > span')
  let reassembled = ''
  for (let index = 0; index < 64; index++) {
    assert.equal(await label.textContent(), `${index + 1}/64`)
    const visible = await content.textContent()
    assert.equal(visible, text.slice(index * segmentBytes, (index + 1) * segmentBytes), `${fixture.encoding}: segment ${index + 1} starts with byte 0x${(0x80 + index).toString(16)}`)
    reassembled += visible
    if (index < 63) await page.locator('[data-segment-action="next"]').click()
  }
  assert.equal(reassembled, text, `${fixture.encoding}: no boundary byte is omitted or repeated`)
  assert.equal(await page.locator('[data-segment-action="next"]').isDisabled(), true)
  await page.locator('[data-segment-action="first"]').click()
  assert.equal(await content.textContent(), text.slice(0, segmentBytes))
  assert.equal(await page.locator('[data-segment-action="previous"]').isDisabled(), true)
  await page.locator('[data-segment-action="last"]').click()
  await page.locator('[data-segment-action="previous"]').click()
  assert.equal(await content.textContent(), text.slice(62 * segmentBytes, 63 * segmentBytes))
}

async function assertSearch(page, mount, fixture) {
  const { bytes, query, offsets, expectedSegment } = searchFixture(fixture)
  await mount('largeText', bytes, { fallbackEncoding: fixture.encoding })
  const state = await page.evaluate(query => window.encodingHarness.provider().search(query, { maxMatches: 500 }), query)
  assert.equal(state.total, searchMatchCount, `${fixture.encoding}: exactly 200 search matches`)
  assert.deepEqual(state.matches.map(match => match.byteOffset), offsets, `${fixture.encoding}: exact source byte offsets`)
  assert.deepEqual(state.matches.map(match => match.line), Array.from({ length: searchMatchCount }, (_, index) => index + 1))
  const navigation = await page.evaluate(async ({ count, expectedSegment }) => {
    const harness = window.encodingHarness
    const provider = harness.provider()
    const visits = []
    for (let index = 0; index < count; index++) {
      const state = index ? await provider.next() : provider.getState()
      const active = harness.active()
      visits.push({
        index: state.currentIndex, byteOffset: state.current.byteOffset, line: active.line,
        segment: active.segment, textMatches: active.text === expectedSegment,
        marked: active.marked, visible: active.visible
      })
    }
    return { visits, wrappedNext: (await provider.next()).currentIndex, wrappedPrevious: (await provider.previous()).currentIndex }
  }, { count: searchMatchCount, expectedSegment })
  for (const [index, visit] of navigation.visits.entries()) {
    assert.deepEqual(visit, {
      index, byteOffset: offsets[index], line: index + 1, segment: '3/4',
      textMatches: true, marked: [query], visible: true
    }, `${fixture.encoding}: navigation ${index + 1} selects the exact byte segment and visible match`)
  }
  assert.equal(navigation.wrappedNext, 0)
  assert.equal(navigation.wrappedPrevious, searchMatchCount - 1)
  const cleared = await page.evaluate(() => window.encodingHarness.provider().clear())
  assert.equal(cleared.total, 0)
  assert.equal(await page.locator('.code-virtual-line--match,mark').count(), 0)
}
