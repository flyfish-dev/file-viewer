import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import { getContentTypes, getSlideSizeAndSetDefaultTextStyle, processSingleSlide } from '../packages/renderers/pptx/src/engine/support/vendor'
import { readJpegExifOrientation } from '../packages/renderers/pptx/src/engine/support/image'

const require = createRequire(new URL('../packages/renderers/pptx/package.json', import.meta.url))
const JSZip = require('jszip')

// A synthetic metadata-only JPEG exercises the existing EXIF rewrite without
// adding a reporter's file or depending on a browser image decoder.
function jpeg(orientation = 6) {
  const bytes = new Uint8Array(40)
  const view = new DataView(bytes.buffer)
  bytes.set([0xff, 0xd8, 0xff, 0xe1])
  view.setUint16(4, 34, false)
  bytes.set([0x45, 0x78, 0x69, 0x66, 0, 0, 0x49, 0x49], 6)
  view.setUint16(14, 0x2a, true)
  view.setUint32(16, 8, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 0x0112, true)
  view.setUint16(24, 3, true)
  view.setUint32(26, 1, true)
  view.setUint16(30, orientation, true)
  bytes.set([0xff, 0xd9], 38)
  return bytes
}

const transform = '<a:xfrm rot="5400000"><a:off x="914400" y="914400"/><a:ext cx="1828800" cy="914400"/></a:xfrm>'
const geometry = '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
const picture = '<p:pic><p:nvPicPr><p:cNvPr id="2" name="Picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rImage"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>' + transform + geometry + '</p:spPr></p:pic>'
const fill = '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Fill"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>' + transform + geometry + '<a:blipFill><a:blip r:embed="rImage"/><a:stretch><a:fillRect/></a:stretch></a:blipFill></p:spPr></p:sp>'
const bullet = '<p:sp><p:nvSpPr><p:cNvPr id="4" name="Bullet"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>' + transform + geometry + '</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr marL="0" indent="0"><a:buSzPct val="100000"/><a:buBlip><a:blip r:embed="rImage"/></a:buBlip></a:pPr><a:r><a:rPr sz="1200"/><a:t>Item</a:t></a:r></a:p></p:txBody></p:sp>'

