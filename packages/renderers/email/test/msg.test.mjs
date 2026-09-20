import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createMsgFixture, writeCompoundFile, rtfEnvelope, PNG } from './fixtures/msg-fixture.mjs';

// The default command exercises the real installed MsgReader. UNIT_ONLY is an
// explicitly reported offline subset, never a substitute for the integration gate.
const dist = process.env.MSG_TEST_DIST ? pathToFileURL(resolve(process.env.MSG_TEST_DIST) + '/') : new URL('../dist/', import.meta.url);
const { inspectMsgContainer } = await import(new URL('msgCfb.js', dist));
const { decompressMsgRtf, extractMsgRtf, rtfCrc32 } = await import(new URL('msgRtf.js', dist));
const { decodeEmailHtmlBytes } = await import(new URL('msgEncoding.js', dist));
const { createEmailImageResource } = await import(new URL('emailHtml.js', dist));
const { normalizeMsg, captureMsgProperty, parseMsg, safeMsgAttachmentName } = await import(new URL('msg.js', dist));
const text = new TextEncoder(), decode = bytes => new TextDecoder().decode(bytes);
const unitOnly = process.env.MSG_UNIT_ONLY === '1';
const view = buffer => new DataView(buffer);
const fields = extra => ({ dataType: 'msg', subject: 'Subject', body: 'Body', recipients: [], attachments: [], ...extra });
const resources = t => { const urls = []; t.after(() => urls.forEach(url => URL.revokeObjectURL(url))); return [urls, new Map()]; };
const reader = load => ({ getFileData: () => fields(), getAttachment: load || (() => { throw new Error('unexpected extraction'); }) });

for (const version of [3, 4]) {
  test(`CFB v${version}: directory, normal streams and MiniFAT are accepted`, () => {
    assert.deepEqual(inspectMsgContainer(createMsgFixture({ version, largeAttachment: 8193 })), { messageCodepage: 65001 });
  });
}
test('CFB: ANSI codepage is available before MsgReader decodes strings', () => assert.equal(inspectMsgContainer(createMsgFixture({ ansi: true })).messageCodepage, 936));
test('CFB: DIFAT continuation sectors are validated', () => {
  const fixture = createMsgFixture({ largeAttachment: 8 * 1024 * 1024 });
  assert.ok(view(fixture).getUint32(72, true) > 0);
  assert.equal(inspectMsgContainer(fixture).messageCodepage, 65001);
});
test('CFB: arbitrary OLE/Excel data is not treated as MSG', () => assert.throws(() => inspectMsgContainer(writeCompoundFile({ Workbook: text.encode('not a message') })), /not an Outlook/));
for (const [name, corrupt] of [
  ['signature', buffer => new Uint8Array(buffer)[0] = 0],
  ['FAT count', buffer => view(buffer).setUint32(44, 0, true)],
  ['directory cycle', buffer => { const v = view(buffer), fat = (v.getUint32(76, true) + 1) * 512, dir = v.getUint32(48, true); v.setUint32(fat + dir * 4, dir, true); }],
  ['directory child cycle', buffer => { const v = view(buffer), dir = (v.getUint32(48, true) + 1) * 512; v.setUint32(dir + 76, 0, true); }],
  ['MiniFAT cycle', buffer => { const v = view(buffer), mini = (v.getUint32(60, true) + 1) * 512; v.setUint32(mini, 0, true); }],
  ['DIFAT count', buffer => view(buffer).setUint32(72, 0xffffffff, true)],
]) test(`CFB rejects ${name}`, () => { const buffer = createMsgFixture(); corrupt(buffer); assert.throws(() => inspectMsgContainer(buffer), /Invalid Outlook MSG/); });
test('CFB rejects truncated sectors and empty input', () => {
  assert.throws(() => inspectMsgContainer(createMsgFixture().slice(0, -1)), /truncated sector/);
  assert.throws(() => inspectMsgContainer(new ArrayBuffer(0)), /size limit/);
});
test('invalid MSG fails before loading the parser dependency', async () => assert.rejects(parseMsg(new ArrayBuffer(12), 'invalid.msg', [], new Map()), /Invalid Outlook MSG/));

