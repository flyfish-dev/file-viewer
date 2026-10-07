import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, join, resolve, sep } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const dist = join(root, 'packages/components/web-full/dist')
const output = join(root, 'output/markdown-highlighting')
await mkdir(output, { recursive: true })
const mime = {
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm'
}
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname
    if (pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(`<!doctype html><html><head><meta charset="utf-8"></head><body>
        <style>code,.hljs-keyword{color:hotpink!important}#viewer{height:700px;width:800px}</style>
        <div id="viewer"></div><script src="/lib/flyfish-file-viewer-web-full.iife.js"></script>
      </body></html>`)
      return
    }
    const path = resolve(dist, '.' + decodeURIComponent(pathname.replace(/^\/lib/, '')))
    if (!path.startsWith(dist + sep)) {
      response.writeHead(403).end()
      return
    }
    const bytes = await readFile(path)
    response
      .writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' })
      .end(bytes)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((accept, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', accept)
})
const { chromium, webkit } = createRequire(join(root, 'package.json'))('playwright')
const source = 'const text = "</script><img src=x onerror=globalThis.highlightInjected=1>";'
const python = 'def hello():\n    return "world"'
const unknown = 'custom text <tag> & symbols'
const fixture = [
  '# Heading',
  '',
  '`const inline = true`',
  '',
  '```javascript',
  source,
  '```',
  '',
  '```py',
  python,
  '```',
  '',
  '```unknown-sample-language',
  unknown,
  '```',
  '',
  '| A | B |',
  '| - | - |',
  '| 1 | 2 |'
].join('\n')
const results = []
try {
  for (const [name, driver] of [
    ['chromium', chromium],
    ['webkit', webkit]
  ]) {
    const browser = await driver.launch({ headless: true })
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
      const errors = [],
        external = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.route('**/*', (route) => {
        if (!new URL(route.request().url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
          external.push(route.request().url())
          return route.abort()
        }
        return route.continue()
      })
      await page.goto(`http://127.0.0.1:${server.address().port}`)
      try {
        await page.waitForFunction(() => Boolean(globalThis.FlyfishFileViewerWebFull?.mountViewer))
      } catch (error) {
        throw new Error(
          `${name} could not load the full IIFE: ${JSON.stringify({ errors, external })}`,
          { cause: error }
        )
      }
      for (const theme of ['light', 'dark']) {
        const result = await page.evaluate(
          async ({ fixture, theme }) => {
            globalThis.highlightInjected = 0
            await globalThis.highlightViewer?.destroy()
            const target = document.querySelector('#viewer')
            await new Promise((accept, reject) => {
              const timeout = setTimeout(
                () => reject(new Error('Markdown did not become ready')),
                15000
              )
              globalThis.highlightViewer = FlyfishFileViewerWebFull.mountViewer(target, {
                buffer: new TextEncoder().encode(fixture).buffer,
                filename: 'syntax.md',
                options: { theme, styleIsolation: 'shadow' },
                onStateChange(state) {
                  if (state.error) {
                    clearTimeout(timeout)
                    reject(new Error(String(state.error)))
                  } else if (state.ready) {
                    clearTimeout(timeout)
                    accept()
                  }
                }
              })
            })
            const article = target.shadowRoot.querySelector('.markdown-body')
            const blocks = [...article.querySelectorAll('pre > code')]
            const keyword = blocks[0].querySelector('.hljs-keyword')
            return {
              shadow: Boolean(target.shadowRoot),
              language: blocks.map((code) => code.className),
              texts: blocks.map((code) => code.textContent),
              spans: blocks.map((code) => code.querySelectorAll('span[class^="hljs-"]').length),
              keywordColor: keyword && getComputedStyle(keyword).color,
              codeColor: getComputedStyle(blocks[0]).color,
              inlineSpans: article.querySelector('p code').children.length,
              tables: article.querySelectorAll('table').length,
              unsafeNodes: article.querySelectorAll('script,img[onerror]').length,
              injected: globalThis.highlightInjected
            }
          },
          { fixture, theme }
        )
        assert.equal(result.shadow, true)
        assert.deepEqual(result.texts, [source + '\n', python + '\n', unknown + '\n'])
        assert.ok(result.spans[0] > 0 && result.spans[1] > 0)
        assert.equal(result.spans[2], 0)
        assert.notEqual(result.keywordColor, result.codeColor)
        assert.notEqual(
          result.keywordColor,
          'rgb(255, 105, 180)',
          'Host CSS must not override Shadow DOM'
        )
        assert.equal(result.inlineSpans, 0)
        assert.equal(result.tables, 1)
        assert.equal(result.unsafeNodes, 0)
        assert.equal(result.injected, 0)
        await page.screenshot({ path: join(output, `${name}-${theme}.png`) })
        results.push({ browser: name, theme, result, status: 'pass' })
      }
      for (const mode of ['disabled', 'budget', 'code-file']) {
        const result = await page.evaluate(
          async ({ mode, fixture, source }) => {
            await highlightViewer.destroy()
            const text =
              mode === 'budget'
                ? '```js\nconst ' + 'word '.repeat(110000) + '\n```'
                : mode === 'code-file'
                  ? source
                  : fixture
            await new Promise((accept, reject) => {
              const timeout = setTimeout(
                () => reject(new Error(mode + ' did not become ready')),
                15000
              )
              highlightViewer = FlyfishFileViewerWebFull.mountViewer(
                document.querySelector('#viewer'),
                {
                  buffer: new TextEncoder().encode(text).buffer,
                  filename: mode === 'code-file' ? 'code.js' : 'syntax.md',
                  options: { text: { markdownHighlight: mode !== 'disabled' } },
                  onStateChange(state) {
                    if (state.error) {
                      clearTimeout(timeout)
                      reject(new Error(String(state.error)))
                    } else if (state.ready) {
                      clearTimeout(timeout)
                      accept()
                    }
                  }
                }
              )
            })
            const root = document.querySelector('#viewer').shadowRoot
            const count = root.querySelectorAll('span[class^="hljs-"]').length
            const content = root.querySelector('pre > code')?.textContent
            await highlightViewer.destroy()
            return {
              count,
              contentLength: content.length,
              sourceMatches:
                mode === 'code-file'
                  ? content === source
                  : mode === 'budget'
                    ? content === 'const ' + 'word '.repeat(110000) + '\n'
                    : true,
              removed: !root.querySelector('.markdown-viewer,.code-viewer')
            }
          },
          { mode, fixture, source }
        )
        assert.equal(result.sourceMatches, true)
        assert.equal(result.removed, true)
        if (mode === 'code-file') assert.ok(result.count > 0)
        else assert.equal(result.count, 0)
        results.push({ browser: name, mode, result, status: 'pass' })
      }
      assert.deepEqual(errors, [])
      assert.deepEqual(external, [])
    } finally {
      await browser.close()
    }
  }
} finally {
  await new Promise((accept) => server.close(accept))
}
const iife = await readFile(join(dist, 'flyfish-file-viewer-web-full.iife.js'))
await writeFile(
  join(output, 'report.json'),
  JSON.stringify(
    { node: process.version, iifeSha256: createHash('sha256').update(iife).digest('hex'), results },
    null,
    2
  ) + '\n'
)
console.log(
  `Markdown language, light/dark Shadow DOM, escaping, budget, opt-out, code-file and cleanup passed: ${results.length} browser cases`
)
