import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(join(root, 'package.json'))
const { build } = require('esbuild')
const playwright = require('playwright')
const appRequire = createRequire(join(root, 'apps/component-demo/package.json'))

const output = resolve(process.env.I18N_EVIDENCE_DIR || join(root, '.release/i18n-20261110'))
await mkdir(join(output, 'browser'), { recursive: true })
const frameworks = [
  'web',
  'element',
  'vue3',
  'vue2.6',
  'vue2.7',
  'react',
  'react-legacy',
  'svelte',
  'jquery'
]
const filter = process.env.I18N_FRAMEWORKS?.split(',')
const cases = frameworks
  .filter((name) => !filter || filter.includes(name))
  .flatMap((framework) =>
    [false, true].map((full) => ({ framework, full, id: framework + (full ? '-full' : '') }))
  )
const file = (path) => JSON.stringify(join(root, path))
const inputFor = ({ framework, full }) => {
  const packageName = (framework === 'element' ? 'web' : framework) + (full ? '-full' : '')
  const module = `packages/components/${packageName}/dist/${framework === 'vue3' && !full ? 'index.mjs' : framework === 'svelte' ? 'FileViewer.client.js' : 'index.js'}`
  let imports = `import * as component from ${file(module)};`
  let mount
  if (framework === 'react' || framework === 'react-legacy') {
    const legacy = framework === 'react-legacy'
    imports += `\nimport React from ${JSON.stringify(appRequire.resolve(legacy ? 'react17' : 'react'))};\nimport * as ReactDOM from ${JSON.stringify(appRequire.resolve(legacy ? 'react-dom17' : 'react-dom/client'))};`
    mount = `const ref = React.createRef();
      const app = ${legacy ? 'null' : 'ReactDOM.createRoot(host)'};
      const render = next => ${legacy ? 'ReactDOM.render' : 'app.render'}(React.createElement(component.FileViewer || component.FileViewerLegacy || component.default, { ...next, ref })${legacy ? ', host' : ''});
      render(props); dispose = () => ${legacy ? 'ReactDOM.unmountComponentAtNode(host)' : 'app.unmount()'};
      update = next => render({ ...props, options: { ...options, ...next } });`
  } else if (framework.startsWith('vue')) {
    const vueRoot = `packages/components/${framework}/node_modules/vue/dist/${framework === 'vue3' ? 'vue.runtime.esm-bundler.js' : 'vue.runtime.esm.js'}`
    imports += `\nimport * as Vue from ${file(vueRoot)};`
    mount =
      framework === 'vue3'
        ? `const data = Vue.reactive(props); const app = Vue.createApp({ render: () => Vue.h(component.FileViewer, data) }); app.mount(host); dispose = () => app.unmount(); update = async next => { data.options = { ...options, ...next }; await Vue.nextTick(); };`
        : `const app = new Vue.default({ data: () => ({ options }), render(h) { return h(component.FileViewer, { props: { ...props, options: this.options } }); } }); app.$mount(); host.append(app.$el); dispose = () => { app.$destroy(); app.$el.remove(); }; update = async next => { app.options = { ...options, ...next }; await Vue.default.nextTick(); };`
  } else if (framework === 'svelte') {
    mount = `const app = new component.default({ target: host, props }); dispose = () => app.$destroy(); update = next => app.$set({ options: { ...options, ...next } });`
  } else if (framework === 'jquery') {
    imports += `\nimport jquery from ${JSON.stringify(appRequire.resolve('jquery'))};`
    mount = `component.installJQueryFileViewer(jquery); jquery(host).fileViewer(props); dispose = () => jquery(host).fileViewer('destroy'); update = next => jquery(host).fileViewer('update', { options: { ...options, ...next } });`
  } else if (framework === 'element') {
    mount = `component.defineFileViewerElement('i18n-viewer'); const element = document.createElement('i18n-viewer'); element.style.cssText = 'display:block;height:100%'; element.source = props; host.append(element); dispose = () => element.remove(); update = next => { element.options = { ...options, ...next }; };`
  } else {
    mount = `const controller = component.mountViewer(host, props); dispose = () => controller.destroy(); update = next => controller.update({ options: { ...options, ...next } });`
  }
  return `${imports}
import { createFileViewerTranslator, FILE_VIEWER_SUPPORTED_LOCALES, translateFileViewerMessage } from ${file('packages/core/dist/index.js')};
let dispose = () => {}, update, parses = 0;
const host = document.getElementById('host');
const definition = { id: 'i18n-fixture', label: 'I18n fixture', category: 'document', extensions: ['fixture'] };
const plugin = { id: 'i18n-fixture', definitions: [definition], handlers: [{ rendererId: definition.id, handler: async (_bytes, target, _type, context) => {
  parses++;
  const t = createFileViewerTranslator(context?.i18n || context?.options);
  const article = document.createElement('article'); article.className = 'i18n-model'; article.lang = 'fr';
  article.style.cssText = 'height:160px;overflow:auto';
  const raw = document.createElement('p'); raw.textContent = 'Download';
  const input = document.createElement('input'); input.value = 'retained search'; input.setAttribute('aria-label', 'document fixture input');
  const count = document.createElement('p'); count.className = 'i18n-count'; t.text(count, 'pdf.nav.pageCount', { count: 22 });
  const button = document.createElement('button'); t.text(button, 'toolbar.download'); t.attr(button, 'aria-label', 'toolbar.downloadTitle');
  const spacer = document.createElement('div'); spacer.style.height = '800px';
  article.append(raw, input, count, button, spacer); target.append(article);
  return { $el: article, unmount() { article.remove(); } };
}}] };
function find(selector, root = host) { return root.querySelector(selector) || (root.shadowRoot && find(selector, root.shadowRoot)) || [...root.querySelectorAll('*')].filter(el => el.shadowRoot).map(el => find(selector, el.shadowRoot)).find(Boolean); }
const wait = async predicate => { for(let i = 0; i < 500; i++) { if(predicate()) return; await new Promise(r => setTimeout(r, 10)); } throw new Error('i18n fixture timeout: ' + host.innerHTML.slice(0, 400)); };
window.fixture = {
  async mount(locale) {
    dispose(); host.replaceChildren();
    const options = { locale, theme: 'light', autoRenderers: false, preset: { id: 'i18n-fixture', renderers: [plugin] }, rendererMode: 'replace', toolbar: { download: true, print: false } };
    const props = { url: '/fixture.fixture', filename: 'fixture.fixture', options };
    ${mount}
    await wait(() => find('.i18n-count'));
  },
  async check(locale) {
    const node = find('.i18n-model'), input = node.querySelector('input');
    node.scrollTop = 90; input.value = 'retained search';
    const before = parses;
    await update({ locale });
    await new Promise(resolve => setTimeout(resolve, 50));
    await wait(() => find('.i18n-count')?.textContent === translateFileViewerMessage({ locale }, 'pdf.nav.pageCount', { count: 22 }));
    if(node !== find('.i18n-model') || node.scrollTop !== 90 || input.value !== 'retained search' || parses !== before || node.lang !== 'fr' || node.querySelector('p').textContent !== 'Download') throw new Error('Reading state changed');
    if(node.querySelector('button').getAttribute('aria-label') !== translateFileViewerMessage({ locale }, 'toolbar.downloadTitle')) throw new Error('ARIA copy did not update');
    return { locale, count: find('.i18n-count').textContent, parses };
  },
  async run() {
    const results = [];
    for(const initial of FILE_VIEWER_SUPPORTED_LOCALES) {
      await this.mount(initial);
      results.push({ initial, checks: await Promise.all([this.check(initial)]) });
      for(const locale of FILE_VIEWER_SUPPORTED_LOCALES) results.at(-1).checks.push(await this.check(locale));
    }
    document.getElementById('result').textContent = 'PASS · '+${JSON.stringify(framework)}+' · '+FILE_VIEWER_SUPPORTED_LOCALES.length+' languages';
    return { userAgent: navigator.userAgent, results };
  }, dispose() { dispose(); }
};
if(new URLSearchParams(location.search).has('auto')) window.fixture.run().then(result => fetch('/ios-report', { method: 'POST', body: JSON.stringify(result) })).catch(error => { document.getElementById('result').textContent = 'FAIL '+error.stack; fetch('/ios-report', { method: 'POST', body: JSON.stringify({ error: String(error.stack) }) }); });
`
}