test('HTML: Unicode string and UTF-8 bytes have identical bodies', () => {
  const html = '<h1>中文 日本語 😀</h1>';
  assert.equal(decodeEmailHtmlBytes(text.encode(html)), html);
  assert.equal(decodeEmailHtmlBytes(html + '\0'), html);
});
test('HTML: typed-array byte offsets are honored', () => {
  const data = text.encode('xx<h1>Body</h1>yy');
  assert.equal(decodeEmailHtmlBytes(data.subarray(2, -2)), '<h1>Body</h1>');
});
test('HTML: BOM takes precedence over conflicting codepage metadata', () => {
  const data = Uint8Array.from(Buffer.from('\ufeff<p>中文</p>', 'utf16le'));
  assert.equal(decodeEmailHtmlBytes(data, 1252), '<p>中文</p>');
});
test('HTML: Outlook codepage, HTML charset and legacy fallback decode', () => {
  assert.equal(decodeEmailHtmlBytes(Uint8Array.of(0xd6, 0xd0, 0xce, 0xc4), 936), '中文');
  assert.equal(decodeEmailHtmlBytes(Uint8Array.from(Buffer.from('<meta charset="windows-1252">caf\xe9', 'latin1'))), '<meta charset="windows-1252">café');
  assert.equal(decodeEmailHtmlBytes(Uint8Array.of(0xe9)), 'é');
});
test('HTML: oversized and invalid values are rejected', () => {
  assert.throws(() => decodeEmailHtmlBytes(new Uint8Array(32 * 1024 * 1024 + 1)), /oversized/);
  assert.throws(() => decodeEmailHtmlBytes({}), /Invalid/);
});

test('RTF CRC uses the MS-OXRTFCP initialization and finalization', () => assert.equal(rtfCrc32(text.encode('123456789')), 0x2dfd2d88));
for (const compressed of [false, true]) test(`RTF: ${compressed ? 'LZFu' : 'MELA'} body decodes exactly`, () => {
  const input = '{\\rtf1\\ansi Test \\b bold\\b0\\par Next line}';
  assert.equal(decode(decompressMsgRtf(rtfEnvelope(input, compressed))), input);
});
test('RTF: LZFu ring wraps beyond 4096 bytes', () => {
  const input = '{\\rtf1\\ansi ' + 'abcdefgh'.repeat(1500) + '}';
  assert.equal(decode(decompressMsgRtf(rtfEnvelope(input, true))), input);
});
test('RTF: references can use the prescribed initial dictionary', () => {
  const payload = Uint8Array.of(3, 0, 15, 14, 0), compressed = new Uint8Array(16 + payload.length), v = view(compressed.buffer);
  v.setUint32(0, compressed.length - 4, true); v.setUint32(4, 17, true); v.setUint32(8, 0x75465a4c, true); v.setUint32(12, rtfCrc32(payload), true); compressed.set(payload, 16);
  assert.equal(decode(decompressMsgRtf(compressed)), '{\\rtf1\\ansi\\mac\\deff0'.slice(0, 17));
});
test('RTF: CRC mismatch, expansion limit and truncation are rejected', () => {
  const a = rtfEnvelope('{\\rtf1 test}', true); a[12] ^= 1;
  assert.throws(() => decompressMsgRtf(a), /CRC/);
  const b = rtfEnvelope('{\\rtf1 test}', true); view(b.buffer).setUint32(4, 0xffffffff, true);
  assert.throws(() => decompressMsgRtf(b), /limit/);
  assert.throws(() => decompressMsgRtf(rtfEnvelope('{\\rtf1 test}', true).subarray(0, -1)), /mismatch/);
});
test('RTF: text extraction respects Unicode fallback, destinations and paragraphs', () => {
  const rtf = String.raw`{\rtf1\ansi\uc1{\fonttbl{\f0 Hidden Font;}}\u20013?\u25991?\par Visible {\*\unknown hidden}next\tab end}`;
  assert.equal(extractMsgRtf(text.encode(rtf)).text, '中文\nVisible next\tend');
});
test('RTF: CJK hex byte runs are not split at 8192 bytes', () => {
  const raw = String.raw`{\rtf1\ansi\ansicpg65001 ` + 'a'.repeat(8191) + String.raw`\'e4\'b8\'ad}`;
  assert.equal(extractMsgRtf(text.encode(raw)).text, 'a'.repeat(8191) + '中');
});
test('RTF: encapsulated HTML excludes htmlrtf fallback content', () => {
  const rtf = String.raw`{\rtf1\ansi\fromhtml1{\*\htmltag1 <p>}Body{\*\htmltag1 </p>}\htmlrtf1 ignored\htmlrtf0}`;
  assert.equal(extractMsgRtf(text.encode(rtf)).html, '<p>Body</p>');
});
test('RTF: truncated groups and binary blocks are rejected', () => {
  assert.throws(() => extractMsgRtf(text.encode('{\\rtf1')), /Truncated/);
  assert.throws(() => extractMsgRtf(text.encode('{\\rtf1\\bin999 x}')), /binary/);
  assert.throws(() => extractMsgRtf(text.encode('{\\rtf1' + '{'.repeat(129) + '}'.repeat(130))), /nesting/);
});

