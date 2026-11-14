import { readFile } from 'node:fs/promises'

export async function installBrowserScrollContainerResolver(
  page,
  baseUrl,
  {
    readModule = () =>
      readFile(new URL('../../../core/dist/features/document/dom/scroll.js', import.meta.url))
  } = {}
) {
  const url = new URL('/__file-viewer-smoke/core-scroll-container.js', baseUrl).href
  const body = await readModule()
  const serveModule = (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body })
  await page.route(url, serveModule)
  try {
    // Execute the actual built core API, rather than a renderer-specific
    // selector or a second implementation of scroll-container ownership.
    await page.evaluate(async (url) => {
      const core = await import(url)
      window.__fileViewerSmokeResolveScrollContainer = core.resolveFileViewerScrollContainer
    }, url)
  } catch (error) {
    await page.unroute(url, serveModule)
    throw error
  }
  return async () => {
    await page.unroute(url, serveModule)
    await page.evaluate(() => {
      delete window.__fileViewerSmokeResolveScrollContainer
    })
  }
}
