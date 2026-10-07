import { createRequire } from 'node:module'
const require = createRequire(new URL('../package.json', import.meta.url))
const JSZip = require('jszip')
export const xml = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
export const points = (entries, count) => `<c:ptCount val="${count}"/>${entries.map(([idx, value]) => `<c:pt idx="${idx}"><c:v>${xml(value)}</c:v></c:pt>`).join('')}`
export const series = (values, categories, count, name = 'Observed', categoryCount = count) => `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${xml(name)}</c:v></c:tx><c:cat><c:strLit>${points(categories, categoryCount)}</c:strLit></c:cat><c:val><c:numLit>${points(values, count)}</c:numLit></c:val><c:marker><c:symbol val="circle"/></c:marker></c:ser>`
export async function chartFixture({type = 'line', blankMode = 'gap', content, workbookRows = ''} = {}) {
  const zip = new JSZip()
  const ss = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const pkg = 'http://schemas.openxmlformats.org/package/2006/relationships'
  const c = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
  const a = 'http://schemas.openxmlformats.org/drawingml/2006/main'
  const xd = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
  zip.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`)
  zip.file('_rels/.rels', `<Relationships xmlns="${pkg}"><Relationship Id="r1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file('xl/workbook.xml', `<workbook xmlns="${ss}" xmlns:r="${rel}"><sheets><sheet name="Sheet1" sheetId="1" r:id="r1"/></sheets></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<Relationships xmlns="${pkg}"><Relationship Id="r1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`)
  zip.file('xl/worksheets/sheet1.xml', `<worksheet xmlns="${ss}" xmlns:r="${rel}"><dimension ref="A1:D8"/><sheetData>${workbookRows || '<row r="1"><c r="A1" t="inlineStr"><is><t>Regression</t></is></c></row>'}</sheetData><drawing r:id="r1"/></worksheet>`)
  zip.file('xl/worksheets/_rels/sheet1.xml.rels', `<Relationships xmlns="${pkg}"><Relationship Id="r1" Type="${rel}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`)
  zip.file('xl/drawings/drawing1.xml', `<xdr:wsDr xmlns:xdr="${xd}" xmlns:a="${a}" xmlns:c="${c}" xmlns:r="${rel}"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="6096000" cy="3429000"/><xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Regression chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${c}"><c:chart r:id="r1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`)
  zip.file('xl/drawings/_rels/drawing1.xml.rels', `<Relationships xmlns="${pkg}"><Relationship Id="r1" Type="${rel}/chart" Target="../charts/chart1.xml"/></Relationships>`)
  const node = {line:'lineChart', area:'areaChart', bar:'barChart', pie:'pieChart', doughnut:'doughnutChart'}[type]
  zip.file('xl/charts/chart1.xml', `<c:chartSpace xmlns:c="${c}" xmlns:a="${a}"><c:chart><c:plotArea><${'c:'+node}>${type === 'bar' ? '<c:barDir val="col"/>' : ''}${content || series([[0,10],[2,30],[4,50]],[[0,'甲'],[2,'丙'],[4,'戊']],6)}</${'c:'+node}><c:catAx><c:axId val="1"/></c:catAx><c:valAx><c:axId val="2"/></c:valAx></c:plotArea><c:dispBlanksAs val="${blankMode}"/></c:chart></c:chartSpace>`)
  return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'})
}
