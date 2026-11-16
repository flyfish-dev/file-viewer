import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parseSpreadsheetCellImages } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/richDataParser';
import { createSpreadsheetParserContext, handleSpreadsheetWorkerRequest } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser';

const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';

// Generated package structure only; no attachment or producer metadata is retained.
async function workbook(relationshipType: string, targetMode = '') {
  const zip = new JSZip();
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/></Types>');
  zip.file('xl/workbook.xml', `<workbook xmlns="${main}" xmlns:r="${rel}"><sheets><sheet name="Images" sheetId="1" r:id="sheet"/></sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="sheet" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="images" Type="${relationshipType}" Target="cellimages.xml" ${targetMode}/></Relationships>`);
  zip.file('xl/worksheets/sheet1.xml', `<worksheet xmlns="${main}"><dimension ref="B2:D3"/><sheetData><row r="2"><c r="B2" t="str"><f>_xlfn.DISPIMG(&quot;PICTURE&quot;,1)</f><v>=DISPIMG(&quot;PICTURE&quot;,1)</v></c></row><row r="3"><c r="D3" t="str"><f>DISPIMG(&quot;PICTURE&quot;,1)</f><v>=DISPIMG(&quot;PICTURE&quot;,1)</v></c></row></sheetData></worksheet>`);
  zip.file('xl/cellimages.xml', `<etc:cellImages xmlns:etc="http://www.wps.cn/officeDocument/2017/etCustomData" xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${rel}"><etc:cellImage><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="PICTURE"/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="picture"/></xdr:blipFill></xdr:pic></etc:cellImage></etc:cellImages>`);
  zip.file('xl/_rels/cellimages.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="picture" Type="${rel}/image" Target="media/picture.png"/></Relationships>`);
  zip.file('xl/media/picture.png', image, { base64: true });
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('WPS cell-image relationship versions', () => {
  it.each([
    'http://www.wps.cn/officeDocument/2017/relationships/cellimage',
    'http://www.wps.cn/officeDocument/2020/cellImage',
  ])('resolves embedded DISPIMG pictures for %s', async (type) => {
    const data = await workbook(type);
    const images = (await parseSpreadsheetCellImages(data)).Images;
    expect(images).toHaveLength(2);
    expect(images.map(({ row, col }) => [row, col])).toEqual([[1, 1], [2, 3]]);
    expect(images.every(item => item.src === `data:image/png;base64,${image}`)).toBe(true);

    const context = createSpreadsheetParserContext();
    const responses = await handleSpreadsheetWorkerRequest(context, {
      type: 'parseWorkbook', payload: { workbook: data, filename: 'generated.xlsx' },
    });
    expect(responses[0].type).toBe('sheets');
    expect(context.cellImages.Images).toEqual(images);
  });

  it('does not accept unrelated relationship types with the same suffix', async () => {
    expect(await parseSpreadsheetCellImages(await workbook('https://unrelated.example/2020/cellImage'))).toEqual({});
  });

  it('does not load externally targeted cell-image relationships', async () => {
    expect(await parseSpreadsheetCellImages(await workbook('http://www.wps.cn/officeDocument/2020/cellImage', 'TargetMode="External"'))).toEqual({});
  });
});
