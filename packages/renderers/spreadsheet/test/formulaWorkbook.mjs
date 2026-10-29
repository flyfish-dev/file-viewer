import JSZip from 'jszip'

// Independently generated OOXML. No reporter document bytes are embedded.
export async function createFormulaWorkbook() {
  const zip = new JSZip()
  const schema = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  const relSchema = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const number = (address, value) => `<c r="${address}"><v>${value}</v></c>`
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const formula = (address, value, cached = '') => `<c r="${address}"><f>${escape(value)}</f><v>${cached}</v></c>`
  // Browser checks need the complete formula text, independent of renderer auto-fit.
  const worksheet = (ref, rows) => `<?xml version="1.0"?><worksheet xmlns="${schema}"><dimension ref="${ref}"/><cols><col min="3" max="3" width="24" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>`
  const row = (r, cells) => `<row r="${r}">${cells}</row>`
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
  zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relSchema}/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file('xl/workbook.xml', `<?xml version="1.0"?><workbook xmlns="${schema}" xmlns:r="${relSchema}"><sheets><sheet name="功能点计数表" sheetId="1" r:id="rId1"/><sheet name="费用测算表" sheetId="2" r:id="rId2"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relSchema}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${relSchema}/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`)
  zip.file('xl/worksheets/sheet1.xml', worksheet('A1:K211',
    row(1, '<c r="A1" t="inlineStr"><is><t>Synthetic uncached formulas</t></is></c>') +
    row(2, formula('A2', 'ROW()-1') + '<c r="G2" t="inlineStr"><is><t>ILF</t></is></c>' + formula('H2', 'IF(G2="ILF",10,IF(G2="EIF",7,0))')) +
    row(3, number('H3', 1113)) + row(211, formula('H211', 'SUM(H2:H210)') + formula('K211', 'ROUND(H211*2/3,2)'))))
  zip.file('xl/worksheets/sheet2.xml', worksheet('A1:C9',
    row(1, '<c r="A1" t="inlineStr"><is><t>Calculated cross-sheet values</t></is></c>') +
    row(2, formula('C2', '功能点计数表!H211')) + row(3, formula('C3', '功能点计数表!K211')) +
    row(4, formula('C4', 'UNKNOWN()')) + row(5, formula('C5', '999', '0')) +
    row(6, '<c r="B6" t="b"><v>1</v></c>' + formula('C6', '"A"&B6')) +
    row(7, formula('C7', 'IF(TRUE,TRUE,FALSE)&":"&C6')) +
    row(8, '<c r="C8" t="str"><f>FALSE&amp;""</f><v>authored</v></c>') +
    row(9, formula('C9', 'C8&":"&FALSE'))))
  return zip.generateAsync({ type: 'arraybuffer' })
}
