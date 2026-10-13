import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Worker } from 'node:worker_threads'
import { parseHTML } from 'linkedom'
import renderEmail, { parseEml } from '../dist/email.js'

const encode = (source) => new TextEncoder().encode(source).buffer

function multipart(partCount) {
  return 'Subject: Part budget\r\nContent-Type: multipart/mixed; boundary=parts\r\n\r\n' +
    '--parts\r\nContent-Type: text/plain\r\n\r\nx\r\n'.repeat(partCount) +
    '--parts--\r\n'
}

test('EML accepts the 10,000-part boundary including its root', async () => {
  const email = await parseEml(encode(multipart(9999)), 'parts.eml', [], new Map())
  assert.equal((email.text.match(/\bx\b/g) || []).length, 9999)
})

test('EML rejects one more MIME part instead of returning partial content', async () => {
  await assert.rejects(
    parseEml(encode(multipart(10000)), 'parts.eml', [], new Map()),
    /Maximum MIME part count of 10000 parts exceeded/
  )
})

test('MBOX first-message parsing uses the same MIME part budget', async () => {
  const { document } = parseHTML('<html><body><div id="target"></div></body></html>')
  const previous = globalThis.document
  globalThis.document = document
  try {
    const message = 'From sender@example.com Tue Oct 13 00:00:00 2026\n' + multipart(10000)
    await assert.rejects(
      renderEmail(encode(message), document.querySelector('#target'), 'mbox'),
      /Maximum MIME part count of 10000 parts exceeded/
    )
  } finally { globalThis.document = previous }
})

test('large malformed HTML completes in a bounded Worker and keeps its text', async () => {
  const html = '<br'.repeat(40000) + '<!--'.repeat(40000) + '<a href='.repeat(40000) + 'END_MARKER'
  const worker = new Worker(`
    const { parentPort, workerData } = require('node:worker_threads');
    (async () => {
      const { parseEml } = await import(workerData.entry);
      const input = 'Subject: HTML boundary\\r\\nContent-Type: multipart/mixed; boundary=html\\r\\n\\r\\n--html\\r\\nContent-Type: text/plain\\r\\n\\r\\nSTART_MARKER\\r\\n--html\\r\\nContent-Type: text/html; charset=utf-8\\r\\n\\r\\n' + workerData.html + '\\r\\n--html--\\r\\n';
      const result = await parseEml(new TextEncoder().encode(input).buffer, 'html.eml', [], new Map());
      parentPort.postMessage({
        htmlLength: result.html.length,
        htmlEndsWithSource: result.html.endsWith(workerData.html),
        textStartsWithMarker: result.text.startsWith('START_MARKER\\n'),
        textEnd: result.text.slice(-10)
      });
    })().catch(error => { throw error; });
  `, { eval: true, workerData: { entry: new URL('../dist/email.js', import.meta.url).href, html } })
  try {
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('HTML conversion exceeded 10 seconds')), 10000)
      worker.once('message', (value) => { clearTimeout(timer); resolve(value) })
      worker.once('error', (error) => { clearTimeout(timer); reject(error) })
      worker.once('exit', (code) => {
        if (code !== 0) { clearTimeout(timer); reject(new Error('HTML Worker failed: ' + code)) }
      })
    })
    assert.equal(result.htmlLength, '<div>START_MARKER</div>\n'.length + html.length)
    assert.equal(result.htmlEndsWithSource, true)
    assert.equal(result.textStartsWithMarker, true)
    assert.equal(result.textEnd, 'END_MARKER')
  } finally { await worker.terminate() }
})
