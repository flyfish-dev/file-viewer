import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const evidenceRoot = resolve(process.env.BINARY_INSPECTOR_EVIDENCE_DIR || '/tmp/file-viewer-binary-inspector');
await mkdir(evidenceRoot, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.bin': 'application/octet-stream' };
const html = `<!doctype html><meta charset="utf-8"><div id="viewer" style="width:1100px;height:760px"></div><script type="module">
import renderBinary from '/dist/binary.js';
window.mountBinary = async (name, options = {}) => {
  const response = await fetch('/fixtures/' + name);
  if (!response.ok) throw new Error('fixture fetch failed: ' + response.status);
  window.binaryInstance = await renderBinary(await response.arrayBuffer(), document.getElementById('viewer'), 'bin', { options: { binary: options } });
  return document.querySelector('[data-binary-inspector-ready]')?.dataset.binaryTemplate;
};
window.binaryReady = true;
</script>`;
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://local').pathname);
    if (pathname === '/' || pathname === '/index.html') {
      response.writeHead(200, { 'Content-Type': mime['.html'], 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; worker-src 'self'" }).end(html);
      return;
    }
    const file = resolve(packageRoot, `.${pathname}`);
    if (!file.startsWith(packageRoot + sep)) {
      response.writeHead(403).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }).end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const report = { origin, workers: null, virtualRows: 0, externalRequests: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1160, height: 820 } });
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.binaryWorkers = { created: 0, active: 0 };
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args);
        window.binaryWorkers.created += 1;
        window.binaryWorkers.active += 1;
        this.binaryStopped = false;
      }
      terminate() {
        if (!this.binaryStopped) {
          this.binaryStopped = true;
          window.binaryWorkers.active -= 1;
        }
        return super.terminate();
      }
    };
  });
  await page.goto(origin);
  await page.waitForFunction(() => window.binaryReady === true);
  assert.equal(await page.evaluate(() => mountBinary('pe32.bin')), 'pe');
  await page.waitForSelector('[data-binary-inspector-ready="true"]');
  assert.equal(await page.locator('[data-binary-template="pe"]').count(), 1);
  await page.getByRole('button', { name: /PE signature/u }).click();
  await page.waitForFunction(() => document.querySelector('[data-binary-inspector-ready]')?.dataset.binarySelectedStart === '128');
  await page.locator('[data-binary-byte-offset="0"]').click();
  await page.waitForFunction(() => document.querySelector('[data-binary-inspector-ready]')?.dataset.binarySelectedStart === '0');
  assert.match(await page.locator('.fv-binary-inspector').innerText(), /GUID LE/u);
  await page.evaluate(() => binaryInstance.unmount());
  assert.equal(await page.evaluate(() => mountBinary('large.bin')), 'raw');
  await page.waitForSelector('[data-binary-template="raw"]');
  report.virtualRows = await page.locator('[data-binary-row]').count();
  assert.ok(report.virtualRows < 100, `Expected virtualized rows, received ${report.virtualRows}.`);
  assert.equal(await page.evaluate(() => binaryWorkers.active), 0, 'The parsing Worker must terminate after its single result.');
  const tooSmall = await page.evaluate(async () => {
    try {
      await mountBinary('pe32.bin', { maxFileBytes: 8 });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  });
  assert.match(tooSmall || '', /configured 8 byte limit/u);
  await page.screenshot({ path: resolve(evidenceRoot, 'binary-inspector.png') });
  report.workers = await page.evaluate(() => ({ ...binaryWorkers }));
  report.externalRequests = requests.filter(url => new URL(url).origin !== origin);
  assert.deepEqual(report.externalRequests, []);
  await writeFile(resolve(evidenceRoot, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'passed', ...report }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolveServer => server.close(resolveServer));
}
