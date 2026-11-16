import JSZip from 'jszip'
import { readFile, writeFile } from 'node:fs/promises'
const original = await readFile(
  new URL(
    './fixtures/spreadsheet-auto-row-height/original-454.xlsx',
    import.meta.url,
  ),
)
const z = await JSZip.loadAsync(original)
const esc = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const cell = (r, t, s = 1) =>
  `<c r="A${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`
let xml = await z.file('xl/worksheets/sheet1.xml').async('string')
xml = xml.replace(/<row r="3">[\s\S]*?<\/row>/, '')
xml = xml.replace(
  '</sheetData>',
  [
    `<row r="3" ht="15">${cell(3, 'Explicit height\nSecond\nThird\nFourth')}</row>`,
    `<row r="4" customHeight="1">${cell(4, 'Custom height only\nSecond\nThird\nFourth')}</row>`,
    `<row r="5" hidden="1">${cell(5, 'Hidden row\nSecond\nThird\nFourth')}</row>`,
    `<row r="6">${cell(6, 'Merged wrap cell that should retain its existing height. '.repeat(5))}</row>`,
    `<row r="7" ht="0">${cell(7, 'Zero height\nSecond\nThird\nFourth')}</row>`,
    `<row r="8">${cell(8, 'Late font wrap, with larger font and enough text to need several rows of layout.', 2)}</row>`,
    '<row r="9"><c r="A9" s="1" t="inlineStr"><is><r><rPr><sz val="24"/><rFont val="Arial"/></rPr><t>Large rich text </t></r><r><rPr><sz val="11"/><rFont val="Calibri"/></rPr><t>mixed with small text and several wrapping words for measurement.</t></r></is></c></row>',
    `<row r="500">${cell(500, 'Window 500\nSecond\nThird\nFourth')}</row>`,
    `<row r="501">${cell(501, 'Window 501\nSecond\nThird\nFourth')}</row>`,
    `<row r="650">${cell(650, 'Window 650\nSecond\nThird\nFourth')}</row>`,
    '</sheetData><mergeCells count="1"><mergeCell ref="A6:B6"/></mergeCells>',
  ].join(''),
)
z.file('xl/worksheets/sheet1.xml', xml)
let styles = await z.file('xl/styles.xml').async('string')
styles = styles
  .replace('<fonts count="1">', '<fonts count="2">')
  .replace(
    '</fonts>',
    '<font><sz val="20"/><name val="LateWorkbookFont"/></font></fonts>',
  )
  .replace('<cellXfs count="2">', '<cellXfs count="3">')
  .replace(
    '</cellXfs>',
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>',
  )
z.file('xl/styles.xml', styles)
let workbook = await z.file('xl/workbook.xml').async('string')
z.file(
  'xl/workbook.xml',
  workbook.replace(
    '</sheets>',
    '<sheet name="Second" sheetId="2" r:id="rId4"/></sheets>',
  ),
)
let rels = await z.file('xl/_rels/workbook.xml.rels').async('string')
z.file(
  'xl/_rels/workbook.xml.rels',
  rels.replace(
    '</Relationships>',
    '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
  ),
)
z.file(
  'xl/worksheets/sheet2.xml',
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="30" customWidth="1"/></cols><sheetData><row r="1">' +
    cell(1, 'Second sheet\nSecond\nThird\nFourth') +
    '</row></sheetData></worksheet>',
)
let ct = await z.file('[Content_Types].xml').async('string')
z.file(
  '[Content_Types].xml',
  ct.replace(
    '</Types>',
    '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  ),
)
await writeFile(
  new URL(
    './fixtures/spreadsheet-auto-row-height/autoheight-controls.xlsx',
    import.meta.url,
  ),
  await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
)
// Independent source drawing controls, using the same unmodified original rows.
const d = await JSZip.loadAsync(original)
let sheet = await d.file('xl/worksheets/sheet1.xml').async('string')
d.file(
  'xl/worksheets/sheet1.xml',
  sheet.replace(
    '</worksheet>',
    '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="draw1"/></worksheet>',
  ),
)
d.file(
  'xl/worksheets/_rels/sheet1.xml.rels',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="draw1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>',
)
const mark = (tag, row, col) =>
  `<xdr:${tag}><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:${tag}>`
const pic = (id) =>
  `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Image${id}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/>`
const anchors = [
  `<xdr:oneCellAnchor>${mark('from', 2, 2)}<xdr:ext cx="762000" cy="381000"/>${pic(1)}</xdr:oneCellAnchor>`,
  `<xdr:twoCellAnchor>${mark('from', 0, 3)}${mark('to', 2, 4)}${pic(2)}</xdr:twoCellAnchor>`,
  `<xdr:twoCellAnchor editAs="oneCell">${mark('from', 0, 4)}${mark('to', 2, 5)}${pic(3)}</xdr:twoCellAnchor>`,
  `<xdr:twoCellAnchor editAs="absolute">${mark('from', 0, 5)}${mark('to', 2, 6)}${pic(4)}</xdr:twoCellAnchor>`,
  `<xdr:absoluteAnchor><xdr:pos x="6000000" y="381000"/><xdr:ext cx="762000" cy="381000"/>${pic(5)}</xdr:absoluteAnchor>`,
  `<xdr:twoCellAnchor>${mark('from', 0, 7)}${mark('to', 2, 9)}<xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="6" name="Auto height chart"/></xdr:nvGraphicFramePr><a:graphic><a:graphicData><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="chart1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`,
]
d.file(
  'xl/drawings/drawing1.xml',
  '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    anchors.join('') +
    '</xdr:wsDr>',
)
d.file(
  'xl/drawings/_rels/drawing1.xml.rels',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/control.png"/>`,
      )
      .join('') +
    '<Relationship Id="chart1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>',
)
d.file(
  'xl/media/control.png',
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  ),
)
d.file(
  'xl/charts/chart1.xml',
  '<chartSpace xmlns="http://schemas.openxmlformats.org/drawingml/2006/chart"><chart><plotArea><lineChart><grouping val="standard"/><ser><tx><v>Control</v></tx><cat><strLit><pt idx="0"><v>A</v></pt><pt idx="1"><v>B</v></pt></strLit></cat><val><numLit><pt idx="0"><v>1</v></pt><pt idx="1"><v>2</v></pt></numLit></val></ser></lineChart></plotArea></chart></chartSpace>',
)
ct = await d.file('[Content_Types].xml').async('string')
d.file(
  '[Content_Types].xml',
  ct.replace(
    '</Types>',
    '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>',
  ),
)
await writeFile(
  new URL(
    './fixtures/spreadsheet-auto-row-height/autoheight-drawings.xlsx',
    import.meta.url,
  ),
  await d.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
)
console.log(
  'Generated controls and DrawingML fixtures; original retained unchanged',
)
