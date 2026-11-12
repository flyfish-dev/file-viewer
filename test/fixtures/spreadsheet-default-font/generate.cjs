// Adapted from issue #453; uses renderer-local JSZip in an isolated pnpm layout.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const JSZip = createRequire(path.resolve(__dirname, '../../../packages/renderers/spreadsheet/package.json'))('jszip');
const outputDirectory = process.argv[2] || __dirname;
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
  // Freeze ZIP timestamps so this synthetic fixture has reproducible bytes.
  z.forEach((_, entry) => { entry.date = new Date('2026-11-06T03:58:58.000Z'); });
  z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }).then(b => fs.writeFileSync(path.join(outputDirectory, file), b));
}
xlsx('xlsx-unstyled-cells.xlsx',
  xfs(['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>', '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>']),
  '<sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="50" customWidth="1"/></cols><sheetData>'
  + '<row r="1"><c r="A1" s="1" t="s"><v>0</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c></row>'
  + '<row r="3"><c r="A3" s="1" t="s"><v>2</v></c></row><row r="4"><c r="A4" t="s"><v>3</v></c></row></sheetData>',
  ['A1: has s="1" (Calibri 11pt, same as default)', 'A2: no s attribute (default style)', 'A3: has s="1"', 'A4: no s attribute']);
