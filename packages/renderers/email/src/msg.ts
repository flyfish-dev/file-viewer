import type { ParsedEmailView } from './email.js';
import type { MsgNotice } from './msgMessages.js';
import { inspectMsgContainer, MAX_MSG_BYTES } from './msgCfb.js';
import { createEmailImageResource, normalizeEmailResourceId } from './emailHtml.js';
import { decompressMsgRtf, extractMsgRtf } from './msgRtf.js';
import { decodeEmailHtmlBytes, msgCodepageLabel } from './msgEncoding.js';

/** Structural view of @kenjiuno/msgreader 1.28's documented API. Keep it local:
 * consumers continue to use the shared File Viewer contract, not MAPI types.
 */
export interface MsgFields {
  dataType?: string;
  error?: unknown;
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  senderSmtpAddress?: string;
  sentRepresentingSmtpAddress?: string;
  sentRepresentingName?: string;
  sentRepresentingEmail?: string;
  displayTo?: string;
  displayCc?: string;
  displayBcc?: string;
  body?: string;
  bodyHtml?: string;
  html?: Uint8Array | ArrayBuffer | string;
  headers?: string;
  compressedRtf?: Uint8Array;
  internetCodepage?: number;
  messageCodepage?: number;
  clientSubmitTime?: string;
  messageDeliveryTime?: string;
  creationTime?: string;
  recipients?: MsgFields[];
  attachments?: MsgFields[];
  name?: string;
  email?: string;
  smtpAddress?: string;
  recipType?: string | number;
  fileName?: string;
  fileNameShort?: string;
  extension?: string;
  contentLength?: number;
  pidContentId?: string;
  contentLocation?: string;
  attachMimeTag?: string;
  attachmentHidden?: boolean;
  innerMsgContent?: boolean;
  innerMsgContentFields?: MsgFields;
  messageClass?: string;
  messageId?: string;
  [key: string]: unknown;
}
export interface MsgReaderLike {
  parserConfig?: { ansiEncoding?: string; propertyObserver?: (fields: MsgFields, tag: number, raw: Uint8Array | null) => void };
  getFileData(): MsgFields;
  getAttachment(attachment: MsgFields): { fileName: string; content: Uint8Array };
}
export type MsgReaderConstructor = new (buffer: ArrayBuffer) => MsgReaderLike;
const MAX_ATTACHMENTS = 1024;
const MAX_RECIPIENTS = 4096;
const MAX_BODY_CHARS = 32 * 1024 * 1024;
const MAX_INLINE_BYTES = 32 * 1024 * 1024;
const MAX_NESTED_MESSAGES = 24;
const MIME: Readonly<Record<string, string>> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
  svg: 'image/svg+xml', pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  html: 'text/html', htm: 'text/html', rtf: 'application/rtf', msg: 'application/vnd.ms-outlook',
  eml: 'message/rfc822', zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const RASTER_MIME = /^image\/(?:png|jpeg|gif|webp|avif|bmp|x-ms-bmp)$/i;

const string = (value: unknown, max = MAX_BODY_CHARS): string => {
  if (typeof value !== 'string') return '';
  if (value.length > max) throw new Error('Outlook MSG text exceeds the safety limit.');
  return value.replace(/\0+$/, '');
};
export function safeMsgAttachmentName(value: unknown, fallback: string): string {
  const name = string(value, 32768).split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[<>:"|?*]/g, '_').replace(/[. ]+$/, '').trim();
  return !name || name === '.' || name === '..' ? fallback : name;
}
const recipient = (item: MsgFields) => ({ name: string(item.name, 32768), address: string(item.smtpAddress || item.email, 32768) });
const addressText = (items: ParsedEmailView['to']) => items.map(item => item.name && item.address ? `${item.name} <${item.address}>` : item.address || item.name || '').join(', ');
const copy = (value: Uint8Array | ArrayBuffer): ArrayBuffer => {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_MSG_BYTES) throw new Error('Invalid or oversized MSG attachment.');
  return new Uint8Array(bytes).buffer;
};

