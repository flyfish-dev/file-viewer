import assert from 'node:assert/strict'

/** Give Blob Workers a normal same-origin context without network access. */
export async function establishWordBrowserOrigin(page) {
  const url = 'http://docx-fixture.test/'
  const serve = route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><meta charset="utf-8">'
  })
  await page.route(url, serve)
  try {
    await page.goto(url)
    assert.equal(await page.evaluate(() => location.origin), new URL(url).origin)
  } finally {
    await page.unroute(url, serve)
  }
}