for (const entry of cases) {
  const legacy = entry.framework === 'react-legacy'
  await build({
    absWorkingDir: root,
    stdin: { contents: inputFor(entry), resolveDir: root, loader: 'ts' },
    outdir: join(output, 'browser', entry.id),
    entryNames: 'entry',
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: ['chrome120', 'safari18'],
    define: {
      'process.env.NODE_ENV': '"production"',
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    },
    loader: { '.css': 'empty', '.wasm': 'file', '.ttf': 'file' },
    logLevel: 'error',
    plugins: [
      {
        name: 'workspace-runtime',
        setup(b) {
          b.onResolve({ filter: /^@file-viewer\/core(?:\/.*)?$/ }, (args) => ({
            path: join(
              root,
              'packages/core/dist',
              (args.path.split('/').slice(2).join('/') || 'index') + '.js'
            )
          }))
          b.onResolve({ filter: /^@excalidraw\/excalidraw$/ }, () => ({
            path: join(root, 'packages/components/web/scripts/excalidraw-iife-stub.ts')
          }))
          b.onResolve({ filter: /^@file-viewer\/ppt$/ }, () => ({
            path: join(
              root,
              'packages/components/web-full/scripts/ppt-packaged-runtime-fallback.ts'
            )
          }))
          if (legacy)
            b.onResolve({ filter: /^react(?:\/.*)?$/ }, (args) => ({
              path: appRequire.resolve(args.path.replace(/^react/, 'react17'))
            }))
        }
      }
    ]
  })
}

