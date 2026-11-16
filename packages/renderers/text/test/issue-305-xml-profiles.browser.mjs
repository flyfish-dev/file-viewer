import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright'
import { launchBrowserForTest } from '../../../build-support/browser-test-launch.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../../..')
const require = createRequire(path.join(repo, 'apps/viewer-demo/package.json'))
const { build } = require('esbuild')
const textRequire = createRequire(path.join(here, '../package.json'))
const fixtureDir = path.join(here, 'fixtures/issue-305')
const fixtures = new Map(await Promise.all(['profiles.json', 'invoice-valid.xml', 'invoice-invalid.xml', 'invoice.xsd', 'invoice.xsl'].map(async name => [name, await readFile(path.join(fixtureDir, name), 'utf8')])))
const baseProfile = JSON.parse(fixtures.get('profiles.json')).profiles[0]
const runtimeFiles = {
  '/xml/xmllint-browser.mjs': textRequire.resolve('xmllint-wasm/xmllint-browser.mjs'),
  '/xml/xmllint.wasm': textRequire.resolve('xmllint-wasm/xmllint.wasm'),
  '/xml/xslt-wasm.js': textRequire.resolve('xslt-polyfill/dist/xslt-wasm.js')
}
const built = await build({
  stdin: {
    resolveDir: path.join(here, '..'), loader: 'js', contents: `
      import { renderFileViewerCode } from './dist/index.js';
      import { enableFileViewerXmlProfiles } from './dist/xml-profiles.js';
      let disable;
      let instance;
      window.activeWorkers = new Set();
      window.activeBlobs = new Set();
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(...args) { super(...args); window.activeWorkers.add(this); }
        terminate() { window.activeWorkers.delete(this); return super.terminate(); }
      };
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = value => { const url = create(value); window.activeBlobs.add(url); return url; };
      URL.revokeObjectURL = url => { window.activeBlobs.delete(url); return revoke(url); };
      window.XSLTProcessor = class { constructor() { throw Error('Native XSLT must never run'); } };
      window.render = async (source, xml, enabled = true, utf16 = false) => {
        instance?.unmount(); disable?.();
        disable = enabled ? enableFileViewerXmlProfiles() : undefined;
        window.controller = new AbortController();
        const buffer = utf16 ? new Uint16Array([0xfeff, ...Array.from(source, c => c.charCodeAt(0))]).buffer : new TextEncoder().encode(source).buffer;
        const original = [...new Uint8Array(buffer)];
        window.input = buffer;
        window.pending = renderFileViewerCode(buffer, document.querySelector('#target'), 'xml', {
          signal: window.controller.signal,
          options: { xml, text: { prettyPrint: true }, locale: 'en-US' }
        }).then(result => { instance = window.instance = result; window.originalUnchanged = original.every((v, i) => v === new Uint8Array(buffer)[i]); return window.state(); });
        return window.pending;
      };
      window.state = () => ({
        profile: instance?.xml?.profileId, view: instance?.xml?.view,
        codes: instance?.xml?.diagnostics.map(d => d.code) ?? [],
        diagnostics: instance?.xml?.diagnostics,
        source: document.querySelector('.xml-profile-source code')?.textContent ?? document.querySelector('code')?.textContent,
        frame: !!document.querySelector('iframe.xml-profile-rendered'),
        workers: window.activeWorkers.size, blobs: window.activeBlobs.size,
        unchanged: window.originalUnchanged
      });
    `
  }, bundle: true, format: process.env.XML_PROFILE_BUNDLE_FORMAT ?? 'esm',
  minify: process.env.XML_PROFILE_MINIFY === '1', target: 'es2019', write: false, logLevel: 'silent'
})
const overrides = new Map()
const requests = []
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  requests.push(url.pathname)
  const send = (type, contents) => { res.setHeader('content-type', type); res.end(contents) }
  try {
    if (overrides.has(url.pathname)) {
      const value = overrides.get(url.pathname)
      if (typeof value === 'function') return value(req, res)
      return send(url.pathname.endsWith('.json') ? 'application/json' : 'application/xml', value)
    }
    if (url.pathname === '/') return send('text/html', '<!doctype html><html><body style="margin:0"><div id="target" style="height:100vh"></div><script type="module" src="/app.js"></script></body></html>')
    if (url.pathname === '/app.js') return send('text/javascript', built.outputFiles[0].contents)
    if (runtimeFiles[url.pathname]) return send(url.pathname.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', await readFile(runtimeFiles[url.pathname]))
    if (url.pathname.startsWith('/profiles/') && fixtures.has(path.basename(url.pathname))) return send(url.pathname.endsWith('.json') ? 'application/json' : 'application/xml', fixtures.get(path.basename(url.pathname)))
    res.statusCode = 404; res.end('not found')
  } catch (error) { console.error(error); res.statusCode = 500; res.end('Fixture request failed') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browserName = process.env.XML_PROFILE_BROWSER ?? 'chromium'
const browser = await launchBrowserForTest(({ chromium, firefox, webkit }[browserName]), browserName, { headless: true })
const context = await browser.newContext({ viewport: { width: 900, height: 650 } })
const external = []
await context.route('**/*', route => {
  // WebKit intercepts Blob worker loads too; blocking these would prevent execution.
  if (route.request().url().startsWith(origin + '/') || route.request().url().startsWith(`blob:${origin}/`)) return route.continue()
  external.push(route.request().url()); return route.abort()
})
const page = await context.newPage()
if (process.env.XML_PROFILE_DEBUG) page.on('console', message => console.log('BROWSER', message.type(), message.text()))
const errors = []
page.on('pageerror', error => errors.push(error.message))
const defaults = { profilesUrl: '/profiles/profiles.json' }
const inline = (profiles, extra = {}) => ({ profiles, baseUrl: '/profiles/', ...extra })
const rootOnly = () => ({ ...baseProfile, match: { rootNamespace: baseProfile.match.rootNamespace } })
const xsdOnly = () => ({ ...baseProfile, match: { xsd: { enabled: true } } })
const valid = fixtures.get('invoice-valid.xml')
const invalid = fixtures.get('invoice-invalid.xml')
let checks = 0
async function check(name, fn) {
  overrides.clear(); requests.length = 0
  await fn(); checks++
  assert.equal(await page.evaluate(() => window.activeWorkers.size), 0, `${name}: worker leaked`)
  assert.equal(await page.evaluate(() => window.activeBlobs.size), 0, `${name}: blob URL leaked`)
  console.log(`PASS ${name}`)
}
const render = (source = valid, options = defaults, enabled = true, utf16 = false) => page.evaluate(args => window.render(...args), [source, options, enabled, utf16])
try {
  await page.goto(origin)
  await page.waitForFunction(() => !!window.render)
  await check('explicit registration is required and loads no engines', async () => {
    const result = await render(valid, defaults, false)
    assert.equal(result.frame, false)
    assert.equal(requests.length, 0)
  })
  await check('plain XML without profile configuration loads no resources', async () => {
    const result = await render(valid, null)
    assert.equal(result.frame, false)
    assert.equal(requests.length, 0)
  })
  await check('both checks: real WASM validation and transformation, exact source toggle', async () => {
    const result = await render()
    assert.equal(result.profile, 'invoice-v1', JSON.stringify(result))
    assert.equal(result.view, 'rendered')
    assert.equal(result.unchanged, true)
    assert.equal(result.source, valid)
    await page.frameLocator('.xml-profile-rendered').locator('h1').waitFor()
    assert.equal(await page.frameLocator('.xml-profile-rendered').locator('h1').textContent(), 'Invoice INV-1001')
    assert.equal(await page.locator('.xml-profile-rendered').getAttribute('sandbox'), '')
    const before = requests.length
    const diagnostics = result.codes
    await page.locator('button[data-xml-view="source"]').click()
    assert.equal((await page.evaluate(() => window.state())).view, 'source')
    await page.locator('button[data-xml-view="rendered"]').click()
    await page.frameLocator('.xml-profile-rendered').locator('h1').waitFor({ state: 'visible' })
    assert.equal(await page.frameLocator('.xml-profile-rendered').locator('h1').textContent(), 'Invoice INV-1001')
    const after = await page.evaluate(() => window.state())
    assert.deepEqual(after.codes, diagnostics)
    assert.equal(after.source, valid)
    assert.equal(after.unchanged, true)
    assert.equal(requests.length, before, 'switching must not download any resource')
    assert.equal(requests.filter(p => p.endsWith('invoice.xsd')).length, 1)
    assert.ok(requests.includes('/xml/xmllint.wasm'))
    assert.ok(requests.includes('/xml/xslt-wasm.js'))
    if (process.env.XML_PROFILE_SCREENSHOT) {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await page.screenshot({ path: process.env.XML_PROFILE_SCREENSHOT })
      await page.frameLocator('.xml-profile-rendered').locator('body').screenshot({ path: `${process.env.XML_PROFILE_SCREENSHOT}.frame.png` })
    }
  })
  await check('missing required element rejects transformation', async () => {
    const result = await render(invalid)
    assert.ok(result.codes.includes('xsd-invalid'))
    assert.equal(result.source, invalid)
    assert.equal(result.frame, false)
    assert.equal(requests.some(p => p.endsWith('.xsl') || p.endsWith('xslt-wasm.js')), false)
  })
  await check('real XSD datatype constraints reject invalid decimal', async () => {
    const result = await render(valid.replace('123.45', 'not-a-decimal'))
    assert.ok(result.codes.includes('xsd-invalid'))
  })
  await check('root mismatch prunes schema validation', async () => {
    const result = await render(valid.replaceAll('urn:example:invoice:v1', 'urn:other'))
    assert.ok(result.codes.includes('root-mismatch'))
    assert.deepEqual(requests, ['/profiles/profiles.json'])
  })
  await check('root/namespace alone can render structurally invalid XML', async () => {
    const result = await render(invalid, inline([rootOnly()]))
    assert.equal(result.view, 'rendered')
    assert.equal(requests.some(p => p.includes('xmllint') || p.endsWith('.xsd')), false)
  })
  await check('XSD alone selects a unique profile', async () => {
    const result = await render(valid, inline([xsdOnly()]))
    assert.equal(result.view, 'rendered')
  })
  await check('multiple validating XSD profiles are ambiguous and share downloads', async () => {
    const result = await render(valid, inline([xsdOnly(), { ...xsdOnly(), id: 'other' }]))
    assert.ok(result.codes.includes('ambiguous-profile'))
    assert.equal(result.frame, false)
    assert.equal(requests.filter(p => p.endsWith('invoice.xsd')).length, 1)
    assert.equal(requests.some(p => p.endsWith('.xsl')), false)
  })
  await check('only one of multiple XSD profiles passes', async () => {
    overrides.set('/profiles/other.xsd', fixtures.get('invoice.xsd').replace('name="invoice"', 'name="order"'))
    const result = await render(valid, inline([{ ...xsdOnly(), id: 'other', xsd: './other.xsd' }, xsdOnly()]))
    assert.equal(result.profile, 'invoice-v1')
    assert.ok(result.codes.includes('xsd-invalid'))
  })
  await check('multiple root-only matches are ambiguous', async () => {
    const result = await render(valid, inline([rootOnly(), { ...rootOnly(), id: 'other' }]))
    assert.ok(result.codes.includes('ambiguous-profile'))
    assert.equal(requests.length, 0)
  })
  await check('malformed XML and DTDs fail before resource loading', async () => {
    for (const source of ['<r><a></r>', '<!DOCTYPE r [<!ENTITY attack SYSTEM "https://blocked.test/a">]><r>&attack;</r>']) {
      const result = await render(source)
      assert.equal(result.frame, false)
      assert.equal(result.source, source)
    }
    assert.equal(requests.length, 0)
  })
  await check('schema includes and imports fail closed', async () => {
    for (const name of ['include', 'import', 'redefine', 'override']) {
      overrides.set('/profiles/invoice.xsd', fixtures.get('invoice.xsd').replace('<xs:element name="invoice">', `<xs:${name} schemaLocation="https://blocked.test/schema"/><xs:element name="invoice">`))
      const result = await render()
      assert.ok(result.codes.includes('unsafe-resource'))
      assert.equal(result.frame, false)
    }
  })
  await check('encoded document() and XSLT includes/imports fail closed', async () => {
    for (const expression of ['<xsl:value-of select="docum&#101;nt(&apos;https://blocked.test/a&apos;)"/>', '<xsl:include href="https://blocked.test/a"/>', '<xsl:import href="https://blocked.test/a"/>']) {
      overrides.set('/profiles/invoice.xsl', fixtures.get('invoice.xsl').replace('<article class="invoice">', `<article class="invoice">${expression}`))
      const result = await render(valid, inline([rootOnly()]))
      assert.ok(result.codes.includes('unsafe-resource'))
    }
  })
  await check('dynamic external reads are blocked inside the real WASM worker', async () => {
    overrides.set('/profiles/invoice.xsl', `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:dyn="http://exslt.org/dynamic"><xsl:output method="html"/><xsl:template match="/"><p><xsl:value-of select="dyn:evaluate(concat('docu','ment(&quot;https://blocked.test/secret&quot;)'))"/></p></xsl:template></xsl:stylesheet>`)
    const result = await render(valid, inline([rootOnly()]))
    assert.equal(result.frame, false)
    assert.ok(result.codes.includes('transform-error'))
  })
  await check('generated HTML remains isolated and cannot execute or fetch', async () => {
    overrides.set('/profiles/invoice.xsl', fixtures.get('invoice.xsl').replace('<article class="invoice">', '<article class="invoice"><script>window.__xmlAttack=1</script><img src="https://blocked.test/image" onerror="window.__xmlAttack=2"/><style>@import url(https://blocked.test/css);</style><a href="https://blocked.test/link">external</a>'))
    const result = await render(valid, inline([rootOnly()]))
    assert.equal(result.frame, true)
    await page.frameLocator('.xml-profile-rendered').locator('h1').waitFor()
    assert.equal(await page.frameLocator('.xml-profile-rendered').locator('script').count(), 0)
    assert.equal(await page.frameLocator('.xml-profile-rendered').locator('img').getAttribute('src'), null)
    assert.equal(await page.frameLocator('.xml-profile-rendered').locator('a').getAttribute('href'), null)
    assert.equal(await page.evaluate(() => window.__xmlAttack), undefined)
  })
  await check('malformed XSLT and engine errors restore original source', async () => {
    overrides.set('/profiles/invoice.xsl', '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"><xsl:template match="/"><xsl:value-of select="???"/></xsl:template></xsl:stylesheet>')
    const result = await render()
    assert.equal(result.frame, false)
    assert.equal(result.source, valid)
    assert.ok(result.codes.includes('transform-error'))
  })
  await check('redirects and cross-origin top-level assets are rejected', async () => {
    overrides.set('/profiles/redirect.json', (_req, res) => { res.writeHead(302, { location: 'https://blocked.test/manifest' }); res.end() })
    const result = await render(valid, { profilesUrl: '/profiles/redirect.json' })
    assert.equal(result.frame, false)
    const second = await render(valid, { profilesUrl: 'https://blocked.test/manifest' })
    assert.ok(second.codes.includes('unsafe-resource'))
  })
  await check('resource, source, profile count and output quotas recover to source', async () => {
    for (const limits of [{ maxXmlBytes: 10 }, { maxResourceBytes: 10 }, { maxTotalResourceBytes: 10 }]) {
      const result = await render(valid, { ...defaults, limits })
      assert.ok(result.codes.includes('limit-exceeded'))
    }
    const output = await render(valid, inline([rootOnly()], { limits: { maxOutputBytes: 10 } }))
    assert.equal(output.frame, false)
    assert.ok(output.codes.includes('transform-error'))
    const count = await render(valid, inline([rootOnly(), { ...rootOnly(), id: 'other' }], { limits: { maxProfiles: 1 } }))
    assert.ok(count.codes.includes('invalid-manifest'))
  })
  await check('chunked resources obey streaming limits without content-length', async () => {
    overrides.set('/profiles/profiles.json', (_req, res) => {
      res.setHeader('content-type', 'application/json')
      res.write(' '.repeat(600))
      res.end(' '.repeat(600))
    })
    const result = await render(valid, { ...defaults, limits: { maxResourceBytes: 1000 } })
    assert.ok(result.codes.includes('limit-exceeded'))
    assert.equal(result.source, valid)
  })
  await check('invalid WASM recovers to source and releases worker resources', async () => {
    overrides.set('/xml/xmllint.wasm', 'invalid wasm bytes')
    const result = await render()
    assert.ok(result.codes.includes('engine-error'))
    assert.equal(result.source, valid)
    assert.equal(result.frame, false)
  })
  await check('download cancellation preserves the next renderer', async () => {
    let responded
    const requested = new Promise(resolve => { responded = resolve })
    overrides.set('/profiles/profiles.json', (_req, res) => {
      res.setHeader('content-type', 'application/json')
      res.write('{"profiles":[')
      responded()
    })
    await page.evaluate(source => { void window.render(source, { profilesUrl: '/profiles/profiles.json' }); return true }, valid)
    await requested
    await page.evaluate(() => { window.controller.abort(); document.querySelector('#target').textContent = 'new source'; })
    await page.evaluate(() => window.pending)
    assert.equal(await page.locator('#target').textContent(), 'new source')
  })
  await check('UTF-16 original bytes and declaration remain intact while engines get UTF-8', async () => {
    const source = valid.replace('UTF-8', 'UTF-16')
    const result = await render(source, defaults, true, true)
    assert.equal(result.profile, 'invoice-v1')
    assert.equal(result.source, source)
    assert.equal(result.unchanged, true)
  })
  await check('engine timeout terminates CPU work and preserves source', async () => {
    const source = '<r>' + '<n/>'.repeat(3000) + '</r>'
    overrides.set('/profiles/invoice.xsl', '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><p><xsl:for-each select="//n"><xsl:for-each select="//n"><xsl:value-of select="position()"/></xsl:for-each></xsl:for-each></p></xsl:template></xsl:stylesheet>')
    const options = inline([{ ...rootOnly(), match: { rootNamespace: { enabled: true, root: 'r', namespace: '' } } }], { timeoutMs: 150 })
    const result = await render(source, options)
    assert.ok(result.codes.includes('timeout'), JSON.stringify(result.codes))
    assert.equal(result.source, source)
  })
  await check('cancellation terminates active workers and cannot erase a newer render', async () => {
    const source = '<r>' + '<n/>'.repeat(10000) + '</r>'
    overrides.set('/profiles/invoice.xsl', '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:template match="/"><p><xsl:for-each select="//n"><xsl:for-each select="//n"><xsl:value-of select="position()"/></xsl:for-each></xsl:for-each></p></xsl:template></xsl:stylesheet>')
    const options = inline([{ ...rootOnly(), match: { rootNamespace: { enabled: true, root: 'r', namespace: '' } } }])
    await page.evaluate(([source, options]) => { void window.render(source, options); return true }, [source, options])
    await page.waitForFunction(() => window.activeWorkers.size > 0)
    await page.evaluate(() => { window.controller.abort(); document.querySelector('#target').textContent = 'new render'; })
    await page.evaluate(() => window.pending)
    assert.equal(await page.locator('#target').textContent(), 'new render')
  })
  await check('unmount clears output frame, listeners and source', async () => {
    await render()
    await page.evaluate(() => window.instance.unmount())
    assert.equal(await page.locator('#target').textContent(), '')
  })
  assert.deepEqual(external, [], 'XML processing and HTML output must never request external resources')
  // WebKit reports an explicitly rejected redirect as a page error as well as
  // rejecting fetch(); the renderer must (and above does) recover to source.
  const unexpected = errors.filter(message => !(browserName === 'webkit' && message.endsWith('/profiles/redirect.json due to access control checks.')))
  assert.deepEqual(unexpected, [], 'No unhandled browser errors')
  console.log(JSON.stringify({ browser: browserName, bundle: process.env.XML_PROFILE_BUNDLE_FORMAT ?? 'esm', minified: process.env.XML_PROFILE_MINIFY === '1', checks, externalRequests: external.length }))
} finally {
  await context.close()
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
