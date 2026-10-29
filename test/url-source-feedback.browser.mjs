import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.env.FILE_VIEWER_TEST_ROOT || path.resolve(import.meta.dirname, '..')
const require = createRequire(path.join(root, 'package.json'))
const app = createRequire(path.join(root, 'apps/component-demo/package.json'))
const sheet = createRequire(path.join(root, 'packages/renderers/spreadsheet/package.json'))
const vue = createRequire(path.join(root, 'packages/components/vue3/package.json'))
const { build } = require('esbuild')
const browsers = require('playwright')
const JSZip = require('jszip')
const XLSX = sheet('styled-exceljs')
const output = path.resolve(
  process.env.FILE_VIEWER_SOURCE_FEEDBACK_EVIDENCE || path.join(root, 'output/url-source-feedback')
)
const coreRoot = path.resolve(
  process.env.FILE_VIEWER_SOURCE_FEEDBACK_CORE_ROOT || path.join(root, 'packages/core/dist')
)
await mkdir(output, { recursive: true })
const at = (value) => JSON.stringify(path.join(root, value))
const result = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: 'tsx',
    contents: `
import {mountViewer as mountCore} from ${JSON.stringify(path.join(coreRoot, 'browser.js'))};
import {mountViewer as mountWeb,defineFileViewerElement} from ${at('packages/components/web/dist/index.js')};
import ViewerReact from ${at('packages/components/react/dist/index.js')};
import {fileViewer as svelteAction} from ${at('packages/components/svelte/dist/index.js')};
import {installJQueryFileViewer,getFileViewerController} from ${at('packages/components/jquery/dist/index.js')};
import preset from ${at('packages/presets/standard/dist/index.js')};
import {FileViewer as ViewerVue} from ${at('packages/components/vue3/dist/index.mjs')};
import React from ${JSON.stringify(app.resolve('react'))};
import {createRoot} from ${JSON.stringify(app.resolve('react-dom/client'))};
import jquery from ${JSON.stringify(app.resolve('jquery'))};
import {createApp,h,shallowRef,nextTick} from ${JSON.stringify(vue.resolve('vue'))};
installJQueryFileViewer(jquery);defineFileViewerElement();
window.drawn=[];const nativeDraw=CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.drawn.push(String(text));return nativeDraw.call(this,text,...args)};
const all=(selector,root=document.getElementById('host'))=>[...root.querySelectorAll(selector),...([...root.querySelectorAll('*')].flatMap(el=>el.shadowRoot?all(selector,el.shadowRoot):[])),...(root.shadowRoot?all(selector,root.shadowRoot):[])];
const text=root=>root.nodeType===3?root.textContent:root instanceof Element&&(getComputedStyle(root).display==='none'||getComputedStyle(root).visibility==='hidden')?'':[...root.childNodes].map(text).join('')+(root.shadowRoot?text(root.shadowRoot):'');
window.fixture={
 async mount(wrapper,source,config={}){
  window.dispose?.();window.drawn=[];window.stateCalls=[];window.transportCalls=[];window.transportSettled=[];window.hostErrors=[];
  const host=document.getElementById('host');host.replaceChildren();
  const options={preset,rendererMode:'replace',autoRenderers:false,toolbar:false,locale:config.locale||'en-US',theme:config.theme||'light',styleIsolation:config.isolation||'none',spreadsheet:{workerUrl:'/sheet.worker.js'}};
  if(config.slowFile){class SlowFile extends File{arrayBuffer(){return new Promise(resolve=>{window.releaseFile=()=>super.arrayBuffer().then(resolve)})}}source={file:new SlowFile([new Uint8Array([65,66,67])],'local.txt'),url:'/must-not-fetch.txt'};}
  const props={...source,options,onStateChange:s=>window.stateCalls.push({loading:s.loading,ready:s.ready,error:String(s.error)})};
  const transport=config.transport?async input=>{window.transportCalls.push(input);try{const response=await fetch(input.url,{signal:config.transport==='ignore-abort'?undefined:input.signal,headers:{'X-Test-Authorization':'local-fixture-only'}});if(!response.ok)throw Error('Transport HTTP '+response.status);return await response.blob()}finally{window.transportSettled.push(input.url)}}:undefined;
  const coreOptions={fetchFile:transport,onError:e=>window.hostErrors.push(String(e))};
  let controller;
  if(wrapper==='react'){
   const ref=React.createRef(),application=createRoot(host);application.render(React.createElement(ViewerReact,{...props,ref}));window.dispose=()=>application.unmount();for(let i=0;i<1000&&!ref.current;i++)await new Promise(r=>setTimeout(r,10));controller=ref.current;
  }else if(wrapper==='svelte'){controller=svelteAction(host,props);window.dispose=()=>controller.destroy();}
  else if(wrapper==='jquery'){jquery(host).fileViewer(props);controller=getFileViewerController(host);window.dispose=()=>jquery(host).fileViewer('destroy');}
  else if(wrapper==='element'){controller=document.createElement('flyfish-file-viewer');controller.style.cssText='height:100%;display:block';controller.source=props;host.append(controller);window.dispose=()=>controller.remove();}
  else if(wrapper==='vue'){
   const ref=shallowRef(),application=createApp({render:()=>h(ViewerVue,{...props,ref})});application.mount(host);await nextTick();controller=ref.value;window.dispose=()=>application.unmount();
  }else{controller=(wrapper==='web'?mountWeb:mountCore)(host,props,coreOptions);window.dispose=()=>controller.destroy();}
  window.controller=()=>controller?.getController?.()||controller;
  window.updateSource=next=>window.controller().update(next);
 },
 all,text(){return text(document.getElementById('host'));},
 state(){return window.controller()?.getState?.();},
 status(){return all('[data-file-viewer-source-state]')[0];},
 rendered(value){return window.drawn.includes(value)&&all('canvas').some(c=>c.width>20&&c.height>20&&c.getContext('2d')?.getImageData(0,0,c.width,c.height).data.some((v,i,a)=>i%4===0&&v<100&&a[i+3]>0));},
 track(){window.trace=[];window.tracking=true;const frame=()=>{if(!window.tracking)return;const s=this.state();window.trace.push({loading:s?.loading,text:this.text().trim(),overlays:all('[data-file-viewer-source-state="loading"]').length});requestAnimationFrame(frame)};requestAnimationFrame(frame);},
 stop(){window.tracking=false;return window.trace;}
};window.ready=true;
`
  },
  nodePaths: [path.join(root, 'packages/core/node_modules')],
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome120', 'safari18'],
  write: false,
  outdir: output,
  entryNames: 'entry',
  chunkNames: 'chunks/[name]-[hash]',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [
    {
      name: 'one-core-and-local-pdf',
      setup(b) {
        b.onResolve({ filter: /^@file-viewer\/core(?:\/.*)?$/ }, (a) => ({
          path: path.join(
            coreRoot,
            (a.path.slice('@file-viewer/core'.length).replace(/^\//, '') || 'index') + '.js'
          )
        }))
        b.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, (a) => ({
          path: app.resolve(a.path)
        }))
        b.onResolve({ filter: /pdfjs-dist\/|[\\/]vendor[\\/]pdfjs[\\/]/ }, (a) => {
          const value = a.path.replaceAll('\\', '/')
          return {
            path:
              '/pdfjs/' +
              (value.startsWith('pdfjs-dist/')
                ? value.slice(11)
                : value.split('/vendor/pdfjs/')[1]),
            external: true
          }
        })
      }
    }
  ],
  logLevel: 'warning'
})
const assets = new Map(
  result.outputFiles.map((file) => [
    '/' + path.relative(output, file.path).split(path.sep).join('/'),
    file.contents
  ])
)
async function workbook(label) {
  const book = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([[label, 423]])
  // This gate checks source acquisition, including the exact rendered label.
  // Give the label authored space instead of relying on renderer auto-fit.
  sheet['!cols'] = [{ wch: 28 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(book, sheet, 'Download')
  const zip = await JSZip.loadAsync(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }))
  zip.file('customXml/item1.xml', '<extra><!--' + 'x'.repeat(6900000) + '--></extra>')
  for (const entry of Object.values(zip.files)) entry.date = new Date('2026-01-01T00:00:00Z')
  return zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })
}
const main = process.env.FILE_VIEWER_SOURCE_FEEDBACK_FIXTURE
  ? await readFile(process.env.FILE_VIEWER_SOURCE_FEEDBACK_FIXTURE)
  : await workbook('DOWNLOAD READY 423')
