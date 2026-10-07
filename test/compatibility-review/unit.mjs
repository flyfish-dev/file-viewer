import assert from 'node:assert/strict'
import { tableModel, makePresentation } from './fixtures.mjs'

export async function runUnits(api, JSDOM, JSZip, check) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
  const document = dom.window.document
  try {
    const parsed = tableModel(api)
    const rendered = api.renderMsDoc(parsed)
    document.body.innerHTML = rendered.html
    const table = document.querySelector('table')
    await check('DOC nonuniform union grid survives merged first row', () => {
      assert.deepEqual(
        [...table.querySelectorAll('col')].map((c) => c.style.width),
        ['80px', '120px', '200px']
      )
      assert.equal(table.rows[0].cells[1].colSpan, 2)
      assert.equal(table.rows[1].cells.length, 3)
    })
    await check('DOC justification overrides left indentation', () => {
      assert.equal(table.style.marginInlineStart, 'auto')
      assert.equal(table.style.marginInlineEnd, 'auto')
      parsed.blocks[0].state.alignment = 2
      const box = document.createElement('div')
      box.innerHTML = api.renderMsDoc(parsed).html
      assert.equal(parseFloat(box.querySelector('table').style.marginInlineEnd), 0)
      parsed.blocks[0].state.alignment = 0
      box.innerHTML = api.renderMsDoc(parsed).html
      assert.equal(box.querySelector('table').style.marginInlineStart, '-8px')
    })
    await check('DOC uses valid middle alignment and upright vertical text', () => {
      for (const cell of table.querySelectorAll('td'))
        assert.equal(cell.style.verticalAlign, 'middle')
      assert.equal(table.querySelector('.msdoc-cell-vertical').style.writingMode, 'vertical-rl')
      assert.equal(table.querySelector('.msdoc-cell-vertical').style.textOrientation, 'upright')
      assert.equal(table.querySelectorAll('.msdoc-cell-vertical').length, 1)
      assert.equal(table.textContent.includes('纵向文字'), true)
    })
    await check('DOC missing geometric metadata keeps the fallback table', () => {
      const model = tableModel(api)
      for (const row of model.blocks[0].rows) for (const cell of row.cells) cell.meta = null
      assert.doesNotMatch(api.renderMsDoc(model).html, /<colgroup>/)
    })
    await check('DOC revision filtering still precedes vertical layout', () => {
      const model = tableModel(api)
      const cell = model.blocks[0].rows[1].cells[0]
      cell.paragraphs[0].inlines[0].style.revisionDeleted = true
      assert.equal(api.renderMsDoc(model, { reviewMode: 'final' }).html.includes('纵向文字'), false)
      assert.equal(
        api.renderMsDoc(model, { reviewMode: 'original' }).html.includes('纵向文字'),
        true
      )
    })

    const makeMarkdown = () => {
      const root = document.createElement('div'),
        article = document.createElement('article')
      root.append(article)
      document.body.append(root)
      article.innerHTML =
        '<h2>章节 一</h2><h2>Repeat</h2><h2>Repeat</h2><h2>Repeat-1</h2><h2 id="authored">Keep Me</h2><h2>!!!</h2><h2><em>Rich</em> text</h2><a href="#章节-一">Jump</a>'
      return { root, article }
    }
    const { root, article } = makeMarkdown()
    const disposeMarkdown = api.installMarkdownAnchors(root, article)
    await check('Markdown Unicode, repeated and authored heading IDs', () => {
      assert.deepEqual(
        [...article.querySelectorAll('h2')].map((h) => h.id),
        ['章节-一', 'repeat', 'repeat-1', 'repeat-1-1', 'authored', 'section', 'rich-text']
      )
    })
    await check('Markdown fragment resolution stays inside its own viewer', () => {
      const other = makeMarkdown()
      const stop = api.installMarkdownAnchors(other.root, other.article)
      const first = article.querySelector('h2'),
        second = other.article.querySelector('h2')
      root.getBoundingClientRect = () => ({ top: 0, height: 200 })
      first.getBoundingClientRect = () => ({ top: 350 })
      second.getBoundingClientRect = () => ({ top: 999 })
      const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
      article.querySelector('a').dispatchEvent(event)
      assert.equal(event.defaultPrevented, true)
      assert.equal(root.scrollTop, 350)
      assert.equal(other.root.scrollTop, 0)
      assert.equal(document.activeElement, first)
      stop()
      other.root.remove()
    })
    for (const href of ['#%E0%A4%A', '#missing', 'https://example.test/#章节-一']) {
      await check('Markdown leaves unresolved or external link unchanged: ' + href, () => {
        article.querySelector('a').setAttribute('href', href)
        const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
        article.querySelector('a').dispatchEvent(event)
        assert.equal(event.defaultPrevented, false)
      })
    }
    await check('Markdown preserves modified clicks and cleans temporary focus state', () => {
      const a = article.querySelector('a')
      a.setAttribute('href', '#章节-一')
      const event = new dom.window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true
      })
      a.dispatchEvent(event)
      assert.equal(event.defaultPrevented, false)
      disposeMarkdown()
      assert.equal(article.querySelector('h2').hasAttribute('tabindex'), false)
      const click = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })
      a.dispatchEvent(click)
      assert.equal(click.defaultPrevented, false)
    })
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
    const host = document.createElement('div')
    document.body.append(host)
    host.innerHTML =
      '<div class="docx-wrapper" data-docx-pagination-scheduled="true"><section class="docx">Page one</section></div>'
    const wrapper = host.firstElementChild
    let frames = []
    let notifications = 0
    const stopFrames = api.observeDocxFrames(host, true, (next) => {
      frames = next
      notifications++
    })
    await check('DOCX leaves scheduled pagination direct children intact', () => {
      assert.equal(frames.length, 0)
      assert.equal(wrapper.firstElementChild.tagName, 'SECTION')
    })
    wrapper.dataset.docxPaginating = 'true'
    delete wrapper.dataset.docxPaginationScheduled
    wrapper.insertAdjacentHTML('beforeend', '<section class="docx">Continuation</section>')
    await flush()
    await check('DOCX leaves running pagination direct children intact', () =>
      assert.equal(frames.length, 0)
    )
    delete wrapper.dataset.docxPaginating
    wrapper.dataset.docxPaginated = 'true'
    await flush()
    await check('DOCX builds exactly one responsive frame per completed page', () => {
      assert.equal(frames.length, 2)
      assert.equal(wrapper.children.length, 2)
      assert.ok(frames.every((frame) => frame.children.length === 1))
      assert.equal(notifications, 1)
    })
    await flush()
    await check('DOCX observer does not loop on its own mutations', () =>
      assert.equal(notifications, 1)
    )
    stopFrames()
    wrapper.insertAdjacentHTML('beforeend', '<section class="docx">Late</section>')
    await flush()
    await check('DOCX disposal cancels late frame mutations', () =>
      assert.equal(wrapper.lastElementChild.tagName, 'SECTION')
    )
    await check('DOCX continuous layout retains flow frame semantics', () => {
      const flow = document.createElement('div')
      flow.innerHTML = '<div class="docx-wrapper"><section class="docx">Flow</section></div>'
      const dispose = api.observeDocxFrames(flow, false, (f) =>
        assert.equal(f[0].className, 'docx-flow-frame')
      )
      dispose()
    })

    for (const id of [
      '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}',
      '{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}',
      '{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}',
      '{00A15C55-8517-42AA-B614-E9B94910E393}',
      '{7DF18680-E054-41AD-8BC1-D1AEF772440D}',
      '{93296810-A885-4BE3-A3E7-6D5BEEA58F35}'
    ]) {
      await check('DrawingML built-in style ' + id, () => {
        const style = api.createBuiltinDrawingMlTableStyle(id.toLowerCase())
        assert.ok(style)
        assert.equal(
          style['a:wholeTbl']['a:tcStyle']['a:tcBdr']['a:bottom']['a:ln'].attrs.w,
          '12700'
        )
        assert.equal(
          style['a:firstRow']['a:tcStyle']['a:tcBdr']['a:bottom']['a:ln'].attrs.w,
          '38100'
        )
        style['a:wholeTbl'].modified = true
        assert.equal(api.createBuiltinDrawingMlTableStyle(id)['a:wholeTbl'].modified, undefined)
      })
    }
    await check('DrawingML does not invent an unknown built-in style', () =>
      assert.equal(api.createBuiltinDrawingMlTableStyle('{unknown}'), undefined)
    )
    const presentations = {}
    for (const [name, options] of Object.entries({
      standard: {},
      unknown: { unknownStyle: true },
      explicit: { explicitStyle: true },
      missing: { missingTableProperties: true }
    })) {
      await check('PPTX real ZIP/XML pipeline: ' + name, async () => {
        const bytes = await makePresentation(JSZip, options)
        const messages = []
        let receive
        api.processPptx(
          (handler) => (receive = handler),
          (message) => messages.push(structuredClone(message))
        )
        await receive({
          type: 'processPPTX',
          data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          options: { themeProcess: true, mediaProcess: true, slideMode: false }
        })
        assert.deepEqual(
          messages.filter((m) => /error/i.test(m.type)),
          []
        )
        const slides = messages.filter((m) => m.type === 'slide')
        assert.equal(slides.length, 3)
        const container = document.createElement('div')
        container.innerHTML = slides.map((m) => m.data).join('')
        assert.equal(
          container.querySelectorAll(':scope > .slide').length,
          3,
          'All slides must be siblings, never table descendants'
        )
        assert.equal(container.querySelectorAll('.slide .slide').length, 0)
        assert.equal(container.querySelectorAll('table').length, 2)
        for (const s of slides)
          assert.equal(
            (s.data.match(/<table\b/g) || []).length,
            (s.data.match(/<\/table>/g) || []).length
          )
        const cell = container.querySelector('td')
        if (name === 'standard') assert.match(cell.style.borderBottom, /solid/)
        if (name === 'explicit') assert.match(cell.style.borderBottom, /rgb\(170, 17, 34\)/)
        if (name === 'unknown') assert.equal(cell.style.borderBottom, '')
        assert.doesNotMatch(container.innerHTML, /#undefined|NaN/)
        presentations[name] = { messages, bytes }
      })
    }
    return { presentations, tableHtml: rendered.html, tableCss: rendered.css }
  } finally {
    dom.window.close()
  }
}
