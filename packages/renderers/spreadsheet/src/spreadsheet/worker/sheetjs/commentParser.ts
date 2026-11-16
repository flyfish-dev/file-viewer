import JSZip from 'jszip';
import { utils, type WorkBook, type WorkSheet } from 'styled-exceljs';
import type { Document as XmlDocument, Node as XmlNode } from '@xmldom/xmldom';
import type {
  SheetComment,
  SheetCommentLocation,
  SheetCommentMessage,
} from '../type.js';
import {
  childElements,
  elementsByLocal,
  loadRelationships,
  loadXml,
  localName,
  relationById,
  relationshipId,
} from './chartParser.js';

const MAX_COMMENT_PART_BYTES = 4 * 1024 * 1024;
const MAX_COMMENT_XML_BYTES = 16 * 1024 * 1024;
const decodeText = (value: string) =>
  value.replace(/_x([0-9a-f]{4})_/gi, (_, code: string) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );
const text = (node?: XmlNode | null) => decodeText(node?.textContent || '');
const direct = (node: XmlNode | null | undefined, name: string) =>
  childElements(node).filter((item) => localName(item) === name);
const noteText = (node?: XmlNode) =>
  childElements(node)
    .flatMap((child) => {
      if (localName(child) === 't') return [text(child)];
      return localName(child) === 'r' ? direct(child, 't').map(text) : [];
    })
    .join('');
const addressOf = (value: string | null): SheetCommentLocation | null => {
  if (!value || !/^[A-Z]{1,3}[1-9][0-9]{0,6}$/i.test(value)) return null;
  const cell = utils.decode_cell(value.toUpperCase());
  return cell.r < 1048576 && cell.c < 16384
    ? { address: utils.encode_cell(cell), row: cell.r, col: cell.c }
    : null;
};
const worksheetCells = (sheet?: WorkSheet): Array<[string, unknown]> => {
  const rows: unknown = Array.isArray(sheet) ? sheet : sheet?.['!data'];
  if (Array.isArray(rows)) {
    return rows.flatMap((row: unknown, r) =>
      Array.isArray(row)
        ? row.map((cell: unknown, c): [string, unknown] => [
            utils.encode_cell({ r, c }),
            cell,
          ])
        : [],
    );
  }
  return Object.entries(sheet || {}).filter(([address]) => addressOf(address));
};
const legacyMessages = (cell: unknown): SheetCommentMessage[] => {
  if (
    !cell ||
    typeof cell !== 'object' ||
    !('c' in cell) ||
    !Array.isArray(cell.c)
  )
    return [];
  return cell.c.flatMap((note: unknown): SheetCommentMessage[] => {
    if (
      !note ||
      typeof note !== 'object' ||
      !('t' in note) ||
      typeof note.t !== 'string' ||
      ('T' in note && note.T)
    )
      return [];
    return [
      {
        id: '',
        parentId: null,
        text: note.t,
        createdAt: null,
        author: 'a' in note && typeof note.a === 'string' ? note.a : '',
      },
    ];
  });
};
export const readWorkbookNotes = (
  workbook: WorkBook,
): Record<string, SheetComment[]> =>
  Object.fromEntries(
    workbook.SheetNames.map((name) => [
      name,
      worksheetCells(workbook.Sheets[name]).flatMap(
        ([address, cell]): SheetComment[] => {
          const location = addressOf(address);
          const messages = legacyMessages(cell);
          return location && messages.length
            ? [{ ...location, kind: 'note', resolved: false, messages }]
            : [];
        },
      ),
    ]),
  );

type ThreadMessage = SheetCommentLocation &
  SheetCommentMessage & { resolved: boolean };
type Thread = Extract<SheetComment, { kind: 'thread' }>;

