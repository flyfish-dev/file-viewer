import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { loadXml } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/chartParser';

async function archive(parts: Record<string, string>) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(parts)) zip.file(path, content);
  return JSZip.loadAsync(
    await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }),
  );
}

describe('spreadsheet comment XML stream budgets', () => {
  it('counts decoded UTF-8 bytes rather than characters or ZIP declarations', async () => {
    const source = '<comments>日本語のコメント</comments>';
    const size = new TextEncoder().encode(source).byteLength;
    const zip = await archive({ 'comments.xml': source });
    const budget = { maxPartBytes: size, remainingBytes: size + 100 };
    const xml = await loadXml(zip, 'comments.xml', budget);
    expect(xml?.documentElement.textContent).toBe('日本語のコメント');
    expect(budget.remainingBytes).toBe(100);
  });

  it('shares the actual output budget across XML and relationship parts', async () => {
    const zip = await archive({
      'comments.xml': '<comments/>',
      'comments.xml.rels': '<Relationships/>',
    });
    const budget = { maxPartBytes: 100, remainingBytes: 20 };
    await loadXml(zip, 'comments.xml', budget);
    await expect(loadXml(zip, 'comments.xml.rels', budget)).rejects.toThrow(
      'Workbook XML exceeds the preview limit',
    );
  });

  it('stops on actual output even when the ZIP header understates its size', async () => {
    const zip = await archive({
      'comments.xml': '<comments>' + 'x'.repeat(100_000) + '</comments>',
    });
    const part = zip.file('comments.xml');
    if (
      !part ||
      !('_data' in part) ||
      !part._data ||
      typeof part._data !== 'object' ||
      !('uncompressedSize' in part._data)
    )
      throw new Error('Missing compressed fixture metadata');
    part._data.uncompressedSize = 1;
    const budget = { maxPartBytes: 1024, remainingBytes: 200_000 };
    await expect(loadXml(zip, 'comments.xml', budget)).rejects.toThrow(
      'Workbook XML exceeds the preview limit',
    );
    expect(budget.remainingBytes).toBeLessThan(200_000 - 1024);
  });
});
