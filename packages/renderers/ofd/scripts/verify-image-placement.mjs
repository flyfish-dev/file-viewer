import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DOMParser, parseHTML } from 'linkedom'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const repositoryRoot = resolve(packageDir, '../../..')
const fixturesDir = join(packageDir, 'test', 'fixtures')

globalThis.DOMParser = DOMParser
const { document, window } = parseHTML('<!doctype html><html><body></body></html>')
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = value => Buffer.from(value, 'binary').toString('base64')
}

const { parseOfdDocument, renderOfdByScale, setPageScale } = await import(
  pathToFileURL(join(packageDir, 'vendor/dltech/ofd/ofd.js')).href
)
const { converterDpi, parseStBox } = await import(
  pathToFileURL(join(packageDir, 'vendor/dltech/ofd/ofd_util.js')).href
)
const { renderImageObject } = await import(
  pathToFileURL(join(packageDir, 'vendor/dltech/ofd/ofd_render.js')).href
)

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`verify-image-placement: ${message}`)
  }
}

const parseOfd = bytes => new Promise((success, fail) => {
  parseOfdDocument({
    ofd: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    success,
    fail,
  })
})

const normalizeNodes = value => value == null ? [] : Array.isArray(value) ? value : [value]

const collectImageObjects = (node, images = []) => {
  if (!node || typeof node !== 'object') {
    return images
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'ofd:ImageObject') {
      images.push(...normalizeNodes(value).filter(Boolean))
      continue
    }
    if (!key.startsWith('@_') && key !== 'xml') {
      for (const child of normalizeNodes(value)) {
        collectImageObjects(child, images)
      }
    }
  }
  return images
}

const parseStyleNumber = (style, property) => {
  const match = style.match(new RegExp(`${property}:\\s*(-?[\\d.]+)px`))
  return match ? Number(match[1]) : Number.NaN
}

const parseZIndex = style => {
  const match = style.match(/z-index:\s*(-?[\d.]+)/)
  return match ? Number(match[1]) : Number.NaN
}

const parseCtm = value => {
  if (!value) return null
  const values = String(value).trim().split(/\s+/).map(Number)
  return values.length === 6 && values.every(Number.isFinite) ? values : null
}

const getRenderedImageBox = image => {
  const parent = image.parentElement
  if (parent?.tagName === 'DIV' && Number.isFinite(parseZIndex(parent.getAttribute('style') || ''))) {
    return parent
  }
  return image
}

const almostEqual = (actual, expected, tolerance = 0.05) =>
  Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance

for (const [ctm, transform] of [
  ['8 0 0 12 15 18', ''],
  ['-8 0 0 12 15 18', 'scale(-1, 1)'],
  ['8 0 0 -12 15 18', 'scale(1, -1)'],
  ['-8 0 0 -12 15 18', 'scale(-1, -1)'],
]) {
  const element = renderImageObject(300, 400, {
    1: { format: 'png', img: 'data:image/png;base64,' },
  }, { '@_Boundary': '10 20 40 50', '@_CTM': ctm, '@_ResourceID': 1, pfIndex: 0 })
  assert((element.style.transform || '') === transform, `CTM ${ctm} lost its signed image scale`)
}

