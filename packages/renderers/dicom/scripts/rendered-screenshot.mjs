import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import { PNG } from 'pngjs'

export function measureRenderedScreenshot(bytes, canvas, viewport) {
  assert.ok(bytes.length >= 24 && bytes.length <= 16 * 1024 * 1024, 'Invalid screenshot size')
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Screenshot must be PNG')
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  assert.ok(width > 0 && height > 0 && width * height <= 16_777_216, 'Screenshot dimensions exceed the gate limit')
  assert.ok(viewport?.width > 0 && viewport.height > 0, 'Missing screenshot viewport')
  assert.ok(canvas?.width > 0 && canvas.height > 0, 'Missing visible CT canvas')
  const scaleX = width / viewport.width
  const scaleY = height / viewport.height
  // Measure the image center. The toolbar and bottom metadata badge cannot
  // supply bright UI text that makes a blank image pass this assertion.
  const measured = {
    x: Math.ceil((canvas.x + canvas.width * 0.1) * scaleX),
    y: Math.ceil((canvas.y + canvas.height * 0.1) * scaleY),
    right: Math.floor((canvas.x + canvas.width * 0.9) * scaleX),
    bottom: Math.floor((canvas.y + canvas.height * 0.9) * scaleY)
  }
  assert.ok(measured.x >= 0 && measured.y >= 0 && measured.right <= width && measured.bottom <= height && measured.right > measured.x && measured.bottom > measured.y, 'CT image center must fit in the captured screenshot')
  const png = PNG.sync.read(bytes, { checkCRC: true })
  let maximum = 0
  let bright = 0
  let pixels = 0
  const imageHash = createHash('sha256')
  for (let y = measured.y; y < measured.bottom; y++) {
    imageHash.update(png.data.subarray((y * width + measured.x) * 4, (y * width + measured.right) * 4))
    for (let x = measured.x; x < measured.right; x++) {
      const index = (y * width + x) * 4
      const alpha = png.data[index + 3] / 255
      const red = Math.round(png.data[index] * alpha)
      const green = Math.round(png.data[index + 1] * alpha)
      const blue = Math.round(png.data[index + 2] * alpha)
      maximum = Math.max(maximum, red, green, blue)
      if (red > 16) bright++
      pixels++
    }
  }
  return { width, height, canvas, measured, maximum, brightRatio: bright / pixels, imageSha256: imageHash.digest('hex') }
}

export async function retainRenderedScreenshot(page, result, path) {
  const canvas = await page.locator('#viewer .dicom-stage canvas').first().boundingBox()
  const viewport = page.viewportSize()
  const bytes = await page.screenshot({ path })
  result.screenshot = {
    file: basename(path),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    ...measureRenderedScreenshot(bytes, canvas, viewport)
  }
  assert.ok(result.screenshot.maximum > 64 && result.screenshot.brightRatio > 0.01, 'Captured CT screenshot must have maximum > 64 and brightRatio > 0.01')
}
