import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const BASE = process.env.BASE || 'http://127.0.0.1:8081'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))

// The demo picks files through an input; point it straight at the bundled sample instead.
await page.goto(`${BASE}/?url=${encodeURIComponent("/example/ppt.pptx")}`, { waitUntil: 'load' })

const deep = (sel) => page.locator(sel).first()

// Slides render inside the viewer's shadow root; Playwright pierces it automatically.
await deep('.flyfish-pptx-slide-slot').waitFor({ state: 'attached', timeout: 60_000 })
await deep('.pptx-slideshow-button').waitFor({ state: 'visible', timeout: 60_000 })
console.log('1) deck rendered, slideshow button visible')

const slotCount = await page.locator('.flyfish-pptx-slide-slot').count()
assert.ok(slotCount > 1, `expected several slides, got ${slotCount}`)

// Enter via the keyboard shortcut, which is the path the feature request named.
await page.keyboard.press('F5')
await deep('.flyfish-pptx-presentation').waitFor({ state: 'visible', timeout: 10_000 })
console.log('2) F5 opened the slideshow overlay')

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

// Click on the right side advances, PowerPoint-style.
await page.mouse.click(1000, 400)
await page.waitForTimeout(250)
state = await readState()
assert.equal(state.activeNumber, '2', `right-side click should advance, active=${state.activeNumber}`)
// Click on the left edge goes back.
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

// Re-entering must work after a full round trip.
await page.keyboard.press('KeyP')
await deep('.flyfish-pptx-presentation').waitFor({ state: 'visible', timeout: 10_000 })
state = await readState()
assert.equal(state.visibleSlides, 1, 'second entry should show one slide')
console.log(`9) P re-entered the slideshow (${state.counter})`)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
console.log('\nall slideshow checks passed')
await browser.close()