let requests = 0
const evidence = { cases: [], simulator: null }
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/fixture.fixture') {
      requests++
      res.end('retained model fixture')
      return
    }
    if (url.pathname === '/ios-report') {
      let body = ''
      for await (const chunk of req) body += chunk
      evidence.simulator = JSON.parse(body)
      await save()
      res.end('ok')
      return
    }
    if (url.pathname.endsWith('.html') || url.pathname === '/') {
      const requestedId = url.searchParams.get('case') || cases[0].id
      const entry = cases.find((entry) => entry.id === requestedId)
      assert(entry)
      const id = entry.id
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(
        `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;font-family:system-ui}#host{height:80vh;width:100%}#result{padding:12px;overflow-wrap:anywhere}</style><output id="result">Testing ${id}</output><div id="host"></div><script type="module" src="/${id}/entry.js"></script></html>`
      )
      return
    }
    const path = resolve(output, 'browser', '.' + url.pathname)
    assert(path.startsWith(join(output, 'browser') + '/'))
    res.setHeader(
      'Content-Type',
      extname(path) === '.js' ? 'text/javascript; charset=utf-8' : 'application/octet-stream'
    )
    res.end(await readFile(path))
  } catch (error) {
    console.error('[i18n-browser] Request failed', error)
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Not found')
  }
})
const save = () => writeFile(join(output, 'CURRENT.json'), JSON.stringify(evidence, null, 2) + '\n')
await new Promise((r) => server.listen(Number(process.env.I18N_TEST_PORT || 0), '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`
console.log(`[i18n-browser] ${base}`)
try {
  for (const name of (process.env.I18N_BROWSERS || 'chromium,firefox,webkit').split(',')) {
    const executablePath = process.env[`I18N_${name.toUpperCase()}_EXECUTABLE`]
    const browser = await playwright[name].launch({
      headless: true,
      ...(executablePath ? { executablePath } : {})
    })
    try {
      for (const entry of cases.filter(
        (entry) => name === 'chromium' || ['web', 'vue3'].includes(entry.framework)
      )) {
        const page = await browser.newPage()
        const errors = []
        page.on('pageerror', (error) => errors.push(String(error.stack)))
        await page.goto(`${base}/?case=${entry.id}`)
        await page.waitForFunction(() => Boolean(window.fixture))
        const result = await page.evaluate(() => window.fixture.run())
        const before = requests
        await page.context().setOffline(true)
        await page.evaluate(() => window.fixture.check('zh-HK'))
        await page.evaluate(() => window.fixture.check('de-DE'))
        assert.equal(requests, before, `${entry.id}: language switch downloaded source`)
        assert.deepEqual(errors, [], entry.id)
        evidence.cases.push({ browser: name, case: entry.id, sourceRequests: requests, ...result })
        await save()
        await page.screenshot({ path: join(output, `${name}-${entry.id}.png`) })
        await page.close()
        console.log(`[i18n-browser] PASS ${name}/${entry.id}`)
      }
    } finally {
      await browser.close()
    }
  }
  await save()
  if (process.env.I18N_KEEP_SERVER === '1') {
    console.log(`[i18n-browser] Simulator URL: ${base}/?case=vue3&auto=1`)
    await new Promise(() => {})
  }
} finally {
  server.close()
}