const variants = new Map([
  ['/large.xlsx', main],
  ['/old.xlsx', await workbook('OBSOLETE 423')],
  ['/new.xlsx', await workbook('NEWEST 423')]
])
variants.set('/control.txt', Buffer.from('Vue source-control ready.\n'))
const requests = [],
  gates = new Map()
const runtime = path.join(root, 'packages/renderers/pdf/dist/vendor/pdfjs')
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost'),
    id = url.searchParams.get('case')
  if (
    variants.has(url.pathname) ||
    url.pathname === '/error.xlsx' ||
    url.pathname === '/network.xlsx'
  ) {
    const data = variants.get(url.pathname) || main
    const record = {
      id,
      path: url.pathname,
      bytes: 0,
      complete: false,
      closed: false,
      authorization: req.headers['x-test-authorization'] || ''
    }
    requests.push(record)
    res.on('finish', () => {
      record.complete = true
    })
    res.on('close', () => {
      record.closed = true
    })
    if (url.pathname === '/network.xlsx') {
      req.socket.destroy()
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    if (url.pathname === '/error.xlsx') {
      res.writeHead(404).end('Not found')
      return
    }
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': data.length
    })
    const firstBytes = Math.min(65536, Math.max(1, Math.floor(data.length / 2)))
    record.bytes = firstBytes
    res.write(data.subarray(0, firstBytes))
    gates.set(id, () => {
      if (res.destroyed) return
      record.bytes = data.length
      if (url.searchParams.has('reject')) res.destroy()
      else res.end(data.subarray(firstBytes))
    })
    return
  }
  if (assets.has(url.pathname)) {
    res.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript')
    res.end(assets.get(url.pathname))
    return
  }
  if (url.pathname === '/sheet.worker.js') {
    res.setHeader('Content-Type', 'text/javascript')
    readFile(path.join(root, 'packages/renderers/spreadsheet/dist/worker/sheet.worker.js')).then(
      (b) => res.end(b)
    )
    return
  }
  if (url.pathname.startsWith('/pdfjs/')) {
    const file = path.resolve(runtime, url.pathname.slice(7))
    assert.ok(file.startsWith(runtime + path.sep))
    res.setHeader(
      'Content-Type',
      file.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream'
    )
    readFile(file).then(
      (b) => res.end(b),
      () => res.writeHead(404).end()
    )
    return
  }
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html')
    res.end(
      '<!doctype html><meta charset="utf-8"><style>#host{width:900px;height:650px}</style><div id="host"></div><script type="module" src="/entry.js"></script>'
    )
    return
  }
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204).end()
    return
  }
  res.writeHead(404).end()
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = 'http://127.0.0.1:' + server.address().port
const report = {
  status: 'running',
  selection: {
    coreRoot,
    wrappers:
      process.env.FILE_VIEWER_SOURCE_FEEDBACK_WRAPPERS || 'all affected mountViewer entries',
    skipLifecycle: process.env.FILE_VIEWER_SOURCE_FEEDBACK_SKIP_LIFECYCLE === '1'
  },
  fixture: {
    synthetic: true,
    bytes: main.length,
    sha256: createHash('sha256').update(main).digest('hex')
  },
  cases: [],
  requests
}
const urlFor = (file, id) => base + file + '?case=' + id
const started = async (id) => {
  for (let n = 0; n < 500 && !requests.some((r) => r.id === id); n++)
    await new Promise((resolve) => setTimeout(resolve, 10))
  assert.ok(
    requests.some((r) => r.id === id),
    'Real HTTP request started: ' + id
  )
}
const paint = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
const ready = (page, value = 'DOWNLOAD READY 423') =>
  page.waitForFunction((value) => fixture.rendered(value), value, { timeout: 20000 })
