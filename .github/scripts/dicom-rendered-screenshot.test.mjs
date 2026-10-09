import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PNG } from 'pngjs'
import {
  measureRenderedScreenshot,
  retainRenderedScreenshot
} from '../../packages/renderers/dicom/scripts/rendered-screenshot.mjs'

const canvas = { x: 8, y: 56, width: 480, height: 512 }
const viewport = { width: 1280, height: 720 }

test('the actual blank Linux WebKit PNG fails despite its bright toolbar and metadata', async () => {
  const bytes = readFileSync(new URL('./fixtures/dicom-webkit-blank.png', import.meta.url))
  const page = {
    locator: () => ({ first: () => ({ boundingBox: async () => canvas }) }),
    viewportSize: () => viewport,
    screenshot: async () => bytes
  }
  const result = {}
  await assert.rejects(
    retainRenderedScreenshot(page, result, 'webkit.png'),
    /Captured CT screenshot/
  )
  assert.equal(
    result.screenshot.sha256,
    '70de206b007bb7966a14698282869fa14ae5184d7873010e893b799327ea660f'
  )
  assert.equal(result.screenshot.maximum, 13)
  assert.equal(result.screenshot.brightRatio, 0)
})

test('the actual rendered Chromium PNG supplies visible CT evidence', () => {
  const bytes = readFileSync(new URL('./fixtures/dicom-chromium-rendered.png', import.meta.url))
  const result = measureRenderedScreenshot(bytes, canvas, viewport)
  assert.ok(result.maximum > 64 && result.brightRatio > 0.01)
})

test('screenshot evidence keeps both strict thresholds and rejects an offscreen canvas', async () => {
  for (const color of [0, 64]) {
    const png = new PNG({ width: 16, height: 16 })
    for (let index = 0; index < png.data.length; index += 4) {
      png.data[index] = png.data[index + 1] = png.data[index + 2] = color
      png.data[index + 3] = 255
    }
    const bytes = PNG.sync.write(png)
    const box = { x: 0, y: 0, width: 16, height: 16 }
    const page = {
      locator: () => ({ first: () => ({ boundingBox: async () => box }) }),
      viewportSize: () => ({ width: 16, height: 16 }),
      screenshot: async () => bytes
    }
    await assert.rejects(
      retainRenderedScreenshot(page, {}, 'negative.png'),
      /Captured CT screenshot/
    )
    assert.throws(
      () => measureRenderedScreenshot(bytes, { ...box, x: 17 }, { width: 16, height: 16 }),
      /fit in the captured screenshot/
    )
  }
})

test('a single bright pixel cannot satisfy the minimum rendered area', async () => {
  const png = new PNG({ width: 100, height: 100 })
  for (let index = 3; index < png.data.length; index += 4) png.data[index] = 255
  const index = (50 * 100 + 50) * 4
  png.data[index] = png.data[index + 1] = png.data[index + 2] = 255
  const bytes = PNG.sync.write(png)
  const box = { x: 0, y: 0, width: 100, height: 100 }
  const size = { width: 100, height: 100 }
  const result = measureRenderedScreenshot(bytes, box, size)
  assert.equal(result.maximum, 255)
  assert.ok(result.brightRatio < 0.01)
  const page = {
    locator: () => ({ first: () => ({ boundingBox: async () => box }) }),
    viewportSize: () => size,
    screenshot: async () => bytes
  }
  await assert.rejects(
    retainRenderedScreenshot(page, {}, 'too-sparse.png'),
    /Captured CT screenshot/
  )
})
