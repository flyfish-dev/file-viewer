import assert from 'node:assert/strict'
import test from 'node:test'
import renderPsdAsset from '../dist/psd.js'

function compositePsd(width, height, pixels = false) {
  const buffer = new ArrayBuffer(40 + (pixels ? width * height * 3 : 0))
  const bytes = new Uint8Array(buffer)
  bytes.set(new TextEncoder().encode('8BPS'))
  const view = new DataView(buffer)
  view.setUint16(4, 1)
  view.setUint16(12, 3)
  view.setUint32(14, height)
  view.setUint32(18, width)
  view.setUint16(22, 8)
  view.setUint16(24, 3)
  if (pixels) bytes.fill(255, 40, 40 + width * height)
  return buffer
}

// These inputs reach the real decoder. Budget rejection must happen before
// its canvas factory or renderer DOM can allocate anything.
const untouchedTarget = {
  ownerDocument: {},
  replaceChildren() { assert.fail('Rejected pixels must not replace the host') },
}

test('legacy PSD rejects a composite above 128 MiB before allocating pixels', async () => {
  await assert.rejects(
    renderPsdAsset(compositePsd(8000, 5000), untouchedTarget),
    /Exceeded memory limit/
  )
})

test('legacy PSD honors a smaller configured decoded budget', async () => {
  await assert.rejects(
    renderPsdAsset(compositePsd(2, 2, true), untouchedTarget, {
      options: { design: { maxDecodedBytes: 8 } },
    }),
    /Exceeded memory limit/
  )
})

test('invalid decoded budgets retain the finite default', async () => {
  for (const maxDecodedBytes of [0, -1, NaN, Infinity, 1.5]) {
    await assert.rejects(
      renderPsdAsset(compositePsd(8000, 5000), untouchedTarget, {
        options: { design: { maxDecodedBytes } },
      }),
      /Exceeded memory limit/
    )
  }
})
