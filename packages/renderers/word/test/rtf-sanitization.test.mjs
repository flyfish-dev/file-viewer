import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import {
  registerFileViewerRtfLoader,
  isSafeFileViewerRtfHyperlink,
  sanitizeFileViewerRtfElement,
  sanitizeFileViewerRtfHtml,
  sanitizeFileViewerRtfHyperlink
} from '../dist/index.js'
import renderOpenDocument from '../dist/openDocument.js'

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/rtf-link-policy.rtf')

const withDom = async (callback) => {
  const dom = new JSDOM('<!doctype html><body><div id="target"></div></body>', {
    runScripts: 'dangerously',
    url: 'https://viewer.example/app/'
  })
  const previous = new Map()
  for (const key of [
    'window',
    'document',
    'DOMParser',
    'HTMLElement',
    'HTMLAnchorElement',
    'Node',
    'Blob',
    'URL'
  ]) {
    previous.set(key, globalThis[key])
    globalThis[key] = dom.window[key]
  }
  try {
    return await callback(dom)
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
    dom.window.close()
  }
}

const asArrayBuffer = (value) => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

const renderFixture = async (dom, externalLinkPolicy = 'block') => {
  registerFileViewerRtfLoader(() => import('rtf.js/dist/RTFJS.bundle.js'))
  const bytes = await readFile(fixturePath)
  await renderOpenDocument(
    asArrayBuffer(bytes),
    dom.window.document.querySelector('#target'),
    'rtf',
    { options: { docx: { externalLinkPolicy } } }
  )
}

const hrefByText = (documentRef) =>
  new Map(
    [...documentRef.querySelectorAll('.flyfish-rtf-paper a')].map((anchor) => [
      anchor.textContent.trim(),
      anchor.getAttribute('href')
    ])
  )

const blockedByText = (documentRef) =>
  new Map(
    [...documentRef.querySelectorAll('[data-file-viewer-blocked-link="true"]')].map((node) => [
      node.textContent.trim(),
      node
    ])
  )

test('shared RTF link policy canonicalizes bookmarks and rejects protocol confusion', () => {
  for (const unsafe of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java script:alert(1)',
    'java\u0000script:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///tmp/secret',
    'blob:https://example.test/id',
    'custom-scheme:payload',
    '//attacker.example/path',
    '/\\attacker.example/path',
    '\\\\attacker.example\\path'
  ]) {
    assert.equal(sanitizeFileViewerRtfHyperlink(unsafe, 'allow'), null, unsafe)
  }

  assert.equal(sanitizeFileViewerRtfHyperlink('#section'), '#section')
  assert.equal(sanitizeFileViewerRtfHyperlink('\\l "section"'), '#section')
  assert.equal(sanitizeFileViewerRtfHyperlink('https://safe.example/path'), null)
  assert.equal(isSafeFileViewerRtfHyperlink('https://safe.example/path'), true)
  assert.equal(isSafeFileViewerRtfHyperlink('javascript:alert(1)'), false)
  assert.equal(isSafeFileViewerRtfHyperlink('https://safe.example/path', 'block'), false)

  for (const safe of [
    'http://safe.example/path',
    'https://safe.example/path',
    'mailto:admin@example.com',
    'tel:+12025550123',
    '/help/index.html',
    './next.html',
    '../previous.html',
    'docs/readme.html'
  ]) {
    assert.equal(sanitizeFileViewerRtfHyperlink(safe, 'allow'), safe)
  }
})

test('real RTF file blocks every external link by default while retaining its bookmark', async () => {
  await withDom(async (dom) => {
    dom.window.__rtfSentinel = 0
    await renderFixture(dom)

    assert.deepEqual([...hrefByText(dom.window.document)], [['safe-bookmark', '#section']])
    const blocked = blockedByText(dom.window.document)
    for (const label of [
      'unsafe-javascript',
      'unsafe-vbscript',
      'unsafe-data',
      'unsafe-case',
      'unsafe-space',
      'unsafe-control',
      'unsafe-unknown',
      'unsafe-protocol-relative',
      'unsafe-mixed-slashes',
      'unsafe-file',
      'unsafe-blob',
      'safe-http',
      'safe-https',
      'safe-mailto',
      'safe-tel',
      'safe-relative',
      'safe-root-relative',
      'safe-dot-relative',
      'safe-parent-relative'
    ]) {
      assert.ok(blocked.has(label), label)
      blocked.get(label).click()
    }
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0))
    assert.equal(dom.window.__rtfSentinel, 0)
  })
})