test('MSG: To, Cc and Bcc stay separate; SMTP is preferred over Exchange DN', async t => {
  const parsed = await normalizeMsg(reader(), fields({ senderName: 'Sender', senderEmail: '/O=EX', senderSmtpAddress: 'sender@example.test', recipients: [
    { name: 'To', smtpAddress: 'to@example.test', email: '/O=EX', recipType: 'to' },
    { email: 'cc@example.test', recipType: 2 }, { email: 'bcc@example.test', recipType: 'bcc' },
  ] }), 'email.msg', ...resources(t));
  assert.equal(parsed.from[0].address, 'sender@example.test');
  assert.deepEqual(parsed.to.map(a => a.address), ['to@example.test']);
  assert.deepEqual(parsed.cc.map(a => a.address), ['cc@example.test']);
  assert.deepEqual(parsed.bcc.map(a => a.address), ['bcc@example.test']);
});
test('MSG: Unicode bodyHtml wins; binary HTML is not coerced to comma-separated numbers', async t => {
  assert.equal((await normalizeMsg(reader(), fields({ bodyHtml: '<p>Unicode</p>', html: text.encode('<p>Binary</p>') }), 'email.msg', ...resources(t))).html, '<p>Unicode</p>');
  assert.equal((await normalizeMsg(reader(), fields({ html: text.encode('<p>中文</p>') }), 'email.msg', ...resources(t))).html, '<p>中文</p>');
});
test('MSG: HTML-encapsulated RTF supplies both HTML and fallback text', async t => {
  const rtf = String.raw`{\rtf1\ansi\fromhtml1{\*\htmltag1 <b>}Body{\*\htmltag1 </b>}}`;
  const parsed = await normalizeMsg(reader(), fields({ body: '', compressedRtf: rtfEnvelope(rtf, true) }), 'email.msg', ...resources(t));
  assert.equal(parsed.html, '<b>Body</b>'); assert.equal(parsed.text, 'Body'); assert.ok(parsed.rtf instanceof ArrayBuffer);
});
test('MSG: corrupt RTF preserves a usable body with a notice', async t => {
  const parsed = await normalizeMsg(reader(), fields({ compressedRtf: Uint8Array.of(1) }), 'email.msg', ...resources(t));
  assert.equal(parsed.text, 'Body'); assert.deepEqual(parsed.warnings, ['email.msg.rtfUnavailable']);
});
test('MSG: raster CID attachments are registered; ordinary and nested attachments remain lazy', async t => {
  let extractions = 0;
  const load = attachment => { extractions++; return { fileName: attachment.fileName, content: attachment.pidContentId ? PNG : text.encode('Exact attachment bytes') }; };
  const [urls, cids] = resources(t);
  const parsed = await normalizeMsg(reader(load), fields({ attachments: [
    { fileName: 'inline.png', attachMimeTag: 'image/png', pidContentId: '<logo@example.test>', contentLength: PNG.length },
    { fileName: '../../report.txt', contentLength: 22 },
    { name: 'Forwarded', innerMsgContent: true, innerMsgContentFields: fields() },
  ] }), 'email.msg', urls, cids);
  assert.equal(extractions, 1); assert.equal(urls.length, 1); assert.ok(cids.get('logo@example.test').startsWith('blob:'));
  assert.deepEqual(parsed.attachments.map(a => [a.name, a.mimeType]), [['inline.png', 'image/png'], ['report.txt', 'text/plain'], ['Forwarded.msg', 'application/vnd.ms-outlook']]);
  assert.equal(decode(await parsed.attachments[1].load()), 'Exact attachment bytes'); assert.equal(extractions, 2);
});
test('MSG: attachment views respect typed-array offsets and unique names', async t => {
  const raw = text.encode('xxPAYLOADyy');
  const parsed = await normalizeMsg(reader(() => ({ fileName: 'same.txt', content: raw.subarray(2, -2) })), fields({ attachments: [{ fileName: 'same.txt' }, { fileName: 'same.txt' }] }), 'email.msg', ...resources(t));
  assert.notEqual(parsed.attachments[0].id, parsed.attachments[1].id);
  assert.equal(decode(await parsed.attachments[0].load()), 'PAYLOAD');
});
test('MSG: unavailable inline attachment preserves message and download entry', async t => {
  const parsed = await normalizeMsg(reader(() => { throw new Error('missing data'); }), fields({ attachments: [{ fileName: 'a.png', pidContentId: 'a' }] }), 'email.msg', ...resources(t));
  assert.equal(parsed.text, 'Body'); assert.equal(parsed.attachments.length, 1); assert.deepEqual(parsed.warnings, ['email.msg.inlineUnavailable']);
});
test('MSG: drafts synthesize explicitly labeled MAPI metadata, not invented transport headers', async t => {
  const parsed = await normalizeMsg(reader(), fields({ subject: 'Title\r\nInjected: value' }), 'email.msg', ...resources(t));
  assert.match(parsed.headers, /not transport headers/); assert.ok(!parsed.headers.includes('\r\nInjected:'));
});
test('MSG: existing raw headers are kept exactly', async t => {
  const headers = 'X-Unknown: one\r\n continuation\r\nX-Unknown: two\r\n';
  assert.equal((await normalizeMsg(reader(), fields({ headers }), 'email.msg', ...resources(t))).headers, headers);
});
test('MSG: empty/protected item gets explicit capability notices', async t => {
  const parsed = await normalizeMsg(reader(), fields({ body: '', messageClass: 'IPM.Note.SMIME' }), 'email.msg', ...resources(t));
  assert.deepEqual(parsed.warnings, ['email.msg.noBody', 'email.msg.protected']);
});
test('MSG: parser errors, recursive data and resource excess are rejected', async t => {
  await assert.rejects(normalizeMsg(reader(), fields({ error: 'Not MSG' }), 'email.msg', ...resources(t)), /Not MSG/);
  const cyclic = fields(); cyclic.attachments = [{ innerMsgContentFields: cyclic }];
  await assert.rejects(normalizeMsg(reader(), cyclic, 'email.msg', ...resources(t)), /nesting/);
  await assert.rejects(normalizeMsg(reader(), fields({ recipients: Array(4097).fill({}) }), 'email.msg', ...resources(t)), /limit/);
});
test('MSG: cancellation prevents parsing and attachment extraction', async t => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(normalizeMsg(reader(), fields(), 'email.msg', ...resources(t), controller.signal), { name: 'AbortError' });
});
test('MSG: attachment basenames strip paths, control and bidi characters', () => {
  assert.equal(safeMsgAttachmentName('C:\\folder\\invoice\u202epdf.txt', 'fallback'), 'invoicepdf.txt');
  assert.equal(safeMsgAttachmentName('../..', 'fallback'), 'fallback');
});