export const parseSpreadsheetComments = async (
  data: ArrayBuffer,
  workbook: WorkBook,
): Promise<{ comments: Record<string, SheetComment[]>; hasError: boolean }> => {
  const comments = readWorkbookNotes(workbook);
  if (data.byteLength < 2 || new DataView(data).getUint16(0, false) !== 0x504b)
    return { comments, hasError: false };
  const zip = await JSZip.loadAsync(data);
  if (!zip.file('xl/workbook.xml')) return { comments, hasError: false };
  let hasError = false;
  const budget = {
    maxPartBytes: MAX_COMMENT_PART_BYTES,
    remainingBytes: MAX_COMMENT_XML_BYTES,
  };
  const cache = new Map<string, XmlDocument | null>();
  const xml = async (
    path: string,
    required = true,
  ): Promise<XmlDocument | null> => {
    if (cache.has(path)) return cache.get(path) || null;
    try {
      const part = zip.file(path);
      if (!part) {
        if (required) hasError = true;
        return null;
      }
      const document = await loadXml(zip, path, budget);
      cache.set(path, document);
      return document;
    } catch (error) {
      hasError = true;
      cache.set(path, null);
      console.warn(
        '[file-viewer] Spreadsheet comment part could not be read.',
        error,
      );
      return null;
    }
  };
  const relationshipsFor = (path: string) =>
    loadRelationships(zip, path, (part) => xml(part, false));
  const workbookXml = await xml('xl/workbook.xml');
  const relationships = await relationshipsFor('xl/workbook.xml');
  const people = new Map<string, string>();
  for (const relationship of relationships.filter((item) =>
    item.type.toLowerCase().endsWith('/person'),
  )) {
    const persons = await xml(relationship.target);
    for (const person of elementsByLocal(persons?.documentElement, 'person')) {
      const id = person.getAttribute('id');
      if (id)
        people.set(
          id,
          person.getAttribute('displayName') ||
            person.getAttribute('userId') ||
            '',
        );
    }
  }
  for (const sheet of elementsByLocal(workbookXml?.documentElement, 'sheet')) {
    const name = sheet.getAttribute('name');
    const relation = relationById(relationships, relationshipId(sheet));
    if (!name || !relation || !relation.type.endsWith('/worksheet')) continue;
    const sheetRelationships = await relationshipsFor(relation.target);
    const cells = new Map(
      (comments[name] || []).map((item) => [item.address, item]),
    );
    for (const part of sheetRelationships.filter((item) =>
      item.type.toLowerCase().endsWith('/comments'),
    )) {
      const document = await xml(part.target);
      const authors = elementsByLocal(document?.documentElement, 'author').map(
        text,
      );
      for (const comment of elementsByLocal(
        document?.documentElement,
        'comment',
      )) {
        const location = addressOf(comment.getAttribute('ref'));
        if (!location) {
          hasError = true;
          continue;
        }
        cells.set(location.address, {
          ...location,
          kind: 'note',
          resolved: false,
          messages: [
            {
              id: '',
              parentId: null,
              author: authors[Number(comment.getAttribute('authorId'))] || '',
              text: noteText(direct(comment, 'text')[0]),
              createdAt: null,
            },
          ],
        });
      }
    }
    const messages: ThreadMessage[] = [];
    for (const part of sheetRelationships.filter((item) =>
      item.type.toLowerCase().endsWith('/threadedcomment'),
    )) {
      const document = await xml(part.target);
      for (const comment of elementsByLocal(
        document?.documentElement,
        'threadedComment',
      )) {
        const location = addressOf(comment.getAttribute('ref'));
        if (!location) {
          hasError = true;
          continue;
        }
        const timestamp = comment.getAttribute('dT') || '';
        messages.push({
          ...location,
          id: comment.getAttribute('id') || '',
          parentId: comment.getAttribute('parentId') || null,
          author: people.get(comment.getAttribute('personId') || '') || '',
          text: text(direct(comment, 'text')[0]),
          createdAt:
            timestamp && Number.isFinite(Date.parse(timestamp))
              ? timestamp
              : null,
          resolved: ['1', 'true'].includes(comment.getAttribute('done') || ''),
        });
      }
    }
    const byId = new Map(
      messages.filter((item) => item.id).map((item) => [item.id, item]),
    );
    const threads = new Map<string, Thread>();
    const roots = new Map<string, ThreadMessage>();
    for (const message of messages) {
      let root = message;
      const path: ThreadMessage[] = [];
      const visited = new Set<string>();
      while (root.parentId) {
        const cached = roots.get(root.id);
        if (cached) {
          root = cached;
          break;
        }
        if (visited.has(root.id)) {
          hasError = true;
          break;
        }
        visited.add(root.id);
        path.push(root);
        const parent = byId.get(root.parentId);
        if (!parent || parent.address !== message.address) {
          hasError = true;
          break;
        }
        root = parent;
      }
      for (const item of path) if (item.id) roots.set(item.id, root);
      if (root.id) roots.set(root.id, root);
      const thread: Thread = threads.get(root.address) || {
        address: root.address,
        row: root.row,
        col: root.col,
        kind: 'thread',
        resolved: root.resolved,
        messages: [],
      };
      thread.messages.push({
        id: message.id,
        parentId: message.parentId,
        author: message.author,
        text: message.text,
        createdAt: message.createdAt,
      });
      threads.set(root.address, thread);
    }
    for (const [address, thread] of threads) {
      thread.messages.sort((a, b) =>
        a.parentId === null && b.parentId !== null
          ? -1
          : b.parentId === null && a.parentId !== null
            ? 1
            : (a.createdAt || '').localeCompare(b.createdAt || ''),
      );
      cells.set(address, thread);
    }
    comments[name] = [...cells.values()].sort(
      (a, b) => a.row - b.row || a.col - b.col,
    );
  }
  return { comments, hasError };
};
