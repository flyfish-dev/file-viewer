import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { delimiter, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export async function verifyNativeWordRevisions({ page, origin, output, evidence }) {
  const fixtures = resolve(root, 'packages/renderers/doc/test/fixtures/native-revisions')
  const oracle = JSON.parse(await readFile(resolve(fixtures, 'native-oracle.json'), 'utf8'))
  await mkdir(output, { recursive: true })
  const timeout = 60_000

  async function upload(filename, width, selector) {
    const bytes = await readFile(resolve(fixtures, filename))
    assert.equal(sha256(bytes), oracle.files.find((file) => file.filename === filename).sha256)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout })
    await page.locator('.viewer-file-identity').hover()
    await page.locator('.rail-nav-button--upload:not([aria-hidden="true"])').click()
    await page.locator('.desktop-upload-dropzone input[type=file]').setInputFiles({
      name: filename,
      mimeType: 'application/octet-stream',
      buffer: bytes
    })
    await page.locator(selector).first().waitFor({ state: 'visible', timeout })
    await page
      .locator(selector)
      .first()
      .getByText('Case formatting: STYLE_BEFORE', { exact: true })
      .waitFor({ timeout })
    await page.setViewportSize({ width, height: 900 })
  }

  async function selectMode(mode) {
    const desktopMore = page.locator('[data-viewer-action="more"]')
    if (await desktopMore.isVisible()) await desktopMore.click()
    else await page.locator('.mobile-more-trigger').click()
    await page.locator('[data-viewer-action="settings"]:visible').click()
    await page.locator('#viewer-settings-tab-formats').click()
    await page.locator('.settings-panel select').first().selectOption('word')
    await page.getByTestId('docx-review-mode').selectOption(mode)
    await page.locator('.settings-apply').click()
  }

  const snapshot = (selector) =>
    page
      .locator(selector)
      .first()
      .evaluate((root) => {
        const text = (node) => {
          if (node.nodeType === 3) return node.textContent
          if (node.nodeType !== 1) return ''
          const style = getComputedStyle(node)
          if (style.display === 'none' || style.visibility === 'hidden') return ''
          if (node.dataset.docxTab === 'true') return '\t'
          if (node.localName === 'br') return '\n'
          return [...node.childNodes].map(text).join('')
        }
        const paragraphs = [...root.querySelectorAll('p')].filter((p) => !p.closest('td'))
        const marks = [...root.querySelectorAll('ins,del')].map((node) => ({
          tag: node.localName,
          text: text(node),
          visible:
            getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0,
          decoration: getComputedStyle(node).textDecorationLine
        }))
        return {
          paragraphs: paragraphs.map((p) => {
            const value = text(p)
            return value === '\n' ? '' : value
          }),
          heights: paragraphs.map((p) => p.getBoundingClientRect().height),
          cells: [...root.querySelectorAll('td')].map(text),
          strayInline: [...root.querySelectorAll('article > span, article > ins, article > del')]
            .length,
          unchangedMarks: paragraphs
            .find((p) => p.textContent.startsWith('Case repeated:'))
            ?.querySelectorAll('ins,del').length,
          worker: root.closest('[data-docx-worker]')?.dataset.docxWorker,
          marks
        }
      })

  async function waitSnapshot(selector, predicate) {
    const deadline = Date.now() + timeout
    let current
    while (Date.now() < deadline) {
      if (await page.locator(selector).count()) {
        current = await snapshot(selector)
        if (predicate(current)) {
          await page.evaluate(() => document.fonts.ready)
          await page.evaluate(
            () =>
              new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          )
          return snapshot(selector)
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(
      `Native Word preview did not reach the expected review state: ${JSON.stringify(current)}`
    )
  }

  for (const width of [1280, 390]) {
    for (const extension of ['doc', 'docx']) {
      const selector = extension === 'doc' ? '.msdoc-root' : 'section.docx'
      const references = {}
      for (const mode of ['final', 'original']) {
        await upload(`native-revisions-${mode}.${extension}`, width, selector)
        references[mode] = await waitSnapshot(
          selector,
          (value) =>
            JSON.stringify(value.paragraphs) === JSON.stringify(oracle.references[mode].paragraphs)
        )
        assert.deepEqual(references[mode].cells, oracle.references[mode].cells)
      }
      const filename = `native-revisions.${extension}`
      await upload(filename, width, selector)
      for (const mode of ['all', 'final', 'original', 'all']) {
        await selectMode(mode)
        const current = await waitSnapshot(selector, (value) =>
          mode === 'all'
            ? value.marks.some((mark) => mark.tag === 'del' && mark.visible) &&
              value.marks.some((mark) => mark.tag === 'ins' && mark.visible)
            : JSON.stringify(value.paragraphs) ===
              JSON.stringify(oracle.references[mode].paragraphs)
        )
        assert.equal(current.strayInline, 0)
        assert.equal(current.unchangedMarks, 0)
        if (mode === 'all') {
          assert.ok(
            current.marks.some(
              (mark) =>
                mark.tag === 'del' &&
                mark.text.includes('\u7532\u65b9\uff1a\u661f\u6cb3\u6709\u9650\u516c\u53f8')
            )
          )
          for (const mark of current.marks) {
            assert.ok(mark.visible)
            assert.ok(mark.decoration.includes(mark.tag === 'del' ? 'line-through' : 'underline'))
          }
        } else {
          assert.deepEqual(current.cells, references[mode].cells)
          current.heights.forEach((height, index) =>
            assert.ok(
              Math.abs(height - references[mode].heights[index]) <= 1.5,
              `${extension}/${mode}/${width}: paragraph ${index} height ${height} differs from Word reference ${references[mode].heights[index]}`
            )
          )
        }
        const name = `native-word-${extension}-${mode}-${width}`
        await page.screenshot({ path: resolve(output, `${name}.png`) })
        evidence.cases.push({
          name,
          filename,
          sha256: oracle.files.find((file) => file.filename === filename).sha256,
          producer: `${oracle.producer} ${oracle.version}`,
          mode,
          width,
          sameFile: true,
          ...current,
          passed: true
        })
      }
    }
  }
  console.log(
    '[native-word] DOC/DOCX native upload, all/final/original/all switching, Word reference text and paragraph geometry passed at 1280/390px'
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const origin = process.env.WORD_REVISIONS_DEMO_URL
  assert.ok(origin, 'Set WORD_REVISIONS_DEMO_URL to the locally built candidate Demo')
  const require = createRequire(import.meta.url)
  const paths = [
    root,
    ...(process.env.PATH || '')
      .split(delimiter)
      .filter((path) => path.endsWith(`${sep}node_modules${sep}.bin`))
      .map((path) => resolve(path, '..'))
  ]
  const playwright = await import(pathToFileURL(require.resolve('playwright', { paths })).href)
  const name = process.env.WORD_REVISIONS_BROWSER || 'chromium'
  assert.ok(['chromium', 'webkit'].includes(name))
  const browser = await (playwright[name] || playwright.default?.[name]).launch({ headless: true })
  const page = await browser.newPage()
  const output = resolve(root, 'output/native-word-revisions', name)
  const evidence = { origin, browser: name, cases: [], errors: [] }
  page.on('pageerror', (error) => evidence.errors.push(error.message))
  try {
    await verifyNativeWordRevisions({ page, origin, output, evidence })
    assert.deepEqual(evidence.errors, [])
    evidence.passed = true
  } finally {
    await mkdir(output, { recursive: true })
    await writeFile(resolve(output, 'report.json'), `${JSON.stringify(evidence, null, 2)}\n`)
    await browser.close()
  }
}