test('HTML: opaque-origin image fallback preserves bytes without leaking a blob URL', t => {
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  const revoked = []; URL.createObjectURL = () => 'blob:null/opaque'; URL.revokeObjectURL = value => revoked.push(value);
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  const bytes = new Uint8Array(50001).map((_, i) => i % 251), urls = [];
  const data = createEmailImageResource(bytes.buffer, 'image/png', urls);
  assert.deepEqual(new Uint8Array(Buffer.from(data.split(',')[1], 'base64')), bytes);
  assert.deepEqual(urls, []); assert.deepEqual(revoked, ['blob:null/opaque']);
});
test('HTML: BOM-less UTF-16 HTML is detected', () => assert.equal(decodeEmailHtmlBytes(Uint8Array.from(Buffer.from('<p>中文</p>', 'utf16le'))), '<p>中文</p>'));
test('MAPI: property observer captures Unicode and ANSI supplemental metadata only', () => {
  const f = fields();
  captureMsgProperty(f, 0x0042001f, Uint8Array.from(Buffer.from('Author\noverflow\0', 'utf16le')));
  assert.equal(f.sentRepresentingName, 'Author\noverflow');
  captureMsgProperty(f, 0x3713001e, text.encode('images/inline.png\0'));
  assert.equal(f.contentLocation, 'images/inline.png');
  captureMsgProperty(f, 0x3001001f, text.encode('ignored'));
  assert.equal(f.name, undefined);
  assert.throws(() => captureMsgProperty(f, 0x0042001f, new Uint8Array(65537)), /limit/);
});
test('MSG: on-behalf-of identity keeps author and transport sender distinct', async t => {
  const parsed = await normalizeMsg(reader(), fields({ senderName: 'Assistant', senderSmtpAddress: 'assistant@example.test', sentRepresentingName: 'Author', sentRepresentingSmtpAddress: 'author@example.test' }), 'mail.msg', ...resources(t));
  assert.deepEqual(parsed.from, [{ name: 'Author', address: 'author@example.test' }]);
  assert.deepEqual(parsed.sender, [{ name: 'Assistant', address: 'assistant@example.test' }]);
});
test('MSG: draft display lists remain display text rather than invented addresses', async t => {
  const parsed = await normalizeMsg(reader(), fields({ displayTo: 'Alice; Bob', displayCc: 'Carol', displayBcc: 'David' }), 'draft.msg', ...resources(t));
  assert.deepEqual(parsed.to, [{ name: 'Alice; Bob' }]); assert.deepEqual(parsed.bcc, [{ name: 'David' }]);
});
test('MSG: Content-Location and unique filenames resolve local images', async t => {
  const [urls, cids] = resources(t);
  await normalizeMsg(reader(() => ({ fileName: 'inline.png', content: PNG })), fields({ html: '<img src="images/inline.png">', attachments: [{ fileName: 'inline.png', contentLocation: 'images/inline.png', attachMimeTag: 'image/png' }] }), 'mail.msg', urls, cids);
  assert.ok(cids.get('images/inline.png')); assert.equal(cids.get('inline.png'), cids.get('images/inline.png'));
});
test('MSG: unknown attachment sizes are not falsely reported as zero', async t => {
  const parsed = await normalizeMsg(reader(() => ({ fileName: 'data.bin', content: Uint8Array.of(1, 2, 3) })), fields({ attachments: [{ fileName: 'data.bin' }] }), 'mail.msg', ...resources(t));
  assert.equal(parsed.attachments[0].size, -1); await parsed.attachments[0].load(); assert.equal(parsed.attachments[0].size, 3);
});

