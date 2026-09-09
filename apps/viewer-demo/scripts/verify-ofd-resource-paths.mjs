import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { delimiter, dirname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  createResourcePathFixture,
  pixelPng,
  resourcePathCases
} from '../../../packages/renderers/ofd/test/fixtures/resource-path-fixture.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export async function verifyOfdResourcePaths({ page, origin, output, evidence }) {
  await mkdir(output, { recursive: true })
  for (const [name, options] of [
    ...resourcePathCases,
    ['malformed-page', { malformedPage: true }],
    ['missing-page', { missingPage: true }]
  ]) {
    const bytes = Buffer.from(await createResourcePathFixture(options))
    await writeFile(resolve(output, `${name}.ofd`), bytes)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(origin, { waitUntil: 'domcontentloaded' })
    await page.locator('.viewer-file-identity').hover()
    await page.locator('.rail-nav-button--upload:not([aria-hidden="true"])').click()
    await page
      .locator('.desktop-upload-dropzone input[type=file]')
      .setInputFiles({ name: `${name}.ofd`, mimeType: 'application/ofd', buffer: bytes })
    if (options.malformedPage || options.missingPage) {
      const error = page.getByText(/OFD XML (?:parse failed|resource not found)/).first()
      await error.waitFor({ state: 'visible', timeout: 15_000 })
      assert.match(await error.textContent(), /Doc_0\/Pages\/Page_0\/Content\.xml/)
    } else {
      const frame = page.locator('.ofd-page-frame').first()
      await frame
        .getByText('Invoice resource reference', { exact: true })
        .waitFor({ state: 'visible', timeout: 30_000 })
      if (options.missingImage || options.missingResource) {
        assert.equal(await frame.locator('img').count(), 0)
      } else {
        const image = frame.locator('img').first()
        assert.equal(
          await image.getAttribute('src'),
          `data:image/png;base64,${pixelPng.toString('base64')}`
        )
        await image.evaluate((image) => image.decode())
        assert.equal(await image.evaluate((image) => image.naturalWidth), 1)
      }
    }
    await page.screenshot({ path: resolve(output, `${name}.png`) })
    evidence.cases.push({
      name: `ofd-resource-${name}`,
      input: 'native-file-upload',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      expectedFailure: !!(options.malformedPage || options.missingPage),
      passed: true
    })
  }
  console.log(
    '[ofd-resources] Native uploads preserve declared images/text, resolve nested and namespace variants, and report invalid page paths without hanging'
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const origin = process.env.OFD_RESOURCE_DEMO_URL
  assert.ok(origin, 'Set OFD_RESOURCE_DEMO_URL to the locally built candidate Demo')
  const require = createRequire(import.meta.url)
  const paths = [
    root,
    ...(process.env.PATH || '')
      .split(delimiter)
      .filter((path) => path.endsWith(`${sep}node_modules${sep}.bin`))
      .map((path) => resolve(path, '..'))
  ]
  const playwright = await import(pathToFileURL(require.resolve('playwright', { paths })).href)
  const name = process.env.OFD_RESOURCE_BROWSER || 'chromium'
  assert.ok(['chromium', 'webkit'].includes(name))
  const browser = await (playwright[name] || playwright.default[name]).launch({ headless: true })
  const page = await browser.newPage()
  const output = resolve(root, 'output/ofd-resource-paths', name)
  const evidence = { origin, browser: name, cases: [], errors: [] }
  page.on('pageerror', (error) => evidence.errors.push(error.message))
  try {
    await verifyOfdResourcePaths({ page, origin, output, evidence })
    assert.deepEqual(evidence.errors, [])
    evidence.passed = true
  } finally {
    await mkdir(output, { recursive: true })
    await writeFile(resolve(output, 'report.json'), `${JSON.stringify(evidence, null, 2)}\n`)
    await browser.close()
  }
}
