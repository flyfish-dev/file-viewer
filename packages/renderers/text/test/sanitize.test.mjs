import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { sanitizeFileViewerRichHtml } from '../dist/index.js'

test('diff/markdown sanitizer preserves structural markup but removes executable content', () => {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'dangerously', url: 'https://example.test/' })
  dom.window.__textSentinel = 0
  const fragment = sanitizeFileViewerRichHtml(dom.window.document, `
    <table class="d2h-diff-table"><tr><td>safe</td></tr></table>
    <svg class="d2h-icon"><path d="M0 0h1v1z"></path><image href="https://security.invalid/icon.svg"></image></svg>
    <a href="java&#x0A;script:window.__textSentinel=1" onclick="window.__textSentinel=2">bad</a>
    <img src="x" onerror="window.__textSentinel=3">
  `, { allowSvg: true })
  dom.window.document.body.append(fragment)
  assert.ok(dom.window.document.querySelector('table.d2h-diff-table'))
  assert.ok(dom.window.document.querySelector('svg.d2h-icon'))
  assert.equal(dom.window.document.querySelector('svg.d2h-icon image')?.hasAttribute('href'), false)
  const anchor = dom.window.document.querySelector('a')
  assert.equal(anchor.hasAttribute('href'), false)
  assert.equal(anchor.hasAttribute('onclick'), false)
  assert.equal(dom.window.document.querySelector('img').hasAttribute('onerror'), false)
  anchor.click()
  assert.equal(dom.window.__textSentinel, 0)
  dom.window.close()
})