async function fixture({ name = 'image.JFIF', declarations = '<Default Extension="jfif" ContentType="image/jpeg"/>', nodes = picture, bytes = jpeg(), external = false, discover = true } = {}) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<Types>${declarations}<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`)
  zip.file('ppt/presentation.xml', '<p:presentation><p:sldSz cx="9144000" cy="6858000"/></p:presentation>')
  zip.file('ppt/slides/slide1.xml', `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree>${nodes}</p:spTree></p:cSld></p:sld>`)
  const target = (external ? 'https://invalid.example/image.jfif' : '../media/' + name).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  zip.file('ppt/slides/_rels/slide1.xml.rels', `<Relationships><Relationship Id="rImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"${external ? ' TargetMode="External"' : ''}/></Relationships>`)
  zip.file('ppt/media/' + name, bytes)
  if (discover) await getContentTypes(zip)
  return { zip, name, bytes }
}

async function render(input: Awaited<ReturnType<typeof fixture>>) {
  vi.stubGlobal('self', { postMessage() {} })
  const size = await getSlideSizeAndSetDefaultTextStyle(input.zip)
  return processSingleSlide(input.zip, 'ppt/slides/slide1.xml', 0, size)
}

function dataImages(html: string) {
  return [...html.matchAll(/data:(image\/[^;,'")]+);base64,([a-zA-Z0-9+/=]+)/g)].map(match => ({ mime: match[1], bytes: Uint8Array.from(Buffer.from(match[2], 'base64')) }))
}

afterEach(() => vi.unstubAllGlobals())

describe('PPTX embedded image content types', () => {
  it.each([['picture', picture], ['shape fill', fill], ['picture bullet', bullet]])('uses the OPC JPEG declaration and normalizes EXIF for %s', async (_kind, nodes) => {
    const input = await fixture({ nodes })
    const before = await input.zip.file('ppt/media/' + input.name).async('uint8array')
    const html = await render(input)
    const images = dataImages(html)
    expect(images).toHaveLength(1)
    expect(images[0].mime).toBe('image/jpeg')
    expect(readJpegExifOrientation(images[0].bytes)).toBe(1)
    expect(await input.zip.file('ppt/media/' + input.name).async('uint8array')).toEqual(before)
    expect(readJpegExifOrientation(before)).toBe(6)
    expect(html).not.toContain('data:undefined')
    expect(html).not.toContain('data:;')
  })

  it('gives a part Override precedence over a Default and normalizes extension/MIME case', async () => {
    const input = await fixture({ name: 'image.BIN', declarations: '<Default Extension="BIN" ContentType="image/png"/><Override PartName="/ppt/media/image.BIN" ContentType=" Image/JPEG "/>' })
    const images = dataImages(await render(input))
    expect(images).toHaveLength(1)
    expect(images[0].mime).toBe('image/jpeg')
    expect(readJpegExifOrientation(images[0].bytes)).toBe(1)
  })

  it('does not use a Default when an unsupported part Override is present', async () => {
    const input = await fixture({ name: 'image.bin', declarations: '<Default Extension="bin" ContentType="image/png"/><Override PartName="/ppt/media/image.bin" ContentType="text/html"/>' })
    expect(dataImages(await render(input))).toEqual([])
  })

  it('reads image declarations for direct slide consumers without a prior discovery call', async () => {
    const input = await fixture({ name: 'image.bin', declarations: '<Default Extension="bin" ContentType="image/jpeg"/>', discover: false })
    expect(dataImages(await render(input))[0].mime).toBe('image/jpeg')
  })

  it('looks up fill parts using their package path instead of an HTML-escaped path', async () => {
    const input = await fixture({ name: "image'copy.jpg", declarations: '', nodes: fill })
    expect(dataImages(await render(input))[0].mime).toBe('image/jpeg')
    expect(readJpegExifOrientation(await input.zip.file('ppt/media/' + input.name).async('uint8array'))).toBe(6)
  })

  it.each(['jpg', 'JPEG', 'jpe', 'JFIF'])('keeps the JPEG extension fallback for %s without an OPC declaration', async name => {
    const images = dataImages(await render(await fixture({ name: 'image.' + name, declarations: '' })))
    expect(images).toHaveLength(1)
    expect(images[0].mime).toBe('image/jpeg')
    expect(readJpegExifOrientation(images[0].bytes)).toBe(1)
  })

  it.each(['text/html', 'application/javascript', 'image/jpeg;evil=1', 'image/unknown'])('does not trust unsupported content type %s', async contentType => {
    const unknown = await fixture({ name: 'image.bin', declarations: `<Default Extension="bin" ContentType="${contentType}"/>` })
    const html = await render(unknown)
    expect(dataImages(html)).toEqual([])
    expect(html).not.toContain('data:' + contentType)
    const known = await fixture({ name: 'image.jpg', declarations: `<Default Extension="jpg" ContentType="${contentType}"/>` })
    expect(dataImages(await render(known))[0].mime).toBe('image/jpeg')
  })

  it('keeps MIME declarations isolated by package even for identical part paths', async () => {
    const declared = await fixture({ name: 'image.bin', declarations: '<Default Extension="bin" ContentType="image/jpeg"/>' })
    const unknown = await fixture({ name: 'image.bin', declarations: '' })
    expect(dataImages(await render(declared))[0].mime).toBe('image/jpeg')
    expect(dataImages(await render(unknown))).toEqual([])
    expect(dataImages(await render(declared))[0].mime).toBe('image/jpeg')
  })

  it.each([['picture', picture], ['shape fill', fill], ['picture bullet', bullet]])('preserves DrawingML layout and source XML for %s when using a JPEG alias', async (_kind, nodes) => {
    const original = await fixture({ name: 'image.jpg', declarations: '', nodes })
    const alias = await fixture({ nodes })
    const sourceXml = await alias.zip.file('ppt/slides/slide1.xml').async('string')
    const aliasHtml = await render(alias)
    const originalHtml = await render(original)
    // Generated CSS identifiers and parser order counters vary between calls.
    // Compare the actual geometry, transform and image bytes instead.
    const layout = (html: string) => [...parseHTML(html).document.querySelectorAll('.drawing,.block,img')].map(element => ({
      tag: element.tagName,
      top: element.style.top,
      left: element.style.left,
      width: element.style.width,
      height: element.style.height,
      transform: element.style.transform,
      objectFit: element.style.objectFit,
    }))
    expect(layout(aliasHtml)).toEqual(layout(originalHtml))
    expect(aliasHtml).toContain('rotate(90deg)')
    expect(dataImages(aliasHtml)).toEqual(dataImages(originalHtml))
    expect(await alias.zip.file('ppt/slides/slide1.xml').async('string')).toBe(sourceXml)
  })

  it.each([
    ['image/png', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1QAAAAASUVORK5CYII='],
    ['image/gif', 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'],
    ['image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>').toString('base64')],
  ])('preserves existing %s image bytes declared on a part', async (mime, base64) => {
    const bytes = Uint8Array.from(Buffer.from(base64, 'base64'))
    const input = await fixture({ name: 'image.bin', declarations: `<Override PartName="/ppt/media/image.bin" ContentType="${mime}"/>`, bytes })
    expect(dataImages(await render(input))).toEqual([{ mime, bytes }])
  })

  it('does not fetch or emit an externally linked picture', async () => {
    const html = await render(await fixture({ external: true }))
    expect(dataImages(html)).toEqual([])
    expect(parseHTML(html).document.querySelector('img')).toBeNull()
    expect(html).not.toContain('invalid.example')
  })
})
