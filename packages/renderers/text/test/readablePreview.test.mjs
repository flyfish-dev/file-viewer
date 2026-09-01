import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { renderFileViewerCode } from '../dist/index.js'

const readFixture = name => readFile(
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
  'utf8'
)

const toBuffer = source => {
  const bytes = new TextEncoder().encode(source)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

const createHarness = () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="target"></div></body></html>', {
    pretendToBeVisual: true,
    runScripts: 'dangerously',
    url: 'https://example.test/'
  })
  const previous = {
    DOMParser: globalThis.DOMParser,
    document: globalThis.document,
    window: globalThis.window
  }
  globalThis.DOMParser = dom.window.DOMParser
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  return {
    dom,
    target: dom.window.document.querySelector('#target'),
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete globalThis[key]
        } else {
          globalThis[key] = value
        }
      }
      dom.window.close()
    }
  }
}

const settle = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
  await Promise.resolve()
}

test('regular wrapping keeps one gutter entry per logical source line', async () => {
  const source = await readFixture('issue-235-long-line.txt')
  const harness = createHarness()
  try {
    const rendered = await renderFileViewerCode(toBuffer(source), harness.target, 'txt', {
      options: {
        text: {
          lineNumbers: true,
          wrapLongLines: true
        }
      }
    })

    const root = harness.target.querySelector('.code-viewer')
    const lines = Array.from(harness.target.querySelectorAll('.code-source-line'))
    assert.equal(root.dataset.wrapLongLines, 'true')
    assert.equal(lines.length, 3)
    assert.deepEqual(
      lines.map(line => line.querySelector('.code-source-line-number').textContent),
      ['1', '2', '3']
    )
    assert.equal(lines[0].querySelector('.code-source-line-content').textContent, source.split('\n')[0])
    assert.equal(lines[1].querySelector('.code-source-line-content').textContent, 'second logical line')
    assert.equal(lines[0].querySelector('.code-source-line-number').getAttribute('aria-hidden'), 'true')

    const stylesheet = harness.target.querySelector('style').textContent
    assert.match(stylesheet, /overflow-x:hidden/)
    assert.match(stylesheet, /white-space:pre-wrap/)
    await rendered.unmount()
  } finally {
    harness.restore()
  }
})

test('pretty JSON is clearly labelled and can switch back to the untouched source', async () => {
  const source = (await readFixture('issue-235-minified.json')).trimEnd()
  const buffer = toBuffer(source)
  const originalBytes = Array.from(new Uint8Array(buffer))
  const harness = createHarness()
  try {
    const rendered = await renderFileViewerCode(buffer, harness.target, 'json', {
      options: {
        locale: 'en-US',
        text: {
          lineNumbers: true,
          prettyPrint: true,
          prettyPrintMaxBytes: buffer.byteLength
        }
      }
    })

    const root = harness.target.querySelector('.code-viewer')
    const code = harness.target.querySelector('code')
    const status = harness.target.querySelector('.code-format-status')
    const toggle = harness.target.querySelector('.code-format-toggle')
    assert.equal(root.dataset.prettyPrint, 'formatted')
    assert.equal(root.dataset.textRepresentation, 'formatted')
    assert.equal(status.hidden, false)
    assert.equal(status.textContent, 'Formatted preview')
    assert.match(code.textContent, /\n\s+"user"/)
    assert.equal(toggle.hidden, false)

    toggle.click()
    await settle()
    assert.equal(root.dataset.textRepresentation, 'source')
    assert.equal(code.textContent, source)
    assert.equal(toggle.textContent, 'Show formatted preview')
    assert.deepEqual(Array.from(new Uint8Array(buffer)), originalBytes)

    toggle.click()
    await settle()
    assert.equal(root.dataset.textRepresentation, 'formatted')
    await rendered.unmount()
  } finally {
    harness.restore()
  }
})

test('formatted HTML remains inert escaped source and never creates executable nodes', async () => {
  const source = '<!doctype html><html><body><script>window.__issue235=1</script><img src=x onerror="window.__issue235=2"><p>safe</p></body></html>'
  const harness = createHarness()
  harness.dom.window.__issue235 = 0
  try {
    const rendered = await renderFileViewerCode(toBuffer(source), harness.target, 'html', {
      options: { text: { prettyPrint: true } }
    })

    assert.equal(harness.dom.window.__issue235, 0)
    assert.equal(harness.target.querySelector('.code-area script'), null)
    assert.equal(harness.target.querySelector('.code-area img'), null)
    const renderedSource = harness.target.querySelector('code')?.textContent ?? ''
    assert.equal(renderedSource.includes('<script>'), true)
    assert.equal(renderedSource.includes('onerror='), true)
    await rendered.unmount()
  } finally {
    harness.restore()
  }
})

test('malformed JSON renders the original source without a formatted toggle', async () => {
  const source = '{"broken":[1,}'
  const harness = createHarness()
  try {
    const rendered = await renderFileViewerCode(toBuffer(source), harness.target, 'json', {
      options: { text: { prettyPrint: true } }
    })
    const root = harness.target.querySelector('.code-viewer')
    assert.equal(root.dataset.prettyPrint, 'failed')
    assert.equal(root.dataset.textRepresentation, 'source')
    assert.equal(harness.target.querySelector('code').textContent, source)
    assert.equal(harness.target.querySelector('.code-format-toggle').hidden, true)
    await rendered.unmount()
  } finally {
    harness.restore()
  }
})

test('virtualized large-text wrapping remains bounded and associates rows with logical lines', async () => {
  const source = await readFixture('issue-235-long-line.txt')
  const harness = createHarness()
  try {
    const rendered = await renderFileViewerCode(toBuffer(source), harness.target, 'txt', {
      options: {
        text: {
          lineNumbers: true,
          wrapLongLines: true,
          virtualizeAboveBytes: 1,
          virtualOverscanLines: 2
        }
      }
    })

    const root = harness.target.querySelector('.code-viewer--virtual')
    const rows = Array.from(harness.target.querySelectorAll('.code-virtual-line'))
    assert.ok(root)
    assert.equal(root.dataset.wrapLongLines, 'true')
    assert.equal(root.dataset.totalLines, '3')
    assert.ok(rows.length <= 3)
    assert.equal(rows[0].dataset.logicalLine, '1')
    assert.equal(rows[0].querySelector('.code-virtual-number').textContent, '1')
    assert.equal(rows[0].querySelector('.code-virtual-content').textContent, source.split('\n')[0])
    assert.match(harness.target.querySelector('style').textContent, /code-viewer--virtual\.code-viewer--wrap-lines/)
    await rendered.unmount()
  } finally {
    harness.restore()
  }
})

test('pretty-print limit never replaces the existing virtualized original-source path', async () => {
  const source = await readFixture('issue-235-long-line.txt')
  const harness = createHarness()
  try {
    const rendered = await renderFileViewerCode(toBuffer(source), harness.target, 'json', {
      options: {
        text: {
          prettyPrint: true,
          prettyPrintMaxBytes: 8,
          virtualizeAboveBytes: 1,
          wrapLongLines: true
        }
      }
    })

    const root = harness.target.querySelector('.code-viewer--virtual')
    assert.ok(root)
    assert.equal(root.dataset.wrapLongLines, 'true')
    assert.equal(harness.target.querySelector('.code-format-toggle'), null)
    assert.equal(harness.target.querySelector('.code-virtual-content').textContent, source.split('\n')[0])
    await rendered.unmount()
  } finally {
    harness.restore()
  }
})