async function waiting(page, id, message) {
  await started(id)
  const text = page.getByText(message, { exact: true }).first()
  await text.waitFor({ state: 'visible' })
  await paint(page)
  assert.equal(await text.isVisible(), true)
  const box = await text.boundingBox()
  assert.ok(box.width > 20 && box.height > 8)
  const computed = await text.evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    color: getComputedStyle(el).color
  }))
  assert.notEqual(computed.opacity, '0')
  assert.notEqual(computed.color, 'rgba(0, 0, 0, 0)')
  assert.equal(requests.find((r) => r.id === id).complete, false)
  return { message, box, computed, bytes: requests.find((r) => r.id === id).bytes }
}
try {
  for (const engine of (process.env.FILE_VIEWER_TEST_BROWSERS || 'chromium,webkit').split(',')) {
    const browser = await browsers[engine].launch({ headless: true })
    try {
      const configs = [
        ['core', 'zh-CN', 'light', 'none'],
        ['web', 'en-US', 'dark', 'shadow'],
        ['element', 'zh-CN', 'dark', 'shadow'],
        ['react', 'en-US', 'light', 'none'],
        ['react', 'zh-CN', 'dark', 'shadow'],
        ['svelte', 'en-US', 'dark', 'none'],
        ['jquery', 'zh-CN', 'light', 'shadow']
      ]
      // Vue uses a separate source-loading implementation. Keep its explicit
      // before/after diagnostic available without making unrelated layout
      // behavior part of this mountViewer acquisition gate. Existing Vue/PDF
      // compatibility gates remain unchanged; all page errors still fail here.
      if (process.env.FILE_VIEWER_SOURCE_FEEDBACK_WRAPPERS?.split(',').includes('vue'))
        configs.push(['vue', 'en-US', 'light', 'none'])
      for (const [wrapper, locale, theme, isolation] of configs) {
        if (
          process.env.FILE_VIEWER_SOURCE_FEEDBACK_WRAPPERS &&
          !process.env.FILE_VIEWER_SOURCE_FEEDBACK_WRAPPERS.split(',').includes(wrapper)
        )
          continue
        const page = await browser.newPage({ viewport: { width: 1000, height: 760 } }),
          errors = [],
          workers = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('worker', (worker) => workers.push(worker.url()))
        const id = [engine, wrapper, locale, isolation].join('-')
        try {
          await page.goto(base)
          await page.waitForFunction(() => window.ready)
          const sourceFile = wrapper === 'vue' ? '/control.txt' : '/large.xlsx'
          await page.evaluate(
            ({ wrapper, url, config, sourceFile }) =>
              fixture.mount(
                wrapper,
                {
                  url,
                  filename: sourceFile.slice(1),
                  type: sourceFile.endsWith('.txt') ? 'txt' : 'xlsx'
                },
                config
              ),
            {
              wrapper,
              url: urlFor(sourceFile, id),
              config: { locale, theme, isolation },
              sourceFile
            }
          )
          const message =
            locale === 'zh-CN' ? '正在下载文件资源...' : 'Downloading file resources...'
          const visible = await waiting(page, id, message)
          if (wrapper === 'vue') {
            // Vue has its own acquisition shell. It is the report's existing
            // download-state reference, not a target of this controller fix.
            // Its separate renderer/resize lifecycle is outside this gate.
            assert.deepEqual(errors, [])
            await page.screenshot({ path: path.join(output, id + '-waiting.png') })
            report.cases.push({
              id,
              status: 'passed',
              scope: 'existing Vue download-state control; unmount before rendering',
              visible,
              errors
            })
            console.log('[423]', id, 'download control passed')
            continue
          }
          assert.equal(await page.evaluate(() => fixture.state().loading), true)
          await page.evaluate(() => fixture.track())
          await page.screenshot({ path: path.join(output, id + '-waiting.png') })
          gates.get(id)()
          await ready(page)
          await paint(page)
          const trace = await page.evaluate(() => fixture.stop())
          assert.ok(trace.length > 0)
          assert.ok(
            trace.every((frame) => !frame.loading || frame.text.length > 0),
            'No blank loading frame across acquisition/render handoff'
          )
          assert.ok(
            trace.every((frame) => frame.overlays <= 1),
            'At most one shell loading surface'
          )
          assert.equal(
            await page.evaluate(() => fixture.all('[data-file-viewer-source-state]').length),
            0
          )
          assert.ok(workers.some((worker) => worker.endsWith('/sheet.worker.js')))
          assert.deepEqual(errors, [])
          const network = requests.filter((r) => r.id === id)
          assert.equal(network.length, 1)
          assert.equal(network[0].bytes, variants.get(sourceFile).length)
          assert.equal(network[0].complete, true)
          await page.screenshot({ path: path.join(output, id + '-rendered.png') })
          report.cases.push({
            id,
            status: 'passed',
            visible,
            handoffFrames: trace.length,
            renderedContent: 'DOWNLOAD READY 423',
            workers,
            errors
          })
          console.log('[423]', id, 'passed')
        } catch (error) {
          report.failure = {
            id,
            error: error.stack,
            browserErrors: errors,
            state: await page
              .evaluate(() => ({ state: fixture.state(), text: fixture.text(), drawn: window.drawn }))
              .catch(() => null)
          }
          await page.screenshot({ path: path.join(output, id + '-failure.png') })
          throw error
        } finally {
          await page.evaluate(() => window.dispose?.()).catch(() => {})
          await page.close()
        }
      }
      if (process.env.FILE_VIEWER_SOURCE_FEEDBACK_SKIP_LIFECYCLE === '1') continue
      for (const failure of ['error', 'network', 'custom']) {
        const page = await browser.newPage(),
          errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        const id = engine + '-failure-' + failure
        try {
          await page.goto(base)
          await page.waitForFunction(() => window.ready)
          await page.evaluate(
            ({ url, custom }) =>
              fixture.mount(
                'core',
                { url, filename: 'failure.xlsx' },
                {
                  locale: 'en-US',
                  isolation: 'shadow',
                  transport: custom ? 'authenticated' : undefined
                }
              ),
            {
              url: urlFor(failure === 'network' ? '/network.xlsx' : '/error.xlsx', id),
              custom: failure === 'custom'
            }
          )
          await page.getByRole('alert').waitFor({ state: 'visible' })
          const state = await page.evaluate(() => ({
            loading: fixture.state().loading,
            ready: fixture.state().ready,
            error: String(fixture.state().error),
            calls: window.hostErrors.length
          }))
          assert.equal(state.loading, false)
          assert.equal(state.ready, false)
          assert.equal(state.calls, 1)
          assert.ok(state.error.length > 0)
          assert.deepEqual(errors, [])
          if (failure === 'custom')
            assert.equal(requests.find((r) => r.id === id).authorization, 'local-fixture-only')
          report.cases.push({ id, status: 'passed', ...state })
        } finally {
          await page.evaluate(() => window.dispose?.())
          await page.close()
        }
      }
      for (const failure of [false, true]) {
        const page = await browser.newPage(),
          errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        const id = engine + '-stale-' + failure,
          oldId = id + '-old',
          newId = id + '-new'
        try {
          await page.goto(base)
          await page.waitForFunction(() => window.ready)
          await page.evaluate(
            (url) =>
              fixture.mount(
                'core',
                { url, filename: 'old.xlsx' },
                { transport: 'ignore-abort', isolation: 'shadow' }
              ),
            urlFor('/old.xlsx', oldId) + (failure ? '&reject=1' : '')
          )
          await waiting(page, oldId, 'Downloading file resources...')
          await page.evaluate(
            (url) => {
              window.replacing = updateSource({ url, filename: 'new.xlsx' })
            },
            urlFor('/new.xlsx', newId)
          )
          await waiting(page, newId, 'Downloading file resources...')
          assert.equal(await page.evaluate(() => window.transportCalls[0].signal.aborted), true)
          gates.get(oldId)()
          await page.waitForFunction(
            (oldId) =>
              window.transportSettled.some(
                (url) => new URL(url).searchParams.get('case') === oldId
              ),
            oldId
          )
          await paint(page)
          assert.equal(await page.evaluate(() => fixture.state().loading), true)
          assert.equal(
            await page.getByText('Downloading file resources...', { exact: true }).isVisible(),
            true
          )
          gates.get(newId)()
          await ready(page, 'NEWEST 423')
          await page.evaluate(() => window.replacing)
          assert.equal(await page.evaluate(() => window.drawn.includes('OBSOLETE 423')), false)
          assert.equal(await page.evaluate(() => window.hostErrors.length), 0)
          assert.deepEqual(errors, [])
          report.cases.push({
            id,
            status: 'passed',
            oldSignalAborted: true,
            lateOldFailure: failure,
            rendered: 'NEWEST 423'
          })
        } finally {
          await page.evaluate(() => window.dispose?.())
          await page.close()
        }
      }
      for (const action of ['clear', 'destroy', 'react-unmount']) {
        const page = await browser.newPage(),
          errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        const id = engine + '-' + action
        try {
          await page.goto(base)
          await page.waitForFunction(() => window.ready)
          await page.evaluate(
            ({ url, action }) =>
              fixture.mount(
                action === 'react-unmount' ? 'react' : 'core',
                { url, filename: 'old.xlsx' },
                {
                  isolation: 'shadow',
                  transport: action === 'react-unmount' ? undefined : 'ignore-abort'
                }
              ),
            { url: urlFor('/old.xlsx', id) + '&reject=1', action }
          )
          await waiting(page, id, 'Downloading file resources...')
          await page.evaluate(async (action) => {
            if (action === 'clear') await updateSource({ url: undefined })
            else window.dispose()
            window.afterCleanupCalls = window.stateCalls.length
          }, action)
          gates.get(id)()
          await page.waitForTimeout(100)
          await paint(page)
          assert.equal(
            await page.evaluate(() => fixture.all('[data-file-viewer-source-state]').length),
            0
          )
          assert.equal(await page.evaluate(() => window.drawn.includes('OBSOLETE 423')), false)
          assert.equal(
            await page.evaluate(() => window.stateCalls.length),
            await page.evaluate(() => window.afterCleanupCalls)
          )
          assert.deepEqual(errors, [])
          if (action !== 'clear')
            assert.equal(await page.locator('#host').evaluate((el) => el.childNodes.length), 0)
          report.cases.push({ id, status: 'passed', noResurrection: true, noLateCallbacks: true })
        } finally {
          await page.evaluate(() => window.dispose?.())
          await page.close()
        }
      }
      {
        const page = await browser.newPage(),
          errors = [],
          urls = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('request', (request) => urls.push(request.url()))
        try {
          await page.goto(base)
          await page.waitForFunction(() => window.ready)
          await page.evaluate(() =>
            fixture.mount('core', {}, { slowFile: true, isolation: 'shadow' })
          )
          await page
            .getByText('Parsing file content...', { exact: true })
            .waitFor({ state: 'visible' })
          await page.waitForFunction(() => typeof window.releaseFile === 'function')
          await paint(page)
          assert.equal(await page.evaluate(() => fixture.state().loading), true)
          assert.ok(
            !urls.some((url) => url.includes('/must-not-fetch.txt')),
            'File has priority over URL'
          )
          await page.evaluate(() => window.releaseFile())
          await page.waitForFunction(() => fixture.state().ready && fixture.text().includes('ABC'))
          assert.equal(
            await page.evaluate(() => fixture.all('[data-file-viewer-source-state]').length),
            0
          )
          assert.deepEqual(errors, [])
          report.cases.push({
            id: engine + '-local-file-reading',
            status: 'passed',
            delayedArrayBuffer: true,
            noUrlFetch: true,
            renderedContent: 'ABC'
          })
        } finally {
          await page.evaluate(() => window.dispose?.())
          await page.close()
        }
      }
    } finally {
      await browser.close()
    }
  }
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.error = error.stack
  throw error
} finally {
  report.at = new Date().toISOString()
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
}
