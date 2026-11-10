import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  createSpreadsheetParserContext,
  handleSpreadsheetWorkerRequest,
} from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/parser';
import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

import { parseSpreadsheetComments } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/commentParser';

async function readCommentFixture(name = 'excel-comments.xlsx') {
  const bytes = await readFile(
    fileURLToPath(
      new URL(`./fixtures/spreadsheet-comments/${name}`, import.meta.url),
    ),
  );
  const context = createSpreadsheetParserContext();
  await handleSpreadsheetWorkerRequest(context, {
    type: 'parseWorkbook',
    payload: {
      workbook: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ),
      filename: 'excel-comments.xlsx',
    },
  });
  return context;
}

describe('Excel workbook comment extraction', () => {
  it('retains notes on merged headers and empty cells with their original addresses', async () => {
    const context = await readCommentFixture();
    const comments = context.comments['Release plan'];
    expect(context.commentsError).toBe(false);
    expect(comments?.find((comment) => comment.address === 'A1')).toMatchObject(
      {
        kind: 'note',
        row: 0,
        col: 0,
        messages: [
          {
            author: 'Alex',
            text: expect.stringContaining('Original workbook'),
          },
        ],
      },
    );
    expect(comments?.find((comment) => comment.address === 'B6')).toMatchObject(
      {
        kind: 'note',
        messages: [{ text: 'This note belongs to an otherwise empty cell.' }],
      },
    );
  });

  it('resolves threaded comment authors and replies without duplicating compatibility notes', async () => {
    const context = await readCommentFixture();
    const threads = context.comments['Release plan']?.filter(
      (comment) => comment.address === 'C5',
    );
    expect(threads).toHaveLength(1);
    expect(threads?.[0]).toMatchObject({
      kind: 'thread',
      resolved: false,
      messages: [
        { author: 'Alex', createdAt: '2026-11-10T09:00:00Z', parentId: null },
        { author: 'Mina', text: 'はい。確認メールの到着も検証してください。' },
      ],
    });
    expect(threads?.[0]?.messages[1]?.parentId).toBe(
      threads?.[0]?.messages[0]?.id,
    );
  });

  it('preserves resolved state and Japanese sheet names', async () => {
    const context = await readCommentFixture();
    expect(context.comments.仕様).toMatchObject([
      {
        address: 'B4',
        kind: 'thread',
        resolved: true,
        messages: [{ author: 'Mina' }, { author: 'Alex' }],
      },
    ]);
    expect(context.sheets.map((sheet) => sheet.comments?.length)).toEqual([
      5, 1,
    ]);
    const response = await handleSpreadsheetWorkerRequest(context, {
      type: 'parseSheet',
      payload: { sheet: 1, startRow: 0, pageSize: 500, sessionId: 2 },
    });
    expect(response).toMatchObject([
      { type: 'parseSheet', payload: { sheet: 1, sessionId: 2 } },
    ]);
  });

  it('includes comments beyond the first virtual row window', async () => {
    const context = await readCommentFixture();
    const comment = context.comments['Release plan']?.find(
      (item) => item.address === 'D650',
    );
    expect(comment).toMatchObject({
      row: 649,
      col: 3,
      messages: [{ author: 'Mina' }],
    });
    const response = await handleSpreadsheetWorkerRequest(context, {
      type: 'parseSheet',
      payload: { sheet: 0, startRow: 500, pageSize: 500, sessionId: 1 },
    });
    expect(response).toMatchObject([
      {
        type: 'parseSheet',
        payload: { sheet: 0, sheetData: { meta: { startRow: 500 } } },
      },
    ]);
  });

  it('decodes Excel string escapes without appending phonetic note runs', async () => {
    const context = await readCommentFixture('excel-comments-text.xlsx');
    expect(
      context.comments['Release plan']?.find((item) => item.address === 'D4')
        ?.messages[0]?.text,
    ).toBe('first\rsecond');
    expect(
      context.comments['Release plan']?.find((item) => item.address === 'C5')
        ?.messages[0]?.text,
    ).toBe('first\nsecond_x000A_literal');
  });

  it('keeps valid threads when another worksheet references a missing comments part', async () => {
    const context = await readCommentFixture('excel-comments-partial.xlsx');
    expect(context.commentsError).toBe(true);
    expect(
      context.comments['Release plan']?.find((item) => item.address === 'C5'),
    ).toMatchObject({
      kind: 'thread',
      messages: [{ author: 'Alex' }, { author: 'Mina' }],
    });
  });

  it('does not attach cross-cell parent chains to the first cell', async () => {
    const context = await readCommentFixture('excel-comments-parents.xlsx');
    expect(context.commentsError).toBe(true);
    expect(
      context.comments['Release plan']?.find(
        (item) => item.address === 'A1009',
      ),
    ).toMatchObject({ kind: 'thread', messages: [{ text: 'source comment' }] });
    expect(
      context.comments['Release plan']?.find((item) => item.address === 'A10')
        ?.messages,
    ).toHaveLength(1);
  });

  it('leaves text spreadsheets without comments readable', async () => {
    const context = await readCommentFixture();
    const bytes = new TextEncoder().encode('Name,Result\nLogin,Passed');
    const response = await handleSpreadsheetWorkerRequest(context, {
      type: 'parseWorkbook',
      payload: {
        workbook: bytes.buffer,
        filename: 'results.csv',
        fileType: 'csv',
      },
    });
    expect(response).toMatchObject([
      { type: 'sheets', payload: { commentsError: false } },
    ]);
    expect(Object.values(context.comments).flat()).toEqual([]);
  });
  it('keeps a worksheet whose only meaningful content is a modern threaded comment', async () => {
    const zip = await JSZip.loadAsync(
      await readFile(
        new URL(
          './fixtures/spreadsheet-comments/excel-comments.xlsx',
          import.meta.url,
        ),
      ),
    );
    zip.file(
      'xl/worksheets/sheet2.xml',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>',
    );
    const context = createSpreadsheetParserContext();
    await handleSpreadsheetWorkerRequest(context, {
      type: 'parseWorkbook',
      payload: { workbook: await zip.generateAsync({ type: 'arraybuffer' }) },
    });
    expect(context.sheets.find((sheet) => sheet.name === '仕様')).toMatchObject(
      {
        rowCount: 4,
        colCount: 2,
        comments: [{ address: 'B4', kind: 'thread' }],
      },
    );
  });

  it('bounds oversized XML parts without losing other sheets or legacy notes', async () => {
    const zip = await JSZip.loadAsync(
      await readFile(
        new URL(
          './fixtures/spreadsheet-comments/excel-comments.xlsx',
          import.meta.url,
        ),
      ),
    );
    zip.file(
      'xl/threadedComments/thread1.xml',
      '<ThreadedComments>' +
        ' '.repeat(4 * 1024 * 1024) +
        '</ThreadedComments>',
    );
    const context = createSpreadsheetParserContext();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await handleSpreadsheetWorkerRequest(context, {
        type: 'parseWorkbook',
        payload: { workbook: await zip.generateAsync({ type: 'arraybuffer' }) },
      });
      expect(context.commentsError).toBe(true);
      expect(
        context.comments['Release plan'].find(
          (comment) => comment.address === 'A1',
        )?.kind,
      ).toBe('note');
      expect(context.comments['仕様'][0]).toMatchObject({
        kind: 'thread',
        resolved: true,
      });
      expect(warning).toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });

  it('ignores external threaded-comment relationships', async () => {
    const zip = await JSZip.loadAsync(
      await readFile(
        new URL(
          './fixtures/spreadsheet-comments/excel-comments.xlsx',
          import.meta.url,
        ),
      ),
    );
    const path = 'xl/worksheets/_rels/sheet1.xml.rels';
    const part = zip.file(path);
    if (!part) throw new Error('Missing fixture relationships');
    zip.file(
      path,
      (await part.async('string')).replace(
        'Target="../threadedComments/thread1.xml"',
        'Target="https://example.invalid/comments.xml" TargetMode="External"',
      ),
    );
    const context = createSpreadsheetParserContext();
    await handleSpreadsheetWorkerRequest(context, {
      type: 'parseWorkbook',
      payload: { workbook: await zip.generateAsync({ type: 'arraybuffer' }) },
    });
    expect(context.commentsError).toBe(false);
    expect(
      context.comments['Release plan'].find(
        (comment) => comment.address === 'C5',
      )?.kind,
    ).toBe('note');
  });

  it('retains parser-provided notes in ZIP containers without OOXML workbook parts', async () => {
    const bytes = await new JSZip()
      .file('xl/workbook.bin', new Uint8Array())
      .generateAsync({ type: 'arraybuffer' });
    const result = await parseSpreadsheetComments(bytes, {
      SheetNames: ['Binary'],
      Sheets: {
        Binary: {
          A1: {
            t: 's',
            v: 'Data',
            c: [{ a: 'Reader', t: 'Binary workbook note' }],
          },
        },
      },
    });
    expect(result.hasError).toBe(false);
    expect(result.comments.Binary[0]).toMatchObject({
      kind: 'note',
      messages: [{ author: 'Reader', text: 'Binary workbook note' }],
    });
  });
});