test('real RTF file allow mode keeps only approved external and relative links', async () => {
  await withDom(async (dom) => {
    dom.window.__rtfSentinel = 0
    await renderFixture(dom, 'allow')

    assert.deepEqual(
      [...hrefByText(dom.window.document)],
      [
        ['safe-http', 'http://safe.example/path'],
        ['safe-https', 'https://safe.example/path'],
        ['safe-mailto', 'mailto:admin@example.com'],
        ['safe-tel', 'tel:+12025550123'],
        ['safe-relative', 'docs/readme.html'],
        ['safe-root-relative', '/help/index.html'],
        ['safe-dot-relative', './next.html'],
        ['safe-parent-relative', '../previous.html'],
        ['safe-bookmark', '#section']
      ]
    )

    const blocked = blockedByText(dom.window.document)
    for (const label of [
      'unsafe-javascript',
      'unsafe-vbscript',
      'unsafe-data',
      'unsafe-case',
      'unsafe-space',
      'unsafe-control',
      'unsafe-unknown',
      'unsafe-protocol-relative',
      'unsafe-mixed-slashes',
      'unsafe-file',
      'unsafe-blob'
    ]) {
      assert.ok(blocked.has(label), label)
      blocked.get(label).click()
    }
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0))
    assert.equal(dom.window.__rtfSentinel, 0)
  })
})

test('RTF direct HTML and DOM boundaries remove active markup under both policies', async () => {
  await withDom(async (dom) => {
    dom.window.__rtfSentinel = 0
    const markup = [
      '<a id="unsafe" href="java&#10;script:window.__rtfSentinel=1" onclick="window.__rtfSentinel=2">unsafe</a>',
      '<a id="external" href="https://safe.example/path" target="_blank">external</a>',
      '<a id="bookmark" href="#section" target="_top">bookmark</a>',
      '<a id="ping" href="#section" ping="https://attacker.example/ping">ping</a>',
      '<img id="event" src="x" onerror="window.__rtfSentinel=3">',
      '<img id="srcset" srcset="https://attacker.example/a.png 1x">',
      '<img id="mixed-resource" src="/&#92;attacker.example/a.png">',
      '<video id="poster" poster="https://attacker.example/a.png"></video>',
      '<svg><image id="svg-external" href="https://attacker.example/a.png"></image><image id="svg-fragment" href="#shape"></image></svg>',
      '<span id="active-style" style="background:url(javascript:window.__rtfSentinel=4)">style</span>',
      '<span id="escaped-style" style="background-image:u\\72l(https://attacker.example/a.png)">escaped</span>',
      '<span id="comment-style" style="background-image:u/**/rl(https://attacker.example/a.png)">comment</span>',
      '<span id="image-set-style" style="background-image:image-set(\'https://attacker.example/a.png\' 1x)">image-set</span>',
      '<span id="image-style" style="background-image:image(\'https://attacker.example/a.png\')">image</span>',
      '<script>window.__rtfSentinel=5</script>'
    ].join('')

    const blockedHtml = sanitizeFileViewerRtfHtml(dom.window.document, markup)
    const allowedHtml = sanitizeFileViewerRtfHtml(dom.window.document, markup, {
      externalLinkPolicy: 'allow'
    })
    const blockedTemplate = dom.window.document.createElement('template')
    const allowedTemplate = dom.window.document.createElement('template')
    blockedTemplate.innerHTML = blockedHtml
    allowedTemplate.innerHTML = allowedHtml

    assert.equal(blockedTemplate.content.querySelector('#unsafe').hasAttribute('href'), false)
    assert.equal(blockedTemplate.content.querySelector('#external').hasAttribute('href'), false)
    assert.equal(
      blockedTemplate.content.querySelector('#bookmark').getAttribute('href'),
      '#section'
    )
    assert.equal(blockedTemplate.content.querySelector('#bookmark').hasAttribute('target'), false)
    assert.equal(allowedTemplate.content.querySelector('#unsafe').hasAttribute('href'), false)
    assert.equal(
      allowedTemplate.content.querySelector('#external').getAttribute('href'),
      'https://safe.example/path'
    )
    assert.match(allowedTemplate.content.querySelector('#external').getAttribute('rel'), /noopener/)

    for (const template of [blockedTemplate, allowedTemplate]) {
      assert.equal(template.content.querySelectorAll('script').length, 0)
      assert.equal(template.content.querySelectorAll('[onclick],[onerror],[onload]').length, 0)
      assert.equal(template.content.querySelector('#event').hasAttribute('src'), false)
      assert.equal(template.content.querySelector('#srcset').hasAttribute('srcset'), false)
      assert.equal(template.content.querySelector('#mixed-resource').hasAttribute('src'), false)
      assert.equal(template.content.querySelector('#poster').hasAttribute('poster'), false)
      assert.equal(template.content.querySelector('#ping').hasAttribute('ping'), false)
      assert.equal(template.content.querySelector('#svg-external').hasAttribute('href'), false)
      assert.equal(template.content.querySelector('#svg-fragment').getAttribute('href'), '#shape')
      assert.equal(template.content.querySelector('#active-style').hasAttribute('style'), false)
      assert.equal(template.content.querySelector('#escaped-style').hasAttribute('style'), false)
      assert.equal(template.content.querySelector('#comment-style').hasAttribute('style'), false)
      assert.equal(template.content.querySelector('#image-set-style').hasAttribute('style'), false)
      assert.equal(template.content.querySelector('#image-style').hasAttribute('style'), false)
    }

    const element = dom.window.document.createElement('div')
    element.innerHTML = markup
    dom.window.document.body.append(sanitizeFileViewerRtfElement(dom.window.document, element))
    dom.window.document.querySelector('#unsafe').click()
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0))
    assert.equal(dom.window.__rtfSentinel, 0)
  })
})
