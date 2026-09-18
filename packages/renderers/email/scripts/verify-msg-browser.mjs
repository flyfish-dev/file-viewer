import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createMsgFixture, PNG, rtfEnvelope } from '../test/fixtures/msg-fixture.mjs';

// Real Chromium + actual emitted renderer modules. Reader and nested RTF APIs
// are explicit fixtures here; the separate msg.test.mjs gate tests the installed
// binary parser. These assertions do NOT establish Outlook/RTF.js visual parity.
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(process.env.MSG_TEST_DIST || join(packageRoot, 'dist'));
const output = resolve(process.env.MSG_BROWSER_OUTPUT || join(packageRoot, 'output/msg-browser'));
const playwright = await import(process.env.FILE_VIEWER_PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.FILE_VIEWER_PLAYWRIGHT_MODULE)).href : 'playwright');
await mkdir(output, { recursive: true });
const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const imports = {};
for (const file of (await readdir(dist)).filter(file => file.endsWith('.js'))) {
  const source = (await readFile(join(dist, file), 'utf8')).replace(/(['"])\.\/([^'"]+\.js)\1/g, (_all, _quote, path) => JSON.stringify('fv/' + path));
  imports['fv/' + file] = dataModule(source);
}
const labels = { 'email.meta.from': 'From', 'email.meta.to': 'To', 'email.meta.cc': 'Cc', 'email.meta.date': 'Date', 'email.tabs.text': 'Text', 'email.tabs.headers': 'Headers', 'email.attachments.download': 'Download', 'email.attachments.title': 'Attachments', 'email.attachments.empty': 'No attachments', 'email.loading.parsing': 'Reading email', 'email.error.title': 'Email preview notice', 'email.attachments.opening': 'Opening attachment', 'email.attachments.nestedUnavailable': 'No renderer installed' };
imports['@file-viewer/core'] = dataModule(`const labels=${JSON.stringify(labels)};
export const createFileViewerTranslator=()=>key=>labels[key]||key;
export const resolveFileViewerColorScheme=(theme,dark)=>theme==='dark'||theme==='system'&&dark?'dark':'light';
export const disposeFileViewerRendered=async instance=>{await instance?.unmount?.()};
export const resolveFileViewerLocale=input=>input?.i18n?.locale||input?.locale||'en-US';`);
imports['@kenjiuno/msgreader'] = dataModule(`export default class Reader {
  constructor(){this.data=globalThis.__fields;}
  getFileData(){return this.data;}
  getAttachment(a){return {fileName:a.fileName||a.name,content:new Uint8Array(a.bytes||[])};}
}`);
imports['postal-mime'] = dataModule('export default {async parse(){return globalThis.__postal}}');
const runtime = `import renderEmail from 'fv/email.js';
import {createEmailHtmlDocument} from 'fv/emailHtml.js';
window.sanitize=createEmailHtmlDocument;window.urls=new Set();window.revoked=[];
const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=blob=>{const url=create(blob);window.urls.add(url);return url;};
URL.revokeObjectURL=url=>{window.urls.delete(url);window.revoked.push(url);revoke(url);};
const buffer=new Uint8Array(${JSON.stringify([...new Uint8Array(createMsgFixture())])}).buffer;
window.nestedCalls=[];window.disposedChildren=[];window.pending=[];
window.nested=async(buffer,type,target,context)=>{
 const name=context.filename;window.nestedCalls.push({type,name,options:context.options});
 if(window.deferNested)await new Promise(resolve=>window.pending.push({name,resolve}));
 const child=document.createElement('pre');child.textContent=type==='rtf'?'RTF capability host fixture':new TextDecoder().decode(buffer);target.replaceChildren(child);
 return {$el:child,unmount(){window.disposedChildren.push(name);target.replaceChildren();}};
};
window.mount=async(fields,options={})=>{
 fields.html=Array.isArray(fields.html)?new Uint8Array(fields.html):fields.html;
 fields.compressedRtf=fields.compressedRtf?new Uint8Array(fields.compressedRtf):undefined;
 window.__fields=fields;
 window.current=await renderEmail(buffer,document.querySelector('#host'),'msg',{filename:'outlook-preview.msg',options:{locale:'en-US',theme:options.theme||'light'},signal:window.parentController?.signal,renderNestedBuffer:options.noNested?undefined:window.nested});
};window.ready=true;`;
const document = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#e9edf0;font-family:system-ui,sans-serif}#host{height:100vh;width:100%}</style><script type="importmap">${JSON.stringify({ imports })}</script><div id="host"></div><script type="module">${runtime}</script>`;
const html = '<html><body><h1>Outlook MSG · 中文 日本語</h1><p>Binary HTML, table layout and inline images are preserved.</p><table border="1" cellpadding="8"><tr><td>Item</td><td>Status</td></tr><tr><td>Quarterly report</td><td>Ready</td></tr><tr><td>Budget</td><td>Approved</td></tr></table><p><img src="cid:logo@example.test" alt="Embedded image" width="24" height="24"> Embedded image is loaded locally.</p><script>parent.injected=true</script><img src="https://tracking.invalid/open"><style>@import "https://tracking.invalid/css";body{background-image:url("https://tracking.invalid/pixel")}</style></body></html>';
const fields = {
  dataType: 'msg', subject: 'Outlook MSG · Quarterly review', senderName: 'Sender', senderEmail: '/O=EXCHANGE/CN=SENDER', senderSmtpAddress: 'sender@example.test',
  body: 'Plain text body — 中文 日本語', html: [...Buffer.from(html)], clientSubmitTime: 'Fri, 18 Sep 2026 00:00:00 GMT',
  headers: 'From: sender@example.test\r\nTo: alice@example.test\r\nSubject: Quarterly review\r\n',
  recipients: [{ name: 'Alice', smtpAddress: 'alice@example.test', recipType: 'to' }, { name: 'Carol', email: 'carol@example.test', recipType: 'cc' }, { name: 'Bob', email: 'bob@example.test', recipType: 'bcc' }],
  attachments: [{ fileName: 'inline.png', attachMimeTag: 'image/png', pidContentId: 'logo@example.test', contentLength: PNG.length, bytes: [...PNG] }, { fileName: 'report.txt', attachMimeTag: 'text/plain', contentLength: 17, bytes: [...Buffer.from('Attachment bytes\n')] }, { name: 'Forwarded message', innerMsgContent: true, bytes: [...Buffer.from('nested placeholder')] }],
};
const browser = await playwright.chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
const checks = [], external = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 1 });
  page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  page.on('pageerror', error => errors.push(String(error)));
  await page.setContent(document); await page.waitForFunction(() => window.ready);
  const mount = async (value = fields, options = {}) => page.evaluate(({ value, options }) => window.mount(value, options), { value, options });
  const check = (name, value) => { assert.ok(value, name); checks.push(name); };
  await mount();
  const frame = page.frameLocator('iframe.email-html');
  await frame.locator('img').first().evaluate(img => img.decode());
  check('binary HTML body', await frame.locator('h1').innerText() === 'Outlook MSG · 中文 日本語');
  check('HTML table cells', await frame.locator('table td').count() === 6);
  const meta = await page.locator('.email-meta').innerText();
  check('To/Cc/Bcc separation', ['alice@example.test', 'carol@example.test', 'bob@example.test', 'Bcc'].every(s => meta.includes(s)));
  check('SMTP preferred to Exchange DN', !meta.includes('/O=EXCHANGE'));
  check('empty iframe sandbox', await page.locator('iframe').getAttribute('sandbox') === '');
  check('local CID resource', /^(blob:|data:image\/)/.test(await frame.locator('img').first().getAttribute('src')));
  check('CID raster decoded', await frame.locator('img').first().evaluate(img => img.complete && img.naturalWidth === 24));
  check('no tracking requests', external.length === 0);
  check('scripts removed', await frame.locator('script').count() === 0 && !await page.evaluate(() => window.injected === true));
  check('body fills height', (await page.locator('.email-message-content').boundingBox()).height >= (await page.locator('.email-body').boundingBox()).height - 2);
  await page.screenshot({ path: join(output, 'msg-after-desktop.png') });
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  check('plain-text tab', await page.locator('.email-text').innerText() === fields.body);
  await page.getByRole('button', { name: 'Headers', exact: true }).click();
  check('raw headers', (await page.locator('.email-text').innerText()).replace(/\r\n/g, '\n') === fields.headers.replace(/\r\n/g, '\n'));
  await page.getByRole('button', { name: 'HTML', exact: true }).click();
  await page.locator('.attachment-item').nth(1).click(); await page.waitForFunction(() => window.nestedCalls.length === 1);
  check('attachment preview bytes', await page.locator('.attachment-target').innerText() === 'Attachment bytes\n');
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download', exact: true }).click(); const download = await downloading;
  check('download basename', download.suggestedFilename() === 'report.txt');
  check('download bytes', await readFile(await download.path(), 'utf8') === 'Attachment bytes\n');
  await page.getByRole('button', { name: 'Close attachment preview' }).click();
  check('close restores space', !await page.locator('.attachment-preview').isVisible());
  check('close restores focus', await page.locator('.attachment-item').nth(1).evaluate(e => e === document.activeElement));
  await page.evaluate(() => { window.deferNested = true; });
  // Programmatic clicks deliberately stress a race normally covered by the overlay.
  await page.locator('.attachment-item').nth(1).evaluate(e => e.click()); await page.waitForFunction(() => window.pending.length === 1);
  await page.locator('.attachment-item').nth(2).evaluate(e => e.click()); await page.waitForFunction(() => window.pending.length === 2);
  await page.evaluate(() => window.pending[1].resolve()); await page.waitForFunction(() => document.querySelector('.attachment-target').textContent.includes('nested placeholder'));
  await page.evaluate(() => window.pending[0].resolve()); await page.waitForFunction(() => window.disposedChildren.filter(n => n === 'report.txt').length >= 2);
  check('stale nested view disposed', await page.evaluate(() => window.disposedChildren.filter(n => n === 'report.txt').length >= 2));
  check('selected attachment not overwritten', await page.locator('.attachment-preview-head strong').innerText() === 'Forwarded message.msg' && (await page.locator('.attachment-target').innerText()).includes('nested placeholder'));
  await page.evaluate(async () => { window.deferNested = false; await window.current.unmount(); });
  check('unmount revokes URLs', await page.evaluate(() => window.urls.size) === 0);
  check('unmount removes UI', await page.locator('#host').innerHTML() === '');
  await page.setViewportSize({ width: 390, height: 844 }); await mount();
  await page.screenshot({ path: join(output, 'msg-after-mobile.png') });
  check('mobile horizontal bounds', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('mobile readable body height', (await page.locator('.email-message-content').boundingBox()).height > 180);
  await page.evaluate(() => window.current.unmount()); await page.setViewportSize({ width: 1180, height: 760 }); await mount(fields, { theme: 'dark' });
  await page.locator('#host').evaluate(e => { e.dataset.viewerTheme = 'dark'; });
  await page.screenshot({ path: join(output, 'msg-after-dark.png') });
  check('dark body scheme', await page.frameLocator('iframe').locator('body').evaluate(e => getComputedStyle(e).colorScheme) === 'dark');
  const sanitized = await page.evaluate(() => window.sanitize('<img src="cid:ab"><img src="cid:a"><img src="cid:A"><img src="cid:a%40x"><img src="file:///etc/passwd"><a href="javascript:alert(1)">bad</a><iframe src="https://tracking.invalid"></iframe><svg onload="alert(1)"></svg>', new Map([['a', 'blob:a'], ['a@x', 'blob:b']])));
  check('exact CID, no prefix replacement', !sanitized.includes('cid:ab') && sanitized.split('src="blob:a"').length === 3 && sanitized.includes('src="blob:b"'));
  check('active HTML and local paths removed', !['<iframe', '<svg', 'javascript:', 'file:///'].some(s => sanitized.includes(s)));
  const preserved = await page.evaluate(() => window.sanitize('<html lang="ja"><head><style>p{color:green}</style></head><body bgcolor="#123456" text="#abcdef" dir="rtl"><form><p>Visible text</p><input value="hidden"></form><img src="cid:a%2540x"></body></html>', new Map([['a%40x', 'blob:literal']])));
  check('authored body and styles preserved', ['lang="ja"', 'dir="rtl"', '#123456', '#abcdef', 'p{color:green}', 'Visible text'].every(s => preserved.includes(s)));
  check('form contents retained without controls', !preserved.includes('<form') && !preserved.includes('<input') && preserved.includes('<p>Visible text</p>'));
  check('percent in raw Content-ID stays literal', preserved.includes('src="blob:literal"'));
  await page.evaluate(async () => { await window.current.unmount(); window.parentController = new AbortController(); window.parentController.abort(); });
  const aborted = await page.evaluate(async value => { try { await window.mount(value); return false; } catch (error) { return error.name === 'AbortError'; } }, fields);
  check('pre-aborted render cleanup', aborted && await page.evaluate(() => window.urls.size === 0 && !document.querySelector('#host').childNodes.length));
  await page.evaluate(() => { window.parentController = undefined; });
  await mount({ ...fields, html: undefined, body: '', attachments: [], compressedRtf: [...rtfEnvelope(String.raw`{\rtf1\ansi Rich \b body\b0}`, true)] });
  check('RTF delegated to host capability', await page.locator('.email-rtf').innerText() === 'RTF capability host fixture');
  check('RTF external resources blocked', await page.evaluate(() => window.nestedCalls.at(-1).options.docx.externalResourcePolicy) === 'block');
  await page.getByRole('button', { name: 'Text', exact: true }).click(); await page.waitForFunction(() => window.disposedChildren.includes('outlook-preview.msg.rtf'));
  check('RTF disposed on body switch', await page.evaluate(() => window.disposedChildren.includes('outlook-preview.msg.rtf')));
  await page.evaluate(() => window.current.unmount());
  check('no unhandled browser errors', errors.length === 0);
  const report = { environment: 'Chromium; emitted renderer; explicit Reader/RTF API fixtures, not installed parser/engine integration', passed: checks.length, checks, externalRequests: external, pageErrors: errors };
  await writeFile(join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
