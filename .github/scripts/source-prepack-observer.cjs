'use strict'

// Observe original gates without changing their requests, response bytes or assertions.
const traceDirectory = process.env.FILE_VIEWER_PREPACK_TRACE_DIR
if (traceDirectory) {
  const fs = require('node:fs')
  const path = require('node:path')
  const crypto = require('node:crypto')
  const Module = require('node:module')
  const http = require('node:http')
  const https = require('node:https')
  if (!path.isAbsolute(traceDirectory)) throw new Error('Prepack trace directory must be absolute')
  const directory = path.resolve(traceDirectory)
  fs.mkdirSync(directory, { recursive: true })
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error('Prepack trace directory must not be a symlink')
  const destination = path.join(directory, `runtime-${process.pid}.jsonl`)
  const descriptor = fs.openSync(destination,
    fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600)
  process.once('exit', () => fs.closeSync(descriptor))
  const emit = value => fs.writeSync(descriptor, JSON.stringify({
    schemaVersion: 1, gateId: process.env.FILE_VIEWER_PREPACK_GATE_ID || null,
    pid: process.pid, ...value
  }) + '\n')
  const generatedInputs = JSON.parse(process.env.FILE_VIEWER_PREPACK_GENERATED_FIXTURES || '[]')
  const sourceHarnesses = JSON.parse(process.env.FILE_VIEWER_PREPACK_SOURCE_HARNESSES || '[]')
  if (!Array.isArray(sourceHarnesses) || sourceHarnesses.some(row =>
    !row || !['app/entry.js', 'main.js', 'entry.js'].includes(row.path) || row.httpPath !== '/' + row.path ||
    !Number.isSafeInteger(row.maxBytes) || row.maxBytes <= 0 || row.maxBytes > 64 * 1024 * 1024)) {
    throw new Error('Invalid reviewed source-harness observation plan')
  }
  if (!Array.isArray(generatedInputs) || generatedInputs.some(row =>
    !row || typeof row.path !== 'string' || row.path.startsWith('/') || row.path.includes('\\') ||
    row.path.split('/').some(part => !part || part === '.' || part === '..') ||
    (row.httpPath !== undefined && (!row.httpPath.startsWith('/') || row.httpPath.includes('?'))) ||
    !Number.isSafeInteger(row.maxBytes) || row.maxBytes <= 0 || row.maxBytes > 64 * 1024 * 1024)) {
    throw new Error('Invalid explicit generated fixture observation plan')
  }
  globalThis.__fileViewerPrepackObserveNodeFixture = (fixturePath, data) => {
    if (!Buffer.isBuffer(data) && !ArrayBuffer.isView(data) && !(data instanceof ArrayBuffer)) throw new Error('Actual fixture bytes required')
    const bytes = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data.buffer, data.byteOffset, data.byteLength)
    if (typeof fixturePath !== 'string' || fixturePath.startsWith('/') || fixturePath.includes('\\') ||
        fixturePath.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid public fixture path')
    emit({ kind: 'browser-gate-fixture', fixture: { path: fixturePath, bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex') } })
    const generated = generatedInputs.find(row => row.path === fixturePath && !row.httpPath && (!row.gateId || row.gateId === process.env.FILE_VIEWER_PREPACK_GATE_ID))
    if (generated) {
      if (bytes.length > generated.maxBytes) throw new Error('Generated fixture exceeds its reviewed limit')
      emit({ kind: 'generated-fixture-witness', engine: null, witness: {
        schemaVersion: 1, kind: 'original-generated-fixture', fixturePath,
        encoding: 'base64', data: bytes.toString('base64')
      } })
    }
  }
  globalThis.__fileViewerPrepackObserveOwnerComplete = event => {
    if (!event || !['chromium', 'firefox', 'webkit'].includes(event.engine) ||
        typeof event.phase !== 'string' || !Array.isArray(event.caseIds) || !event.caseIds.length ||
        event.caseIds.some(id => typeof id !== 'string' || !id) || new Set(event.caseIds).size !== event.caseIds.length) {
      throw new Error('Invalid original public owner boundary observation')
    }
    emit({ kind: 'browser-gate-engine-complete', engine: event.engine, phase: event.phase, caseIds: event.caseIds })
  }
  const engineFromAgent = value => /(?:Chrome|Chromium)\//.test(value) ? 'chromium'
    : /Firefox\//.test(value) ? 'firefox' : /AppleWebKit\//.test(value) ? 'webkit' : null

  for (const transport of [http, https]) {
    const createServer = transport.createServer
    transport.createServer = function (...args) {
      const server = Reflect.apply(createServer, this, args)
      server.prependListener('request', (request, response) => {
        const hash = crypto.createHash('sha256')
        const requestPath = new URL(request.url, 'http://local.invalid/').pathname
        const generated = generatedInputs.find(row => row.httpPath === requestPath && (!row.gateId || row.gateId === process.env.FILE_VIEWER_PREPACK_GATE_ID))
        const sourceHarness = sourceHarnesses.find(row => row.httpPath === requestPath)
        const retainLimit = generated?.maxBytes || sourceHarness?.maxBytes || 0
        const chunks = []
        let bytes = 0
        const update = (value, encoding) => {
          if (value == null || typeof value === 'function') return
          const data = typeof value === 'string'
            ? Buffer.from(value, typeof encoding === 'string' ? encoding : 'utf8') : Buffer.from(value)
          bytes += data.length
          hash.update(data)
          if (retainLimit && bytes <= retainLimit) chunks.push(Buffer.from(data))
        }
        const write = response.write
        const end = response.end
        response.write = function (chunk, ...rest) {
          update(chunk, rest[0])
          return Reflect.apply(write, this, [chunk, ...rest])
        }
        response.end = function (chunk, ...rest) {
          update(chunk, rest[0])
          return Reflect.apply(end, this, [chunk, ...rest])
        }
        response.once('finish', () => {
          if (request.method !== 'GET' || response.statusCode !== 200) return
          const assetPath = new URL(request.url, 'http://local.invalid/').pathname
          const mime = String(response.getHeader('content-type') || '').split(';')[0]
          const runtime = /(?:javascript|wasm|text\/css|font)/.test(mime) || /\.(?:[cm]?js|wasm|css|woff2?|ttf|otf)$/.test(assetPath)
          // Non-runtime responses bind original HTTP document bytes as well.
          // No response body, query string, origin or client data is retained.
          emit({ kind: runtime ? 'served-runtime-asset' : 'served-fixture', engine: engineFromAgent(String(request.headers['user-agent'] || '')),
            path: assetPath, bytes, sha256: hash.digest('hex'), contentType: mime })
          if (sourceHarness) {
            if (!runtime || bytes > sourceHarness.maxBytes) throw new Error('Source harness exceeds its reviewed executable-byte plan')
            emit({ kind: 'source-harness-witness', engine: engineFromAgent(String(request.headers['user-agent'] || '')),
              witness: { schemaVersion: 1, kind: 'source-prepack-harness-bytes', assetPath: sourceHarness.path,
                encoding: 'base64', data: Buffer.concat(chunks).toString('base64') } })
          }
          if (generated && !runtime) {
            if (bytes > generated.maxBytes) throw new Error('Generated fixture exceeds its reviewed limit')
            const data = Buffer.concat(chunks)
            const engine = engineFromAgent(String(request.headers['user-agent'] || ''))
            emit({ kind: 'browser-fixture', engine, fixture: { path: generated.path, bytes,
              sha256: crypto.createHash('sha256').update(data).digest('hex') } })
            emit({ kind: 'generated-fixture-witness', engine, witness: {
              schemaVersion: 1, kind: 'original-generated-fixture', fixturePath: generated.path,
              encoding: 'base64', data: data.toString('base64')
            } })
          }
        })
      })
      return server
    }
  }

  // Playwright's ESM facade also uses these CommonJS BrowserType instances.
  const originalLoad = Module._load
  const patched = new WeakSet()
  const observedPages = new WeakSet()
  const observePage = async (page, engine) => {
    if (observedPages.has(page)) return page
    observedPages.add(page)
    await page.exposeBinding('__fileViewerPrepackObserveFixture', (_source, value) => {
      if (!value || typeof value.path !== 'string' || value.path.startsWith('/') ||
          value.path.includes('\\') || value.path.split('/').some(part => !part || part === '.' || part === '..') ||
          !Array.isArray(value.bytes) || value.bytes.length > 64 * 1024 * 1024 ||
          value.bytes.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
        throw new Error('Invalid actual browser fixture observation')
      }
      const bytes = Buffer.from(value.bytes)
      emit({ kind: 'browser-fixture', engine, fixture: {
        path: value.path, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')
      } })
      const generated = generatedInputs.find(row => row.path === value.path && !row.httpPath && (!row.gateId || row.gateId === process.env.FILE_VIEWER_PREPACK_GATE_ID))
      if (generated) {
        if (bytes.length > generated.maxBytes) throw new Error('Generated fixture exceeds its reviewed limit')
        emit({ kind: 'generated-fixture-witness', engine, witness: { schemaVersion: 1,
          kind: 'original-generated-fixture', fixturePath: value.path, encoding: 'base64', data: bytes.toString('base64') } })
      }
      if (value.witness) {
        // Only the fixed synthetic compact JWS and public verification key may
        // cross this channel. A private key is never an observation artifact.
        const witness = value.witness
        const jwk = witness.publicJwk
        if (witness.schemaVersion !== 1 || witness.kind !== 'issue-206-public-jws-fixture' ||
            witness.fixturePath !== value.path || typeof witness.compactJws !== 'string' ||
            !Buffer.from(witness.compactJws).equals(bytes) || !jwk || jwk.kty !== 'RSA' ||
            Object.keys(jwk).some(key => !['kty', 'n', 'e', 'alg', 'use', 'ext', 'key_ops', 'kid'].includes(key))) {
          throw new Error('Invalid public JWS witness')
        }
        emit({ kind: 'generated-fixture-witness', engine, witness })
      }
    })
    return page
  }
  const observeBrowser = (browser, engine) => {
    const newPage = browser.newPage
    browser.newPage = async function (...args) {
      return observePage(await Reflect.apply(newPage, this, args), engine)
    }
    const newContext = browser.newContext
    browser.newContext = async function (...args) {
      const context = await Reflect.apply(newContext, this, args)
      const contextNewPage = context.newPage
      context.newPage = async function (...pageArgs) {
        return observePage(await Reflect.apply(contextNewPage, this, pageArgs), engine)
      }
      return context
    }
  }
  const packageVersion = filename => {
    for (let root = path.dirname(filename); root !== path.dirname(root); root = path.dirname(root)) {
      const manifest = path.join(root, 'package.json')
      if (!fs.existsSync(manifest)) continue
      const value = JSON.parse(fs.readFileSync(manifest, 'utf8'))
      if (value.name === 'playwright' || value.name === 'playwright-core') return value.version
    }
    return null
  }
  Module._load = function (request, parent, isMain) {
    const value = Reflect.apply(originalLoad, this, [request, parent, isMain])
    if (!/(?:^|[/\\])playwright(?:-core)?(?:[/\\]|$)/.test(request)) return value
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const type = value?.[engine]
      if (!type || patched.has(type) || typeof type.launch !== 'function') continue
      patched.add(type)
      const launch = type.launch
      const resolved = Module._resolveFilename(request, parent)
      const version = packageVersion(resolved)
      type.launch = async function (...args) {
        const browser = await Reflect.apply(launch, this, args)
        emit({ kind: 'browser-launched', engine, browserVersion: browser.version(),
          playwrightVersion: version, nodeVersion: process.version, platform: process.platform, arch: process.arch })
        if (typeof browser.newPage === 'function' && typeof browser.newContext === 'function') observeBrowser(browser, engine)
        return browser
      }
    }
    return value
  }
  Module.syncBuiltinESMExports()
}
