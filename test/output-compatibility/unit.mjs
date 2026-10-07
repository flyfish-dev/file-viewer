import assert from 'node:assert/strict'

export async function runUnits(api, JSDOM, check) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true })
  const { document } = dom.window
  const root = document.getElementById('root')
  const bounded = (promise, ms = 1200) => {
    let timer
    return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Readiness did not settle')), ms) })]).finally(() => clearTimeout(timer))
  }
  try {
    for (const box of ['border-box', 'content-box']) {
      await check(`Unscaled ${box} print geometry without a global window`, () => {
        root.style.cssText = `box-sizing:${box};width:400px;height:250px;padding:10px 20px;border:2px solid;transform:scale(.5)`
        assert.deepEqual(api.getElementPrintPageSize(root), box === 'border-box' ? { width: 400, height: 250 } : { width: 444, height: 274 })
      })
    }
    await check('Uniform and flow print styles do not create named pages', () => {
      for (const options of [{ pages: [{ width: 400, height: 300 }, { width: 400, height: 300 }] }, { heightMode: 'min', pages: [{ width: 400, height: 300 }, { width: 300, height: 400 }] }]) {
        assert.doesNotMatch(api.buildPrintPageStyle({ selector: '.sheet', width: 400, height: 300, ...options }), /@page file-viewer-print-page/)
      }
    })
    await check('Heterogeneous paper styles target only their indexed page', () => {
      const style = api.buildPrintPageStyle({ selector: '.sheet', width: 400, height: 300, pages: [{ width: 400, height: 300 }, { width: 300, height: 400 }] })
      assert.match(style, /@page file-viewer-print-page-1 \{ size: 300px 400px; margin: 0;/)
      assert.match(style, /\.sheet\[data-viewer-print-page-index="1"\]/)
    })
    for (const authored of [0, 90, 180, 270]) for (const user of [0, 90, 180, 270]) {
      await check(`PDF page rotation ${authored} plus viewer offset ${user}`, () => {
        assert.equal(api.resolvePdfPageRotation(authored, user), (authored + user) % 360)
      })
    }
    await check('Hidden-host animation frame wait has a bounded fallback', async () => {
      const canceled = []
      await bounded(api.waitForFileViewerNextPaint({ requestAnimationFrame: () => 17, cancelAnimationFrame: id => canceled.push(id) }))
      assert.deepEqual(canceled, [17])
    })
    await check('Synchronous RAF errors fall back without an unhandled rejection', async () => {
      await bounded(api.waitForFileViewerNextPaint({ requestAnimationFrame: () => { throw Error('host closed') } }))
    })
    for (const event of ['load', 'error']) {
      await check(`Image ${event} settles even while decode remains pending`, async () => {
        const image = document.createElement('img')
        Object.defineProperty(image, 'complete', { get: () => false })
        image.decode = () => new Promise(() => {})
        root.replaceChildren(image)
        const promise = api.waitForFileViewerImages(root)
        image.dispatchEvent(new dom.window.Event(event))
        await bounded(promise)
      })
    }
    await check('Decode rejection after image completion cannot miss the completion state', async () => {
      const image = document.createElement('img')
      let complete = false
      Object.defineProperty(image, 'complete', { get: () => complete })
      image.decode = () => { complete = true; return Promise.reject(Error('decode failed')) }
      root.replaceChildren(image)
      await bounded(api.waitForFileViewerImages(root))
    })
    await check('Stalled image has a five-second ceiling and removes listeners', async () => {
      const image = document.createElement('img')
      Object.defineProperty(image, 'complete', { get: () => false })
      image.decode = () => new Promise(() => {})
      const removed = []
      const remove = image.removeEventListener.bind(image)
      image.removeEventListener = (type, ...rest) => { removed.push(type); return remove(type, ...rest) }
      root.replaceChildren(image)
      await bounded(api.waitForFileViewerImages(root), 6500)
      assert.deepEqual(removed.sort(), ['error', 'load'])
    })
    await check('Snapshot waits for fonts, then paints the settled layout', async () => {
      root.replaceChildren()
      let ready
      const fonts = new Promise(resolve => { ready = resolve })
      Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: fonts } })
      let finished = false
      const promise = api.prepareFileViewerRenderedContentForSnapshot(root).then(() => { finished = true })
      await new Promise(resolve => setTimeout(resolve, 25))
      assert.equal(finished, false)
      ready()
      await bounded(promise)
      assert.equal(finished, true)
    })
  } finally {
    dom.window.close()
  }
}