function assertFieldTree(root: MsgFields) {
  const seen = new Set<MsgFields>();
  const pending = [{ item: root, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const { item, depth } = pending.pop()!;
    if (depth > MAX_NESTED_MESSAGES || seen.has(item) || ++count > 32768) throw new Error('Outlook MSG nesting limit exceeded.');
    seen.add(item);
    if ((item.attachments?.length || 0) > MAX_ATTACHMENTS || (item.recipients?.length || 0) > MAX_RECIPIENTS) throw new Error('Outlook MSG recipient/attachment limit exceeded.');
    for (const attachment of item.attachments || []) {
      if (attachment.innerMsgContentFields) pending.push({ item: attachment.innerMsgContentFields, depth: depth + 1 });
    }
  }
}

/** Exported only from the internal module for deterministic normalization tests. */
export async function normalizeMsg(
  reader: MsgReaderLike,
  fields: MsgFields,
  filename: string,
  objectUrls: string[],
  cidUrls: Map<string, string>,
  signal?: AbortSignal
): Promise<ParsedEmailView> {
  signal?.throwIfAborted();
  if (fields.error || fields.dataType !== 'msg') throw new Error(string(fields.error) || 'The file does not contain a readable Outlook message.');
  assertFieldTree(fields);
  const warnings: MsgNotice[] = [];
  const actualSender = { name: string(fields.senderName, 32768), address: string(fields.senderSmtpAddress || fields.senderEmail, 32768) };
  const represented = { name: string(fields.sentRepresentingName, 32768), address: string(fields.sentRepresentingSmtpAddress || fields.sentRepresentingEmail, 32768) };
  const hasRepresentation = !!(represented.name || represented.address);
  const from = [hasRepresentation ? represented : actualSender].filter(item => item.name || item.address);
  const sender = hasRepresentation && (actualSender.address || actualSender.name) &&
    (actualSender.address !== represented.address || actualSender.name !== represented.name) ? [actualSender] : [];
  const to: ParsedEmailView['to'] = [];
  const cc: ParsedEmailView['cc'] = [];
  const bcc: ParsedEmailView['to'] = [];
  for (const item of fields.recipients || []) {
    const address = recipient(item);
    if (!address.name && !address.address) continue;
    const kind = String(item.recipType ?? 'to').toLowerCase();
    (kind === 'cc' || kind === '2' ? cc : kind === 'bcc' || kind === '3' ? bcc : to).push(address);
  }
  // Display lists are useful in drafts that omit recipient rows. They are
  // display text, not an address parser: do not invent SMTP addresses.
  if (!to.length && fields.displayTo) to.push({ name: string(fields.displayTo, 32768) });
  if (!cc.length && fields.displayCc) cc.push({ name: string(fields.displayCc, 32768) });
  if (!bcc.length && fields.displayBcc) bcc.push({ name: string(fields.displayBcc, 32768) });
  let html = string(fields.bodyHtml);
  if (!html && fields.html) html = decodeEmailHtmlBytes(fields.html, fields.internetCodepage, fields.messageCodepage);
  let text = string(fields.body);
  let rtf: ArrayBuffer | undefined;
  if (fields.compressedRtf?.length) {
    try {
      const uncompressed = decompressMsgRtf(fields.compressedRtf);
      const extracted = extractMsgRtf(uncompressed, fields.messageCodepage);
      text ||= extracted.text;
      html ||= extracted.html || '';
      rtf = copy(uncompressed);
    } catch (error) {
      if (!html && !text) throw error;
      warnings.push('email.msg.rtfUnavailable');
    }
  }
  signal?.throwIfAborted();
  let inlineBytes = 0;
  const attachments: ParsedEmailView['attachments'] = (fields.attachments || []).map((attachment, index) => {
    const fallback = `attachment-${index + 1}`;
    let name = safeMsgAttachmentName(attachment.fileName || attachment.fileNameShort || attachment.name, fallback);
    const extension = string(attachment.extension, 128).replace(/^\./, '');
    if (attachment.innerMsgContent && !/\.msg$/i.test(name)) name += '.msg';
    else if (!name.includes('.') && /^[a-z0-9]{1,16}$/i.test(extension)) name += `.${extension}`;
    const hint = string(attachment.attachMimeTag, 256).split(';')[0].trim().toLowerCase();
    const mimeType = attachment.innerMsgContent ? MIME.msg : (/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(hint) ? hint : MIME[name.split('.').pop()!.toLowerCase()] || 'application/octet-stream');
    const size = Number.isSafeInteger(attachment.contentLength) && attachment.contentLength! >= 0 ? attachment.contentLength! : -1;
    if (size > MAX_MSG_BYTES) throw new Error('Outlook MSG attachment exceeds the size limit.');
    const contentId = string(attachment.pidContentId, 32768);
    const contentLocation = string(attachment.contentLocation, 32768);
    const result: ParsedEmailView['attachments'][number] = {
      id: `msg-${index}`,
      name, size, mimeType, contentId, contentLocation,
      inline: !!attachment.attachmentHidden || !!contentId,
      async load() {
        signal?.throwIfAborted();
        // Do not cache every extracted buffer: the reader already owns the CFB.
        const extracted = reader.getAttachment(attachment);
        if (!extracted || !(extracted.content instanceof Uint8Array)) throw new Error(`Attachment data is not embedded: ${name}`);
        const buffer = copy(extracted.content);
        result.size = buffer.byteLength;
        signal?.throwIfAborted();
        return buffer;
      },
    };
    return result;
  });
  // Only raster CID images are decoded eagerly. PDF/Office/nested MSG remain lazy.
  for (const attachment of attachments) {
    const referenced = !!(attachment.contentId || attachment.contentLocation || attachment.inline || html.includes(attachment.name));
    if (!referenced || !RASTER_MIME.test(attachment.mimeType || '')) continue;
    signal?.throwIfAborted();
    try {
      if (inlineBytes + Math.max(0, attachment.size) > MAX_INLINE_BYTES) throw new Error('Inline image size limit exceeded.');
      const bytes = await attachment.load();
      inlineBytes += bytes.byteLength;
      if (inlineBytes > MAX_INLINE_BYTES) throw new Error('Inline image size limit exceeded.');
      signal?.throwIfAborted();
      const cid = normalizeEmailResourceId(attachment.contentId || '');
      const keys = [cid, attachment.contentLocation].filter((key): key is string => !!key);
      // A unique filename is also a valid local Content-Location fallback.
      if (attachments.filter(item => item.name === attachment.name).length === 1) keys.push(attachment.name);
      const available = keys.map(normalizeEmailResourceId).filter(key => !cidUrls.has(key));
      if (available.length) {
        const url = createEmailImageResource(bytes, attachment.mimeType!, objectUrls);
        available.forEach(key => cidUrls.set(key, url));
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      if (!warnings.includes('email.msg.inlineUnavailable')) warnings.push('email.msg.inlineUnavailable');
    }
  }
  const subject = string(fields.subject, 32768) || filename;
  const date = string(fields.clientSubmitTime || fields.messageDeliveryTime || fields.creationTime, 4096);
  const rawHeaders = string(fields.headers, 2 * 1024 * 1024);
  const headerLine = (key: string, value: string) => value ? `${key}: ${value.replace(/[\r\n\0]/g, ' ')}` : '';
  // Outlook drafts may have no transport headers. Label the generated metadata
  // explicitly instead of misrepresenting it as the original transport envelope.
  const headers = rawHeaders || [
    'X-File-Viewer-Source: Outlook MAPI properties (not transport headers)',
    headerLine('Subject', subject), headerLine('From', addressText(from)), headerLine('Sender', addressText(sender)),
    headerLine('To', addressText(to)), headerLine('Cc', addressText(cc)),
    headerLine('Bcc', addressText(bcc)), headerLine('Date', date),
    headerLine('Message-ID', string(fields.messageId, 32768)),
    headerLine('Message-Class', string(fields.messageClass, 32768)),
  ].filter(Boolean).join('\r\n');
  if (!html && !text && !rtf) warnings.push('email.msg.noBody');
  if (/\.smime(?:\.|$)|rpmsg|protected/i.test(string(fields.messageClass, 32768))) warnings.push('email.msg.protected');
  return { kind: 'msg', subject, from, sender, to, cc, bcc, date, text, html, rtf, headers, attachments, warnings };
}

/** Capture standard MAPI strings not named by the reader's default map. */
export function captureMsgProperty(fields: MsgFields, tag: number, raw: Uint8Array | null, codepage?: number): void {
  const name = ({ 0x0042: 'sentRepresentingName', 0x0065: 'sentRepresentingEmail',
    0x0e04: 'displayTo', 0x0e03: 'displayCc', 0x0e02: 'displayBcc',
    0x3713: 'contentLocation' } as Record<number, string>)[tag >>> 16];
  const type = tag & 0xffff;
  if (!name || !raw || (type !== 0x001f && type !== 0x001e)) return;
  if (raw.length > 65536) throw new Error('Outlook MSG metadata exceeds the safety limit.');
  fields[name] = decodeEmailHtmlBytes(raw, type === 0x001f ? 1200 : codepage || 1252);
}

export async function parseMsg(
  buffer: ArrayBuffer,
  filename: string,
  objectUrls: string[],
  cidUrls: Map<string, string>,
  signal?: AbortSignal
): Promise<ParsedEmailView> {
  signal?.throwIfAborted();
  const { messageCodepage } = inspectMsgContainer(buffer);
  const module: unknown = await import('@kenjiuno/msgreader');
  signal?.throwIfAborted();
  // CJS interop varies between native ESM, Vite and Webpack.
  const exported = (module as { default?: unknown }).default;
  const constructor = typeof exported === 'function' ? exported : (exported as { default?: unknown } | undefined)?.default;
  if (typeof constructor !== 'function') throw new Error('Outlook MSG parser failed to load.');
  const localBuffer = buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).slice().buffer;
  const reader = new (constructor as MsgReaderConstructor)(localBuffer);
  const label = msgCodepageLabel(messageCodepage);
  reader.parserConfig = {
    // iconv-lite's names differ from WHATWG for Korean/Chinese codepages.
    ...(messageCodepage ? { ansiEncoding: ({ 949: 'cp949', 936: 'cp936', 932: 'cp932', 950: 'cp950' } as Record<number, string>)[messageCodepage] || label || `cp${messageCodepage}` } : {}),
    propertyObserver: (fields, tag, raw) => captureMsgProperty(fields, tag, raw, messageCodepage),
  };
  const initialUrls = objectUrls.length;
  const initialCids = new Map(cidUrls);
  try {
    return await normalizeMsg(reader, reader.getFileData(), filename, objectUrls, cidUrls, signal);
  } catch (error) {
    objectUrls.splice(initialUrls).forEach(url => URL.revokeObjectURL(url));
    cidUrls.clear();
    initialCids.forEach((url, cid) => cidUrls.set(cid, url));
    throw error;
  }
}
