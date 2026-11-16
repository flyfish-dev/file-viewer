// npm i jszip && node gen.cjs
const fs = require('fs'), JSZip = require('jszip');
const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const xfs = (list) => '<fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + `<cellXfs count="${list.length}">${list.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`;
function xlsx(file, styles, sheet, strings) {
  const ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml.', rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const z = new JSZip();
  z.file('[Content_Types].xml', `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${ct}sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${ct}worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${ct}styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="${ct}sharedStrings+xml"/></Types>`);
  z.file('_rels/.rels', `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml', `${X}<workbook ${NS} xmlns:r="${rel}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/><Relationship Id="rId3" Type="${rel}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`);
  z.file('xl/styles.xml', `${X}<styleSheet ${NS}>${styles}</styleSheet>`);
  z.file('xl/sharedStrings.xml', `${X}<sst ${NS} count="${strings.length}" uniqueCount="${strings.length}">${strings.map(s => `<si><t xml:space="preserve">${s}</t></si>`).join('')}</sst>`);
  z.file('xl/worksheets/sheet1.xml', `${X}<worksheet ${NS}>${sheet}</worksheet>`);
  z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then(b => fs.writeFileSync(file, b));
}
xlsx('xlsx-wrap-no-row-height.xlsx',
  xfs(['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>', '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>']),
  '<sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="12" customWidth="1"/></cols><sheetData>'
  + '<row r="1"><c r="A1" s="1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
  + '<row r="2"><c r="A2" s="1" t="s"><v>2</v></c><c r="B2" t="s"><v>1</v></c></row>'
  + '<row r="3"><c r="A3" t="s"><v>1</v></c></row></sheetData>',
  ['Wrapped text without a stored row height. ' + 'The quick brown fox jumps over the lazy dog. '.repeat(4), 'Short', 'Line 1\nLine 2\nLine 3\nLine 4']);
