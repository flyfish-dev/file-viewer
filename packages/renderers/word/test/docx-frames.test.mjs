import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { observeDocxFrames } from '../dist/docxFrames.js'

for (const [name, color] of [['light', 'white'], ['dark', '#1e1e1e'], ['authored', '#d9ead3']]) {
  for (const paged of [false, true]) {
    test(`keeps ${name} paper paint across ${paged ? 'paged' : 'flow'} zoom frames`, () => {
      const dom = new JSDOM(`<style>.docx-wrapper > section.docx { background: ${color} }</style>
        <main><div class="docx-wrapper"><section class="docx">Page</section></div></main>`)
      try {
        const target = dom.window.document.querySelector('main')
        const page = target.querySelector('section.docx')
        const before = dom.window.getComputedStyle(page).backgroundColor
        const snapshots = []
        const dispose = observeDocxFrames(target, paged, frames => snapshots.push(frames))
        assert.equal(snapshots.length, 1)
        const [frame] = snapshots[0]
        assert.equal(frame.className, paged ? 'docx-page-frame' : 'docx-flow-frame')
        assert.equal(frame.style.getPropertyValue('--file-viewer-docx-page-background'), before)
        assert.equal(frame.firstElementChild, page)
        assert.equal(page.style.backgroundColor, '', 'Keep authored inline styles and print rules authoritative')
        dispose()
      } finally { dom.window.close() }
    })
  }
}

test('waits for pagination ownership before reading and wrapping paper', async () => {
  const dom = new JSDOM('<main><div class="docx-wrapper" data-docx-paginating="true"><section class="docx">Page</section></div></main>')
  try {
    const target = dom.window.document.querySelector('main')
    const wrapper = target.firstElementChild
    const page = wrapper.firstElementChild
    let frames = []
    const dispose = observeDocxFrames(target, true, next => { frames = next })
    assert.equal(page.parentElement, wrapper)
    assert.equal(frames.length, 0)
    page.style.backgroundColor = '#fff2cc'
    wrapper.dataset.docxPaginating = 'false'
    await new Promise(resolve => dom.window.setTimeout(resolve, 0))
    assert.equal(frames.length, 1)
    assert.equal(frames[0].style.getPropertyValue('--file-viewer-docx-page-background'), 'rgb(255, 242, 204)')
    assert.equal(page.style.backgroundColor, 'rgb(255, 242, 204)')
    dispose()
  } finally { dom.window.close() }
})
