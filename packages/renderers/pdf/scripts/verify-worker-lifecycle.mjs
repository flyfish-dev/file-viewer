import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, delimiter, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(packageDir, '../../..')
const runtime = resolve(
  process.env.PDFJS_LIFECYCLE_RUNTIME_DIR || resolve(packageDir, 'dist/vendor/pdfjs')
)
const output = resolve(
  sourceRoot,
  process.env.PDFJS_LIFECYCLE_OUTPUT_DIR || 'output/pdf-worker-lifecycle'
)
const require = createRequire(import.meta.url)
const modulePaths = (process.env.PATH || '')
  .split(delimiter)
  .filter((entry) => entry.endsWith(`${sep}node_modules${sep}.bin`))
  .map((entry) => resolve(entry, '..'))
const imported = await import(
  pathToFileURL(require.resolve('playwright', { paths: [sourceRoot, ...modulePaths] })).href
)
const { chromium, webkit } = imported.default || imported

function createPdf() {
  const content = 'BT /F1 24 Tf 40 160 Td (PDF lifecycle regression) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 220] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ]
  let pdf = '%PDF-1.7\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf)
}

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname
    if (path === '/') {
      res.setHeader('Content-Type', 'text/html')
      res.end(
        '<!doctype html><meta charset="utf-8"><title>PDF lifecycle regression</title><canvas></canvas>'
      )
      return
    }
    if (path === '/sample.pdf') {
      res.setHeader('Content-Type', 'application/pdf')
      res.end(createPdf())
      return
    }
    const file = resolve(runtime, path.slice(1))
    if (!file.startsWith(`${runtime}${sep}`)) throw new Error('Invalid asset path')
    res.setHeader(
      'Content-Type',
      path.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream'
    )
    res.end(await readFile(file))
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const reports = []
await mkdir(output, { recursive: true })
try {
  for (const [engine, type] of [
    ['chromium', chromium],
    ['webkit', webkit]
  ]) {
    const browser = await type.launch({ headless: true })
    try {
      for (const mode of ['real', 'fake']) {
        const page = await browser.newPage()
        const errors = []
        const requests = []
        const report = { engine, mode, passed: false, errors, requests }
        reports.push(report)
        page.on('pageerror', (error) => errors.push({ message: error.message, stack: error.stack }))
        page.on('request', (request) => {
          if (/^https?:/.test(request.url()) && !request.url().startsWith(`${origin}/`))
            errors.push({ message: `External request: ${request.url()}` })
        })
        page.on('response', (response) =>
          requests.push({
            url: response.url(),
            status: response.status(),
            mime: response.headers()['content-type']
          })
        )
        try {
          await page.goto(origin)
          report.result = await page.evaluate(async (mode) => {
            const pdf = await import('/legacy/build/pdf.mjs')
            if (mode === 'fake') await import('/legacy/build/pdf.worker.mjs')
            pdf.GlobalWorkerOptions.workerSrc = '/legacy/build/pdf.worker.mjs'
            const bytes = new Uint8Array(await fetch('/sample.pdf').then((r) => r.arrayBuffer()))
            const cancellations = []
            for (let i = 0; i < 10; i++) {
              const worker = new pdf.PDFWorker({ name: 'file-viewer-cancel-regression' })
              let timer
              let cancel
              const canceled = new Promise((resolve) => {
                cancel = resolve
              })
              try {
                await worker.promise
                const actualMode = worker.port instanceof Worker ? 'real' : 'fake'
                if (actualMode !== mode)
                  throw new Error(`Expected ${mode} Worker, received ${actualMode}`)
                const postMessage = worker.port.postMessage.bind(worker.port)
                let task
                worker.port.postMessage = (message, ...args) => {
                  postMessage(message, ...args)
                  if (message.action === 'Ready') {
                    // Cancel after the real document transport starts, before
                    // initialization settles. No sleep-based race or mock parser.
                    queueMicrotask(() => {
                      task.destroy().then(
                        () => cancel('destroyed'),
                        (error) => cancel(error.message)
                      )
                    })
                  }
                }
                task = pdf.getDocument({ data: bytes.slice(), worker })
                task.promise.catch(() => {})
                cancellations.push(
                  await Promise.race([
                    canceled,
                    new Promise((resolve) => {
                      timer = setTimeout(() => resolve('timeout'), 5000)
                    })
                  ])
                )
              } finally {
                clearTimeout(timer)
                worker.destroy()
              }
              await new Promise((resolve) => setTimeout(resolve, 20))
            }
            const worker = new pdf.PDFWorker({ name: 'file-viewer-after-cancel' })
            let task
            try {
              await worker.promise
              const actualMode = worker.port instanceof Worker ? 'real' : 'fake'
              if (actualMode !== mode)
                throw new Error(`Expected ${mode} recovery Worker, received ${actualMode}`)
              task = pdf.getDocument({
                data: bytes.slice(),
                worker,
                standardFontDataUrl: '/standard_fonts/'
              })
              const document = await task.promise
              const firstPage = await document.getPage(1)
              const text = (await firstPage.getTextContent()).items
                .map((item) => item.str || '')
                .join('')
              const canvas = window.document.querySelector('canvas')
              const viewport = firstPage.getViewport({ scale: 1 })
              canvas.width = viewport.width
              canvas.height = viewport.height
              const context = canvas.getContext('2d')
              await firstPage.render({ canvas, canvasContext: context, viewport }).promise
              const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
              let ink = 0
              for (let i = 0; i < pixels.length; i += 4)
                if (pixels[i + 3] && pixels[i] < 100 && pixels[i + 1] < 100 && pixels[i + 2] < 100)
                  ink++
              await task.destroy()
              task = pdf.getDocument({
                data: new TextEncoder().encode('%PDF-1.7\ninvalid regression input'),
                worker
              })
              let failure
              try {
                await task.promise
              } catch (error) {
                failure = { name: error.name, message: error.message }
              }
              return { cancellations, text, ink, failure }
            } finally {
              await task?.destroy()
              worker.destroy()
            }
          }, mode)
          assert.deepEqual(report.result.cancellations, Array(10).fill('destroyed'))
          assert.equal(report.result.text, 'PDF lifecycle regression')
          assert.ok(report.result.ink > 100, 'The document must really render after cancellation')
          assert.equal(
            report.result.failure?.name,
            'InvalidPDFException',
            'Active parse errors must remain observable'
          )
          assert.deepEqual(errors, [])
          for (const response of requests) assert.equal(response.status, 200, response.url)
          await page.screenshot({ path: resolve(output, `${engine}-${mode}.png`) })
          report.passed = true
          console.log(
            `[pdf-worker-lifecycle] ${engine}/${mode}: ten canceled startups, rendered recovery and invalid-input rejection passed`
          )
        } finally {
          await page.close()
        }
      }
    } finally {
      await browser.close()
    }
  }
} finally {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ runtime, reports }, null, 2))
}
