import assert from 'node:assert/strict'

export function respondGeo3dFixtureError(response) {
  if (response.destroyed || response.writableEnded) return
  if (response.headersSent) {
    response.destroy()
    return
  }
  // A filesystem exception can contain the decoded request path. Never reflect
  // it into an HTTP response, including responses from local fixture servers.
  response.writeHead(500, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  })
  response.end('Fixture request failed.\n')
}

export async function verifyGeo3dFixtureErrors(browser, origin) {
  const cases = []
  const page = await browser.newPage()
  try {
    for (const path of [
      '/nested/app/' + encodeURIComponent('<svg id="geo3d-error-injection">'),
      '/nested/app/%'
    ]) {
      const response = await page.goto(origin + path)
      assert.equal(response.status(), 500)
      assert.equal(response.headers()['content-type'], 'text/plain; charset=utf-8')
      assert.equal(response.headers()['x-content-type-options'], 'nosniff')
      assert.equal(await response.text(), 'Fixture request failed.\n')
      assert.equal(await page.locator('#geo3d-error-injection').count(), 0)
      cases.push({ path, status: 'passed', statusCode: response.status() })
    }
  } finally {
    await page.close()
  }
  return cases
}
