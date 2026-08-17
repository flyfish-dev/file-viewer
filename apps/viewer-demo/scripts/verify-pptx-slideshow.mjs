import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { delimiter, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    const candidatePaths =
      process.env.PATH?.split(delimiter)
        .filter((pathEntry) => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
        .map((binDir) => resolve(binDir, '..'))
        .filter(existsSync) || []

    for (const candidatePath of candidatePaths) {
      try {
        const playwrightEntry = require.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(playwrightEntry).href)
      } catch {
        // Continue probing npm exec / npx injected package roots.
      }
    }

    throw new Error(
      'Missing playwright module. Run this harness through the package script.',
      { cause: error }
    )
  }
}

const playwrightModule = await importPlaywright()
const { chromium } = playwrightModule.chromium ? playwrightModule : playwrightModule.default

// Self-host the built demo so the script needs no external server and can run
// in CI. Build first: `pnpm build`, then `pnpm verify:pptx-slideshow`.
const DIST = fileURLToPath(new URL('../dist', import.meta.url))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') {
      pathname = '/index.html'
    }
    let filePath = join(DIST, normalize(pathname))
    if (!extname(pathname)) {
      filePath = join(DIST, `${pathname}.html`)
    }
    if (!filePath.startsWith(DIST + sep)) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    let body
    try {
      body = await readFile(filePath)
    } catch {
      // SPA fallback: unknown routes render the app shell.
      body = await readFile(join(DIST, 'index.html'))
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(body)
  } catch (error) {
    res.writeHead(500)
    res.end(String(error))
  }
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()
const BASE = `http://127.0.0.1:${port}`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))

const deep = sel => page.locator(sel).first()

// The viewer renders inside a shadow root, so plain document.querySelector misses everything.
const DEEP = `
  const deepAll = (selector, node = document, out = []) => {
    out.push(...node.querySelectorAll(selector));
    for (const el of node.querySelectorAll('*')) {
      if (el.shadowRoot) deepAll(selector, el.shadowRoot, out);
    }
    return out;
  };
  const deepOne = (selector) => deepAll(selector)[0] || null;
`

const readState = () => page.evaluate(`(() => {
  ${DEEP}
  const root = deepOne('.flyfish-pptx-presentation')
  const content = deepOne('.flyfish-pptx-content')
  const slots = Array.from(content?.querySelectorAll(':scope > .flyfish-pptx-slide-slot') || [])
  const visible = slots.filter(s => getComputedStyle(s).display !== 'none')
  return {
    overlay: Boolean(root),
    counter: root?.querySelector('.flyfish-pptx-presentation-counter')?.textContent || '',
    visibleSlides: visible.length,
    activeNumber: visible[0]?.dataset.slideNumber || '',
    presenting: content?.classList.contains('is-presenting') || false,
    transform: content instanceof HTMLElement ? content.style.transform : '',
    inOverlay: Boolean(root && content && root.contains(content)),
  }
})()`)

// ---------------------------------------------------------------------------
// Part 1: the demo app (renderer wrapper integration)
// ---------------------------------------------------------------------------
await page.goto(`${BASE}/?url=${encodeURIComponent('/example/ppt.pptx')}`, { waitUntil: 'load' })

await deep('.flyfish-pptx-slide-slot').waitFor({ state: 'attached', timeout: 60_000 })
await deep('.pptx-slideshow-button').waitFor({ state: 'visible', timeout: 60_000 })
console.log('1) deck rendered, slideshow button visible')

const slotCount = await page.locator('.flyfish-pptx-slide-slot').count()
assert.ok(slotCount > 1, `expected several slides, got ${slotCount}`)

// Shortcuts are scoped to a viewer the user has explicitly activated.
await deep('.pptx-render-surface').click({ position: { x: 8, y: 8 } })
await page.keyboard.press('F5')
await deep('.flyfish-pptx-presentation').waitFor({ state: 'visible', timeout: 10_000 })
console.log('2) F5 opened the slideshow overlay')