for (const [name, options] of [
  ['Unicode binary HTML', {}], ['Unicode string HTML', { unicodeHtml: true }],
  ['ANSI Chinese', { ansi: true, html: false }], ['CFB v4', { version: 4 }],
  ['compressed RTF', { html: false, text: '', rtf: String.raw`{\rtf1\ansi Rich \b body\b0}`, compressedRtf: true }],
]) test(`installed MsgReader: ${name}, recipients, CID and nested MSG round-trip`, { skip: unitOnly && 'offline unit subset; installed parser integration is required separately' }, async t => {
  const [urls, cids] = resources(t);
  const parsed = await parseMsg(createMsgFixture(options), 'fixture.msg', urls, cids);
  assert.equal(parsed.subject, options.ansi ? '中文' : 'MSG preview — 中文 日本語');
  assert.deepEqual(parsed.to.map(a => a.address), ['alice@example.test']);
  assert.deepEqual(parsed.cc.map(a => a.address), ['carol@example.test']);
  assert.deepEqual(parsed.bcc.map(a => a.address), ['bob@example.test']);
  assert.equal(parsed.from[0].address, 'sender@example.test');
  if (options.ansi) assert.equal(parsed.text, '中文');
  else if (options.rtf) { assert.equal(parsed.text, 'Rich body'); assert.ok(parsed.rtf); }
  else assert.match(parsed.html, /HTML body, not comma-separated bytes/);
  assert.equal(parsed.attachments.length, 3); assert.ok(cids.has('logo@example.test'));
  assert.equal(decode(await parsed.attachments[1].load()), 'Attachment bytes\n');
  const nested = await parseMsg(await parsed.attachments[2].load(), parsed.attachments[2].name, urls, new Map());
  assert.equal(nested.subject, 'Nested message'); assert.equal(nested.text, 'Nested Outlook body');
});