const verifyFile = async filePath => {
  const bytes = await readFile(filePath)
  const documents = await parseOfd(bytes)
  let pageCount = 0
  let ordinaryImageCount = 0
  let sealImageCount = 0

  for (const ofdDocument of documents) {
    setPageScale(1)
    const renderedPages = renderOfdByScale(ofdDocument)
    assert(
      renderedPages.length === ofdDocument.pages.length,
      `${filePath}: rendered ${renderedPages.length}/${ofdDocument.pages.length} pages`,
    )

    for (let pageIndex = 0; pageIndex < ofdDocument.pages.length; pageIndex += 1) {
      const sourcePage = ofdDocument.pages[pageIndex]
      const renderedPage = renderedPages[pageIndex]
      pageCount += 1
      sealImageCount += renderedPage.querySelectorAll('[name="seal_img_div"] img').length

      const renderedImages = Array.from(renderedPage.querySelectorAll('img, canvas'))
        .filter(image => !image.closest('[name="seal_img_div"]'))
        .map(getRenderedImageBox)
      const renderedByOrder = new Map(
        renderedImages.map(image => [parseZIndex(image.getAttribute('style') || ''), image]),
      )

      for (const imageObject of collectImageObjects(sourcePage)) {
        const boundary = parseStBox(imageObject['@_Boundary'])
        const ctm = parseCtm(imageObject['@_CTM'])
        const order = Number(imageObject.pfIndex)
        const renderedImage = renderedByOrder.get(order)
        assert(renderedImage, `${filePath}: page ${pageIndex + 1} image ${imageObject['@_ID'] || order} was not rendered`)
        ordinaryImageCount += 1

        const style = renderedImage.getAttribute('style') || ''
        if (!ctm) {
          assert(
            almostEqual(parseStyleNumber(style, 'left'), converterDpi(boundary.x))
              && almostEqual(parseStyleNumber(style, 'top'), converterDpi(boundary.y)),
            `${filePath}: page ${pageIndex + 1} image ${imageObject['@_ID'] || order} lost its Boundary position: ${style}`,
          )
          continue
        }

        const [a, b, c, d, e, f] = ctm
        if (Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6) {
          const expected = {
            left: converterDpi(boundary.x + Math.min(e, e + a)),
            top: converterDpi(boundary.y + Math.min(f, f + d)),
            width: converterDpi(Math.abs(a)),
            height: converterDpi(Math.abs(d)),
          }
          for (const [property, value] of Object.entries(expected)) {
            assert(
              almostEqual(parseStyleNumber(style, property), value),
              `${filePath}: page ${pageIndex + 1} image ${imageObject['@_ID'] || order} expected ${property}=${value}, got: ${style}`,
            )
          }
          if (a < 0 || d < 0) {
            const expectedScale = `scale(${a < 0 ? -1 : 1}, ${d < 0 ? -1 : 1})`
            assert(renderedImage.style.transform === expectedScale,
              `${filePath}: page ${pageIndex + 1} image ${imageObject['@_ID'] || order} lost its signed image scale`)
          }
        } else {
          const matrix = /transform:\s*matrix\(([^)]+)\)/.exec(style)?.[1]?.split(/\s*,\s*/).map(Number)
          assert(matrix?.length === 6, `${filePath}: page ${pageIndex + 1} rotated image is missing its CTM: ${style}`)
          assert(
            almostEqual(matrix[4], converterDpi(boundary.x + e))
              && almostEqual(matrix[5], converterDpi(boundary.y + f)),
            `${filePath}: page ${pageIndex + 1} rotated image lost its Boundary origin: ${style}`,
          )
        }
      }
    }
  }

  return { pageCount, ordinaryImageCount, sealImageCount }
}

const fixtureFiles = (await readdir(fixturesDir))
  .filter(name => name.endsWith('.ofd'))
  .sort()
  .map(name => join(fixturesDir, name))
const sampleFiles = [join(repositoryRoot, 'apps/viewer-demo/public/example/ofd.ofd'), ...process.argv.slice(2)]

let pageCount = 0
let ordinaryImageCount = 0
let sealImageCount = 0
for (const filePath of [...fixtureFiles, ...sampleFiles]) {
  const result = await verifyFile(filePath)
  pageCount += result.pageCount
  ordinaryImageCount += result.ordinaryImageCount
  sealImageCount += result.sealImageCount
}

assert(ordinaryImageCount > 0, 'the bundled OFD samples did not exercise ordinary image rendering')
assert(sealImageCount > 0, 'the bundled OFD samples did not exercise seal image rendering')
console.log(
  `verify-image-placement: ${fixtureFiles.length + sampleFiles.length} OFD files, ${pageCount} pages, `
    + `${ordinaryImageCount} ordinary images and ${sealImageCount} seal images OK`,
)