let state = await readState()
assert.equal(state.presenting, true, 'content should carry is-presenting')
assert.equal(state.visibleSlides, 1, `exactly one slide should be visible, got ${state.visibleSlides}`)
assert.equal(state.inOverlay, true, 'the scale box should have moved into the overlay')
assert.match(state.counter, /^1 \/ \d+$/, `unexpected counter ${state.counter}`)
assert.match(state.transform, /scale\(/, 'the active slide should be scaled to fit')
console.log(`3) one slide shown, counter "${state.counter}", scaled: ${state.transform}`)

await page.keyboard.press('ArrowRight')
await page.waitForTimeout(250)
state = await readState()
assert.equal(state.activeNumber, '2', `ArrowRight should advance, active=${state.activeNumber}`)
assert.equal(state.visibleSlides, 1, 'still exactly one slide after advancing')
console.log(`4) ArrowRight advanced to slide ${state.activeNumber} (${state.counter})`)

await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(250)
state = await readState()
assert.equal(state.activeNumber, '1', `ArrowLeft should go back, active=${state.activeNumber}`)
console.log('5) ArrowLeft went back to slide 1')

await page.mouse.click(1000, 400)
await page.waitForTimeout(250)
state = await readState()
assert.equal(state.activeNumber, '2', `right-side click should advance, active=${state.activeNumber}`)
await page.mouse.click(60, 400)
await page.waitForTimeout(250)
state = await readState()
assert.equal(state.activeNumber, '1', `left-edge click should go back, active=${state.activeNumber}`)
console.log('6) click navigation works in both directions')

await page.keyboard.press('End')
await page.waitForTimeout(300)
state = await readState()
const total = Number(state.counter.split('/')[1].trim())
assert.equal(Number(state.activeNumber), total, `End should jump to the last slide (${state.counter})`)
console.log(`7) End jumped to the last slide (${state.counter})`)

await page.keyboard.press('Escape')
await page.waitForTimeout(400)
state = await readState()
assert.equal(state.overlay, false, 'Escape should remove the overlay')
assert.equal(state.presenting, false, 'is-presenting should be cleared')
const restored = await page.evaluate(`(() => {
  ${DEEP}
  const surface = deepOne('.pptx-render-surface')
  const box = deepOne('.flyfish-pptx-scale-box')
  const slots = deepAll('.flyfish-pptx-slide-slot')
  return {
    backInSurface: Boolean(surface && box && surface.contains(box)),
    visible: slots.filter(s => getComputedStyle(s).display !== 'none').length,
  }
})()`)
assert.equal(restored.backInSurface, true, 'the scale box should return to the render surface')
assert.ok(restored.visible > 1, `all slides should be visible again, got ${restored.visible}`)
console.log(`8) Escape restored the scroll view (${restored.visible} slides visible again)`)

await page.keyboard.press('KeyP')
await deep('.flyfish-pptx-presentation').waitFor({ state: 'visible', timeout: 10_000 })
state = await readState()
assert.equal(state.visibleSlides, 1, 'second entry should show one slide')
console.log(`9) P re-entered the slideshow (${state.counter})`)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// ---------------------------------------------------------------------------
// Part 2: API-level harness (default/non-windowed, resize, two instances,
// shadow fullscreen, focusable controls, unmount cleanup, scroll/transform)
// ---------------------------------------------------------------------------
await page.goto(`${BASE}/slideshow-test.html`, { waitUntil: 'load' })
await page.waitForFunction(
  () => document.documentElement.dataset.slideshowTestReady === 'true',
  null,
  { timeout: 60_000 }
)

const call = (method, ...args) => page.evaluate(
  ({ method, args }) => window.__slideshowTest[method](...args),
  { method, args }
)
const waitOverlay = (count, timeout = 10_000) => page.waitForFunction(
  expected => window.__slideshowTest.overlayCount() === expected,
  count,
  { timeout }
)

// 10) default/non-windowed API: slideCount counts the deck, enter works, and
//     the active slide is a real rendered slide, not an empty slot marker.
const defaultCount = await call('slideCount', 'default')
assert.equal(defaultCount, 20, `default viewer should count 20 slides, got ${defaultCount}`)
await call('enter', 'default')
await waitOverlay(1)
assert.equal(await call('activeNumber', 'default'), 1, 'default viewer should start on slide 1')
assert.equal(await call('activeSlideHasContent', 'default'), true, 'active slide should have content')
assert.match(await call('counter', 'default'), /^1 \/ 20$/, 'counter should read 1 / 20')
assert.match(await call('transform', 'default'), /scale\(/, 'non-windowed slide should be scaled to fit')
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(250)
assert.equal(await call('activeNumber', 'default'), 2, 'non-windowed deck should navigate')
assert.equal(await call('activeSlideHasContent', 'default'), true, 'slide 2 should have content')
await call('exit', 'default')
await waitOverlay(0, 5_000)
console.log('10) default/non-windowed API: slideCount, enter, navigate, content, exit')

// 11) virtualization must not unmount the active slide during a presentation.
await call('enter', 'windowed', 20)
await waitOverlay(1)
assert.equal(await call('activeNumber', 'windowed'), 20, 'windowed viewer should jump to slide 20')
assert.equal(await call('activeSlideHasContent', 'windowed'), true, 'slide 20 should be rendered')
await page.setViewportSize({ width: 1000, height: 700 })
await page.waitForTimeout(400)
assert.equal(await call('activeNumber', 'windowed'), 20, 'active slide should survive a resize')
assert.equal(await call('activeSlideHasContent', 'windowed'), true, 'active slide should keep content after a resize')
await call('exit', 'windowed')
await waitOverlay(0, 5_000)
await page.setViewportSize({ width: 1280, height: 800 })
console.log('11) active slide keeps its content after a resize')

// 12) Host controls never activate a viewer shortcut. Once a viewer is
//     explicitly activated, one P opens exactly one overlay; with two overlays
//     open only the focused one advances.
await page.click('#unrelated-host-action')
await page.evaluate(() => {
  window.__hostShortcutPrevented = null
  document.addEventListener('keydown', event => {
    if (event.key === 'p' || event.key === 'P') {
      window.__hostShortcutPrevented = event.defaultPrevented
    }
  }, { once: true })
})
await page.keyboard.press('KeyP')
await page.waitForTimeout(250)
assert.equal(await call('overlayCount'), 0, 'P on an unrelated host control must not open a slideshow')
assert.equal(await page.evaluate(() => window.__hostShortcutPrevented), false, 'host P key must not be prevented')
await page.click('#renderer-b')
await page.keyboard.press('KeyP')
await waitOverlay(1)
console.log('12) host shortcut isolation and two-instance arbitration work')
await page.keyboard.press('KeyP')
await waitOverlay(0, 5_000)
await page.click('#renderer-a')
await page.keyboard.press('KeyP')
await waitOverlay(1)
await page.keyboard.press('KeyP')
await waitOverlay(0, 5_000)
await call('enter', 'default')
await call('enter', 'windowed', 1)
await waitOverlay(2)
const defaultBefore = await call('activeNumber', 'default')
const focusedBefore = await call('activeNumber', 'windowed')
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(250)
assert.equal(await call('activeNumber', 'windowed'), focusedBefore + 1, 'focused overlay should advance')
assert.equal(await call('activeNumber', 'default'), defaultBefore, 'unfocused overlay should stay put')
await call('exit', 'default')
await call('exit', 'windowed')
await waitOverlay(0, 5_000)

// 13) native fullscreen inside a shadow root: the browser's own exit closes the
//     overlay instead of leaving a fixed layer behind.
await page.click('#enter-shadow')
await page.waitForFunction(
  () => Boolean(window.__slideshowTest.fullscreenElementClass()),
  null,
  { timeout: 5_000 }
)
assert.equal(await call('overlayCount'), 1, 'shadow viewer should be presenting')
await page.waitForFunction(
  () => window.__slideshowTest.presentationIsVisible('shadow'),
  null,
  { timeout: 5_000 }
)
assert.equal(await call('presentationIsVisible', 'shadow'), true, 'shadow viewer should show its active slide')
await call('exitFullscreen')
await waitOverlay(0, 5_000)
console.log('13) shadow-root fullscreen shows the slide and browser exit closes the overlay')

// 14) Enter/Space on the focused exit button activates it, not the slide.
await call('enter', 'default')
await waitOverlay(1)
await call('focusExitButton', 'default')
await page.keyboard.press('Enter')
await waitOverlay(0, 5_000)
await call('enter', 'default')
await waitOverlay(1)
await call('focusExitButton', 'default')
await page.keyboard.press('Space')
await waitOverlay(0, 5_000)
console.log('14) Enter/Space on the exit button exits instead of advancing')

// 15) unmount/destroy while presenting cleans the overlay up.
await call('enter', 'windowed')
await waitOverlay(1)
await call('destroy', 'windowed')
await waitOverlay(0, 5_000)
await page.click('#renderer-a')
await page.keyboard.press('KeyP')
await waitOverlay(1)
await call('unmountRenderer', 'rendererA')
await waitOverlay(0, 5_000)
console.log('15) destroy/unmount while presenting removes the overlay')

// 16) exiting from a scrolled deck restores the exact scroll position and the
//     original scale transform.
await call('scrollTo', 600)
await page.waitForTimeout(100)
const beforeScroll = await call('scrollTop')
const beforeTransform = await call('transform', 'default')
assert.ok(beforeScroll >= 600, `expected the page to scroll to ~600, got ${beforeScroll}`)
await call('enter', 'default')
await waitOverlay(1)
await call('exit', 'default')
await waitOverlay(0, 5_000)
await page.waitForTimeout(300)
const afterScroll = await call('scrollTop')
const afterTransform = await call('transform', 'default')
assert.equal(afterScroll, beforeScroll, `scroll position should be restored, got ${afterScroll} expected ${beforeScroll}`)
assert.equal(afterTransform, beforeTransform, `transform should be restored, got "${afterTransform}" expected "${beforeTransform}"`)
console.log('16) scroll position and transform restored exactly')

// 17) A renderer that rejects during worker startup returns no instance, so it
//     must remove its document listener and shell before propagating the error.
await page.evaluate(() => {
  const added = []
  const removed = []
  const originalAdd = document.addEventListener.bind(document)
  const originalRemove = document.removeEventListener.bind(document)
  window.__failedRendererListenerProbe = { added, removed, originalAdd, originalRemove }
  document.addEventListener = (type, listener, options) => {
    if (type === 'keydown') added.push(listener)
    return originalAdd(type, listener, options)
  }
  document.removeEventListener = (type, listener, options) => {
    if (type === 'keydown') removed.push(listener)
    return originalRemove(type, listener, options)
  }
})
const failure = await call('renderFailure')
const failureListeners = await page.evaluate(() => {
  const probe = window.__failedRendererListenerProbe
  document.addEventListener = probe.originalAdd
  document.removeEventListener = probe.originalRemove
  return {
    added: probe.added.length,
    removed: probe.removed.length,
    leaked: probe.added.filter(listener => !probe.removed.includes(listener)).length,
  }
})
assert.equal(failure.rejected, true, 'invalid worker startup should reject')
assert.equal(failure.childCount, 0, 'failed renderer shell should be removed')
assert.equal(failureListeners.added, 1, 'failed renderer should install one keydown listener')
assert.equal(failureListeners.removed, 1, 'failed renderer should remove its keydown listener')
assert.equal(failureListeners.leaked, 0, 'failed renderer must not leak a keydown listener')
console.log('17) failed renderer startup cleans its shell and document listener')

await call('unmountRenderer', 'rendererB')

assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
console.log('\nall slideshow checks passed')
await browser.close()
server.close()
