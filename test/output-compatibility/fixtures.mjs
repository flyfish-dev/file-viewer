// Deterministic, generated document structure; no embedded fonts or document text.
export async function makeMixedDocument(JSZip, mixed = true) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  const section = (w, h) => `<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="${w}" w:h="${h}"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>`
  const paragraph = (text, properties = '') => `<w:p><w:pPr>${properties}</w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`
  const body = mixed
    ? paragraph('Portrait page', section(11906, 16838)) + paragraph('Landscape page', section(16838, 11906)) + paragraph('Letter page') + section(12240, 15840)
    : paragraph('Single portrait page') + section(11906, 16838)
  zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

export async function makeRotatedPdf({ PDFDocument, rgb, degrees }) {
  const doc = await PDFDocument.create()
  for (const [width, height, rotation] of [[400, 240, 90], [400, 240, 0], [240, 400, 270]]) {
    const page = doc.addPage([width, height])
    page.setRotation(degrees(rotation))
    page.drawRectangle({ x: 0, y: height - 60, width: 100, height: 60, color: rgb(1, 0, 0) })
    page.drawRectangle({ x: width - 100, y: 0, width: 100, height: 60, color: rgb(0, 0, 1) })
  }
  return doc.save()
}

// A generated 16x16 red/green JPEG2000 image, losslessly encoded by OpenJPEG.
const jpx = 'AAAADGpQICANCocKAAAAFGZ0eXBqcDIgAAAAAGpwMiAAAAAtanAyaAAAABZpaGRyAAAAEAAAABAAAwcHAAAAAAAPY29scgEAAAAAABAAAADkanAyY/9P/1EALwAAAAAAEAAAABAAAAAAAAAAAAAAABAAAAAQAAAAAAAAAAAAAwcBAQcBAQcBAf9SAAwAAAABAAQEBAAB/1wAEEBASEhQSEhQSEhQSEhQ/2QAJQABQ3JlYXRlZCBieSBPcGVuSlBFRyB2ZXJzaW9uIDIuNS40/5AACgAAAAAAYAAB/5PPtAgEX8+0CAcf34AIB8/ACAmnz8AIAGmAz8AUAjk2sW/PwBQI8UtdJYDPwBwX2KqIKEQ/z8AkFyyoiTomFletgM/AFCIaDyg/x9oIACFuB/qA/9k='
export async function makeJpxPdf({ PDFDocument, PDFName }) {
  const doc = await PDFDocument.create()
  const page = doc.addPage([160, 160])
  const image = doc.context.register(doc.context.stream(Buffer.from(jpx, 'base64'), {
    Type: 'XObject', Subtype: 'Image', Width: 16, Height: 16,
    ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'JPXDecode',
  }))
  page.node.set(PDFName.of('Resources'), doc.context.obj({ XObject: { Im0: image } }))
  const commands = Buffer.from('q 160 0 0 160 0 0 cm /Im0 Do Q')
  page.node.set(PDFName.of('Contents'), doc.context.register(doc.context.stream(commands)))
  return doc.save()
}
