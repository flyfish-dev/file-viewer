import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import {
  validateManifest,
  collectRunProof,
  parseOwnerReports,
  fileRecord,
  safePath,
  assertPublicEvidence,
  assertHeadSourceBytes,
  assertSyntheticPublicBytes,
  collectOriginalScreenshots
} from './source-prepack-browser.mjs'

const observer = fileURLToPath(new URL('./source-prepack-observer.cjs', import.meta.url))
const workspaceRoot = ['../../', '../../../../']
  .map((path) => fileURLToPath(new URL(path, import.meta.url)))
  .find((path) =>
    existsSync(join(path, 'packages/build-support/browser-gates/prepack-browser-manifest.json'))
  )
const run = (script, directory, trace = undefined, extra = {}) => {
  const env = { ...process.env }
  delete env.NODE_OPTIONS
  delete env.NODE_PATH
  delete env.FILE_VIEWER_PREPACK_TRACE_DIR
  delete env.FILE_VIEWER_PREPACK_GATE_ID
  delete env.FILE_VIEWER_PREPACK_GENERATED_FIXTURES
  if (trace)
    Object.assign(env, {
      FILE_VIEWER_PREPACK_TRACE_DIR: trace,
      FILE_VIEWER_PREPACK_GATE_ID: 'fixture-gate'
    })
  Object.assign(env, extra)
  return spawnSync(process.execPath, ['--require', observer, script], {
    cwd: directory,
    env,
    encoding: 'utf8',
    timeout: 20000
  })
}

test('observes exact streamed runtime bytes and real launch return values without changing execution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-observer-test-'))
  try {
    const moduleDirectory = join(directory, 'node_modules/playwright')
    await mkdir(moduleDirectory, { recursive: true })
    await writeFile(
      join(moduleDirectory, 'package.json'),
      JSON.stringify({ name: 'playwright', version: '1.64.1', main: 'index.cjs' })
    )
    await writeFile(
      join(moduleDirectory, 'index.cjs'),
      `const browser={version:()=> 'unit-fixture-version',identity:17};const chromium={async launch(options){if(this!==chromium||options.identity!==17)throw Error('launch arguments changed');return browser}};module.exports={chromium,browser};`
    )
    const script = join(directory, 'fixture.mjs')
    await writeFile(
      script,
      `import assert from 'node:assert/strict';import{createServer}from'node:http';import{createRequire}from'node:module';const require=createRequire(import.meta.url);const {chromium,browser}=require('playwright');assert.equal(await chromium.launch({identity:17}),browser);const server=createServer((req,res)=>{if(req.url==='/missing.js'){res.writeHead(404).end('not present');return;}res.writeHead(200,{'Content-Type':'text/javascript'});res.write(Buffer.from('a'));res.write('é','utf8');res.end('b');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;const response=await fetch(url+'/stream.js',{headers:{'user-agent':'HeadlessChrome/156.0'}});assert.equal(await response.text(),'aéb');assert.equal((await fetch(url+'/missing.js')).status,404);await fetch(url+'/head.js',{method:'HEAD'});await new Promise(r=>server.close(r));`
    )
    const trace = join(directory, 'trace')
    const result = run(script, directory, trace)
    assert.equal(result.status, 0, result.stderr)
    const files = await readdir(trace)
    assert.equal(files.length, 1)
    const records = (await readFile(join(trace, files[0]), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    const launch = records.find((row) => row.kind === 'browser-launched')
    assert.equal(launch.engine, 'chromium')
    assert.equal(launch.browserVersion, 'unit-fixture-version')
    assert.equal(launch.playwrightVersion, '1.64.1')
    const assets = records.filter((row) => row.kind === 'served-runtime-asset')
    assert.equal(assets.length, 1)
    assert.deepEqual(
      {
        path: assets[0].path,
        engine: assets[0].engine,
        bytes: assets[0].bytes,
        sha256: assets[0].sha256
      },
      {
        path: '/stream.js',
        engine: 'chromium',
        bytes: Buffer.byteLength('aéb'),
        sha256: createHash('sha256').update('aéb').digest('hex')
      }
    )
    assert(records.every((row) => row.gateId === 'fixture-gate'))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

const gatePath = 'packages/build-support/browser-gates/verify-issue-200-pptx-layout.mjs'
const fixture = fileRecord('test/public-document.bin', Buffer.from('actual-public-fixture'))
const tools = { node: '24.20.0', pnpm: '11.0.9', playwright: '1.64.1' }
const runPlan = {
  id: 'unit-gate',
  gateId: 'unit-gate',
  gate: gatePath,
  engines: ['chromium', 'firefox', 'webkit'],
  observation: 'completion',
  phase: 'full',
  caseIds: ['original-one', 'original-two']
}
const requiredPlan = () =>
  runPlan.engines.flatMap((engine) =>
    runPlan.caseIds.map((id) => ({
      id,
      gate: gatePath,
      engine,
      fixtures: [fixture],
      servedAssets: [{ path: 'served/' + 'f'.repeat(64) + '.js', bytes: 4, sha256: 'f'.repeat(64) }]
    }))
  )
const actualEvents = () =>
  runPlan.engines.flatMap((engine) => [
    {
      schemaVersion: 1,
      kind: 'browser-launched',
      gateId: runPlan.id,
      engine,
      nodeVersion: 'v24.20.0',
      playwrightVersion: '1.64.1',
      browserVersion: `actual-${engine}`
    },
    {
      schemaVersion: 1,
      kind: 'served-runtime-asset',
      gateId: runPlan.id,
      engine,
      path: '/original.js',
      bytes: 4,
      sha256: 'f'.repeat(64),
      contentType: 'text/javascript'
    },
    { schemaVersion: 1, kind: 'served-fixture', gateId: runPlan.id, engine, ...fixture },
    {
      schemaVersion: 1,
      kind: 'browser-gate-engine-complete',
      gateId: runPlan.id,
      engine,
      phase: 'full',
      caseIds: [...runPlan.caseIds],
      fixtures: [fixture]
    }
  ])
const collect = (overrides = {}) =>
  collectRunProof({
    run: runPlan,
    required: requiredPlan(),
    events: actualEvents(),
    exitCode: 0,
    toolVersions: tools,
    ...overrides
  })

test('requires real completion, launch, document bytes and executable bytes for every original engine', () => {
  const rows = collect()
  assert.equal(rows.length, 6)
  assert(rows.every((row) => row.status === 'passed' && row.fixtures[0].sha256 === fixture.sha256))
  assert.deepEqual(
    rows[0].tools.map((row) => row.name),
    ['node', 'pnpm', 'playwright', 'chromium']
  )
  assert(rows.every((row) => row.servedAssets[0].path === 'served/' + 'f'.repeat(64) + '.js'))
})

test('exit zero cannot stand in for an absent engine or partial/selected original matrix', () => {
  for (const mutate of [
    (events) => events.filter((row) => row.engine !== 'webkit'),
    (events) => events.filter((row) => row.kind !== 'browser-launched'),
    (events) =>
      events.map((row) =>
        row.kind === 'browser-gate-engine-complete' ? { ...row, phase: 'selected-samples' } : row
      ),
    (events) =>
      events.map((row) =>
        row.kind === 'browser-gate-engine-complete' ? { ...row, caseIds: ['original-one'] } : row
      ),
    (events) => [...events, events.find((row) => row.kind === 'browser-gate-engine-complete')]
  ])
    assert.throws(() => collect({ events: mutate(actualEvents()) }))
  assert.throws(() => collect({ exitCode: 1 }), /Original command failed/)
})

test('rejects tool substitutions and missing/tampered actual input/runtime observations', () => {
  for (const mutate of [
    (events) =>
      events.map((row) =>
        row.kind === 'browser-launched' ? { ...row, playwrightVersion: '1.61.1' } : row
      ),
    (events) =>
      events.map((row) =>
        row.kind === 'browser-launched' ? { ...row, nodeVersion: 'v26.8.2' } : row
      ),
    (events) => events.filter((row) => row.kind !== 'served-runtime-asset'),
    (events) =>
      events.map((row) => (row.kind === 'served-runtime-asset' ? { ...row, engine: null } : row)),
    (events) =>
      events.map((row) =>
        row.kind === 'served-fixture' ? { ...row, sha256: '0'.repeat(64) } : row
      )
  ])
    assert.throws(() => collect({ events: mutate(actualEvents()) }))
})

test('does not mix source DICOM events with the separately isolated packed child', () => {
  const events = actualEvents().map((row) => ({ ...row, gateId: 'another-original-owner' }))
  assert.throws(() => collect({ events }), /completion/)
})

test('fresh generated witness must contain exactly the actual original load bytes', () => {
  const bytes = Buffer.from('%PDF-1.7\npublic-generated-document\n%%EOF')
  const path = 'generated/public.pdf'
  const generated = {
    validator: 'original-generated-fixture-v1',
    path,
    witnessPath: 'witnesses/public.json',
    constraints: { maxBytes: 1000 }
  }
  const required = requiredPlan().map((row) => ({
    ...row,
    fixtures: [],
    generatedFixtures: [generated]
  }))
  const events = actualEvents().filter((row) => row.kind !== 'served-fixture')
  for (const engine of runPlan.engines)
    events.push(
      { kind: 'browser-fixture', gateId: runPlan.id, engine, fixture: fileRecord(path, bytes) },
      {
        kind: 'generated-fixture-witness',
        gateId: runPlan.id,
        engine,
        witness: {
          schemaVersion: 1,
          kind: 'original-generated-fixture',
          fixturePath: path,
          encoding: 'base64',
          data: bytes.toString('base64')
        }
      }
    )
  assert.equal(collect({ required, events }).length, 6)
  assert.throws(
    () => collect({ required, events: events.filter((row) => row.kind !== 'browser-fixture') }),
    /differs/
  )
  assert.throws(
    () =>
      collect({
        required,
        events: events.map((row) =>
          row.witness
            ? {
                ...row,
                witness: {
                  ...row.witness,
                  data: Buffer.from('another document').toString('base64')
                }
              }
            : row
        )
      }),
    /differs/
  )
  const privateBytes = Buffer.from('%PDF-1.7\n/Users/person/private-document\n%%EOF')
  assert.throws(
    () =>
      collect({
        required,
        events: events.map((row) =>
          row.witness
            ? { ...row, witness: { ...row.witness, data: privateBytes.toString('base64') } }
            : row.kind === 'browser-fixture'
              ? { ...row, fixture: fileRecord(path, privateBytes) }
              : row
        )
      }),
    /absolute\/private path/
  )
})

test('fresh reviewed wrapper bytes match actual HTTP without weakening independent product hashes', () => {
  const bytes = Buffer.from('console.log("original synthetic wrapper")')
  const path = 'main.js'
  const required = requiredPlan().map((row) => ({
    ...row,
    servedAssets: [],
    sourceHarnesses: [{ path, witnessPath: 'evidence/main.json' }]
  }))
  const events = actualEvents()
  for (const engine of runPlan.engines)
    events.push(
      {
        kind: 'served-runtime-asset',
        gateId: runPlan.id,
        engine,
        path: '/main.js',
        ...fileRecord('main.js', bytes),
        contentType: 'text/javascript'
      },
      {
        kind: 'source-harness-witness',
        gateId: runPlan.id,
        engine,
        witness: {
          schemaVersion: 1,
          kind: 'source-prepack-harness-bytes',
          assetPath: path,
          encoding: 'base64',
          data: bytes.toString('base64')
        }
      }
    )
  // Preserve the original HTTP route; fileRecord supplies a logical path.
  for (const event of events) if (event.path === 'main.js') event.path = '/main.js'
  assert.equal(collect({ required, events }).length, 6)
  assert.throws(
    () =>
      collect({
        required,
        events: events.map((row) =>
          row.kind === 'source-harness-witness'
            ? {
                ...row,
                witness: { ...row.witness, data: Buffer.from('changed wrapper').toString('base64') }
              }
            : row
        )
      }),
    /differs/
  )
  const privateWrapper = Buffer.from('console.log("/home/person/private-document")')
  assert.throws(
    () =>
      collect({
        required,
        events: events.map((row) =>
          row.kind === 'source-harness-witness'
            ? { ...row, witness: { ...row.witness, data: privateWrapper.toString('base64') } }
            : row.path === '/main.js'
              ? {
                  ...row,
                  bytes: privateWrapper.length,
                  sha256: fileRecord(path, privateWrapper).sha256
                }
              : row
        )
      }),
    /absolute\/private path/
  )
  const wrongProduct = requiredPlan().map((row) => ({
    ...row,
    servedAssets: [{ ...row.servedAssets[0], sha256: '0'.repeat(64) }]
  }))
  assert.throws(() => collect({ required: wrongProduct }), /Independent required product bytes/)
})

test('original report parsers retain failed rows and their exact nested case identities', () => {
  const parsed = parseOwnerReports('pdf-lifecycle', [
    {
      document: {
        reports: [
          { engine: 'chromium', mode: 'real', passed: true },
          { engine: 'webkit', mode: 'fake', passed: false }
        ]
      }
    }
  ])
  assert.deepEqual(parsed, [
    { engine: 'chromium', id: 'real', passed: true },
    { engine: 'webkit', id: 'fake', passed: false }
  ])
  assert.throws(() =>
    parseOwnerReports('source-feedback', [{ document: { status: 'failed', cases: [] } }])
  )
  assert.throws(() => parseOwnerReports('unknown', [{ document: {} }]), /Unknown/)
})

test('does not relabel an incomplete owner report as a whole original owner pass', () => {
  const run = { ...runPlan, observation: 'report' }
  const reportCases = requiredPlan().map(({ id, engine }) => ({ id, engine, passed: true }))
  assert.equal(collect({ run, reportCases }).length, 6)
  assert.throws(() => collect({ run, reportCases: reportCases.slice(1) }), /incomplete/)
  assert.throws(
    () =>
      collect({
        run,
        reportCases: reportCases.map((row, index) => ({ ...row, passed: index !== 0 }))
      }),
    /failed/
  )
})

test('public proof paths and text reject links out of scope, private paths and credentials', () => {
  for (const path of [
    '/absolute',
    '../escape',
    'x/../escape',
    'x\\bad',
    'node_modules/x.js',
    '.release/receipt.json',
    '.git/config',
    'https://invalid.example/file'
  ])
    assert.throws(() => safePath(path))
  assert.throws(() => assertPublicEvidence({ path: '/Users/person/private-input' }))
  assert.throws(() => assertPublicEvidence({ token: 'github_pat_' + 'a'.repeat(40) }))
  assert.doesNotThrow(() =>
    assertPublicEvidence({ path: 'cases/actual.json', mode: 'prepack-only' })
  )
})

test('the independent static manifest retains the whole original default matrix and TIFF variant', async () => {
  const root = workspaceRoot
  const manifestBytes = await readFile(
    join(root, 'packages/build-support/browser-gates/prepack-browser-manifest.json')
  )
  assert(
    manifestBytes.length < 1000000,
    'Keep the independently reread manifest below the GitHub contents API base64 limit'
  )
  const manifest = JSON.parse(manifestBytes)
  validateManifest(manifest)
  assert.equal(manifest.runs.length, 22)
  assert.equal(manifest.requiredCases.length, 1383)
  assert.equal(manifest.requiredCases.filter((row) => row.runId === 'issue-208-tiff').length, 3)
  assert.equal(
    manifest.requiredCases.filter((row) => row.runId === 'signature-panel-suite').length,
    324
  )
  const demo = manifest.runs.find((row) => row.id === 'demo-browser-smoke')
  assert(
    !demo.caseIds.some((id) =>
      /pdf-cjk-font-fallback|pdf-identity-font-repair|markdown-mermaid-state/.test(id)
    )
  )
  assert.equal(manifest.optionalOriginalBranches[0].samples.length, 3)
  const bad = structuredClone(manifest)
  bad.requiredCases.pop()
  assert.throws(() => validateManifest(bad), /omitted/)
  const fixtureless = structuredClone(manifest)
  fixtureless.requiredCases[0].fixtureless = true
  assert.throws(() => validateManifest(fixtureless), /not fixtureless/)
  const productAsHarness = structuredClone(manifest)
  const row = productAsHarness.requiredCases.find((row) => row.sourceHarnesses?.length)
  row.sourceHarnesses[0].path = 'dist/file-viewer.js'
  assert.throws(() => validateManifest(productAsHarness), /three reviewed/)
  const ambiguousWitness = structuredClone(manifest)
  const witnesses = ambiguousWitness.requiredCases.filter((row) => row.generatedFixtures?.length)
  const first = witnesses[0]
  const other = witnesses.find((row) => row.runId !== first.runId)
  other.generatedFixtures[0].witnessPath = first.generatedFixtures[0].witnessPath
  assert.throws(() => validateManifest(ambiguousWitness), /ambiguous witness/)
})

test('DICOM actual child retains its clean-environment guards before explicit observation', async () => {
  const root = workspaceRoot
  const source = await readFile(
    join(root, 'packages/renderers/dicom/scripts/verify-packed-browser.mjs'),
    'utf8'
  )
  const guards = source.indexOf('assert.equal(process.env.NODE_PATH, undefined)')
  const observer = source.indexOf(
    "const hostedObserver = resolve(root, '.github/scripts/source-prepack-observer.cjs')"
  )
  assert(
    guards >= 0 &&
      source.indexOf('assert.equal(process.env.NODE_OPTIONS, undefined)', guards) < observer
  )
  assert(guards < observer)
  assert(source.includes('env: cleanEnvironment(process.env)'))
})

test('only the explicit reviewed generated input retains public witness bytes; real HTTP and Node input bytes agree', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-generated-observer-'))
  try {
    const script = join(directory, 'fixture.cjs')
    await writeFile(
      script,
      `const assert=require('node:assert/strict');const{createServer}=require('node:http');globalThis.__fileViewerPrepackObserveNodeFixture('generated/node.pdf',Buffer.from('%PDF-public-node'));const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/pdf'});res.write('%PDF-');res.end('public-http')});server.listen(0,'127.0.0.1',async()=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/public.pdf',{headers:{'user-agent':'Firefox/150.0'}});assert.equal(await response.text(),'%PDF-public-http');await fetch('http://127.0.0.1:'+server.address().port+'/not-retained.pdf',{headers:{'user-agent':'Firefox/150.0'}});server.close()});`
    )
    const trace = join(directory, 'trace')
    const result = run(script, directory, trace, {
      FILE_VIEWER_PREPACK_GENERATED_FIXTURES: JSON.stringify([
        { path: 'generated/node.pdf', maxBytes: 1000 },
        { path: 'generated/http.pdf', httpPath: '/public.pdf', maxBytes: 1000 }
      ])
    })
    assert.equal(result.status, 0, result.stderr)
    const records = (await readFile(join(trace, (await readdir(trace))[0]), 'utf8'))
      .trim()
      .split('\n')
      .map(JSON.parse)
    const witnesses = records.filter((row) => row.kind === 'generated-fixture-witness')
    assert.equal(witnesses.length, 2)
    assert.deepEqual(
      witnesses.map((row) => [
        row.witness.fixturePath,
        Buffer.from(row.witness.data, 'base64').toString()
      ]),
      [
        ['generated/node.pdf', '%PDF-public-node'],
        ['generated/http.pdf', '%PDF-public-http']
      ]
    )
    assert.equal(records.filter((row) => row.kind === 'served-fixture').length, 2)
    assert(!witnesses.some((row) => row.witness.fixturePath.includes('not-retained')))
    assert(witnesses.every((row) => !Object.hasOwn(row.witness, 'generatorSha256')))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('the finite source-wrapper observer retains the exact real HTTP bytes and no product-role alias', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-harness-observer-'))
  try {
    const script = join(directory, 'fixture.cjs')
    await writeFile(
      script,
      `const assert=require('node:assert/strict');const{createServer}=require('node:http');const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/javascript'});res.write('/* original */');res.end('console.log("public");')});server.listen(0,'127.0.0.1',async()=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/entry.js',{headers:{'user-agent':'HeadlessChrome/158.0'}});assert.equal(await response.text(),'/* original */console.log("public");');server.close()});`
    )
    const trace = join(directory, 'trace')
    const result = run(script, directory, trace, {
      FILE_VIEWER_PREPACK_SOURCE_HARNESSES: JSON.stringify([
        { path: 'entry.js', httpPath: '/entry.js', maxBytes: 1000 }
      ])
    })
    assert.equal(result.status, 0, result.stderr)
    const records = (await readFile(join(trace, (await readdir(trace))[0]), 'utf8'))
      .trim()
      .split('\n')
      .map(JSON.parse)
    const observed = records.find((row) => row.kind === 'served-runtime-asset')
    const witness = records.find((row) => row.kind === 'source-harness-witness')
    const bytes = Buffer.from(witness.witness.data, 'base64')
    assert.equal(observed.bytes, bytes.length)
    assert.equal(observed.sha256, createHash('sha256').update(bytes).digest('hex'))
    assert.equal(witness.witness.assetPath, 'entry.js')
    assert(!Object.hasOwn(witness.witness, 'normalizedData'))
    const blocked = run(script, directory, join(directory, 'blocked'), {
      FILE_VIEWER_PREPACK_SOURCE_HARNESSES: JSON.stringify([
        { path: 'dist/product.js', httpPath: '/dist/product.js', maxBytes: 1000 }
      ])
    })
    assert.notEqual(blocked.status, 0)
    assert.match(blocked.stderr, /reviewed source-harness/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('explicit browser fixture binding preserves page/context calls and rejects private JWK members before retention', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-browser-fixture-binding-'))
  try {
    const moduleDirectory = join(directory, 'node_modules/playwright')
    await mkdir(moduleDirectory, { recursive: true })
    await writeFile(
      join(moduleDirectory, 'package.json'),
      JSON.stringify({ name: 'playwright', version: '1.64.1', main: 'index.cjs' })
    )
    await writeFile(
      join(moduleDirectory, 'index.cjs'),
      `const page=()=>({async exposeBinding(name,fn){this.binding=fn}});const context={async newPage(options){if(this!==context||options.identity!==19)throw Error('context call changed');return page()}};const browser={version:()=> 'control-browser',async newPage(options){if(this!==browser||options.identity!==17)throw Error('page call changed');return page()},async newContext(options){if(this!==browser||options.identity!==18)throw Error('newContext call changed');return context}};const chromium={async launch(){if(this!==chromium)throw Error('launch this changed');return browser}};module.exports={chromium,browser};`
    )
    const script = join(directory, 'fixture.cjs')
    await writeFile(
      script,
      `const assert=require('node:assert/strict');const{chromium,browser}=require('playwright');(async()=>{assert.equal(await chromium.launch(),browser);const page=await browser.newPage({identity:17});const context=await browser.newContext({identity:18});assert.equal(typeof(await context.newPage({identity:19})).binding,'function');const path='generated/control.jws',compactJws='control.public.synthetic';const value={path,bytes:[...Buffer.from(compactJws)],witness:{schemaVersion:1,kind:'issue-206-public-jws-fixture',fixturePath:path,compactJws,publicJwk:{kty:'RSA',n:'control-public-modulus',e:'AQAB'}}};await page.binding({},value);await assert.rejects(async()=>page.binding({},{...value,witness:{...value.witness,publicJwk:{...value.witness.publicJwk,d:'PRIVATE-MEMBER-MUST-NOT-BE-RETAINED'}}}),/Invalid public JWS witness/);})();`
    )
    const trace = join(directory, 'trace')
    const result = run(script, directory, trace)
    assert.equal(result.status, 0, result.stderr)
    const raw = await readFile(join(trace, (await readdir(trace))[0]), 'utf8')
    assert(!raw.includes('PRIVATE-MEMBER-MUST-NOT-BE-RETAINED'))
    const records = raw.trim().split('\n').map(JSON.parse)
    assert.equal(records.filter((row) => row.kind === 'generated-fixture-witness').length, 1)
    assert.equal(
      records.find((row) => row.kind === 'browser-fixture').fixture.sha256,
      createHash('sha256').update('control.public.synthetic').digest('hex')
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('pre-upload privacy checks reject actual PEM/plain and encrypted DER/JWK/PFX private keys while retaining public fixtures', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const fixtures = [
    Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })),
    privateKey.export({ type: 'pkcs8', format: 'der' }),
    privateKey.export({
      type: 'pkcs8',
      format: 'der',
      cipher: 'aes-256-cbc',
      passphrase: 'temporary-control-only'
    }),
    Buffer.from(JSON.stringify(privateKey.export({ format: 'jwk' }))),
    Buffer.from('3010020103300b06092a864886f70d010701', 'hex'),
    Buffer.from([0xc5, 0x01, 0x00])
  ]
  fixtures.push(Buffer.concat([fixtures[2], Buffer.from('trailing junk')]))
  for (const bytes of fixtures)
    assert.throws(() => assertSyntheticPublicBytes(bytes), /[Pp]rivate|[Ss]ecret|PFX/)
  for (const bytes of [
    Buffer.from('%PDF-1.7\npublic synthetic\n%%EOF'),
    publicKey.export({ type: 'spki', format: 'der' }),
    Buffer.from(JSON.stringify(publicKey.export({ format: 'jwk' })))
  ]) {
    assert.equal(assertSyntheticPublicBytes(bytes), bytes)
  }
})

test('retains only original engine-labelled output screenshots and rejects linked/private-root inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-normal-screenshots-'))
  try {
    const output = join(directory, 'output/original')
    await mkdir(output, { recursive: true })
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )
    for (const file of [
      'chromium-normal.png',
      'webkit-normal.png',
      'chromium-failure.png',
      'unlabelled.png'
    ])
      await writeFile(join(output, file), png)
    const plan = {
      id: 'original-owner',
      engines: ['chromium', 'webkit'],
      evidenceDirectories: ['output/original']
    }
    const images = await collectOriginalScreenshots(directory, plan)
    assert.deepEqual(images.map((row) => row.engine).sort(), ['chromium', 'webkit'])
    assert(
      images.every(
        (row) => row.bytes.equals(png) && row.path.startsWith('screenshots/original-owner/')
      )
    )
    await assert.rejects(
      collectOriginalScreenshots(directory, {
        ...plan,
        evidenceDirectories: ['test/private-fixtures']
      }),
      /task-owned output/
    )
    await symlink(join(output, 'chromium-normal.png'), join(output, 'webkit-linked.png'))
    await assert.rejects(collectOriginalScreenshots(directory, plan), /links/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejects relative opt-in directories and malformed/oversized generated witness plans', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-reject-plan-'))
  try {
    const script = join(directory, 'fixture.cjs')
    await writeFile(script, 'process.stdout.write("original");')
    assert.notEqual(run(script, directory, 'relative-trace').status, 0)
    for (const plan of [
      [{ path: '../private', maxBytes: 100 }],
      [{ path: 'public.pdf', maxBytes: 67108865 }],
      [{ path: 'public.pdf', httpPath: '/public.pdf?token=forbidden', maxBytes: 100 }]
    ])
      assert.notEqual(
        run(script, directory, join(directory, 'trace-' + plan[0].maxBytes), {
          FILE_VIEWER_PREPACK_GENERATED_FIXTURES: JSON.stringify(plan)
        }).status,
        0
      )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('actual tracked source bytes/mode bind HEAD, including dirty files hidden by Git index flags', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-head-inputs-'))
  try {
    const git = (args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim()
    git(['init', '-q'])
    await writeFile(join(directory, 'public-input.txt'), 'original public source\n')
    git(['add', 'public-input.txt'])
    git([
      '-c',
      'user.name=Control fixture',
      '-c',
      'user.email=control@example.invalid',
      'commit',
      '-qm',
      'Temporary source binding control'
    ])
    const head = git(['rev-parse', 'HEAD'])
    assert.equal(await assertHeadSourceBytes(directory, head), 1)
    for (const flag of ['--assume-unchanged', '--skip-worktree']) {
      git(['update-index', flag, 'public-input.txt'])
      await writeFile(join(directory, 'public-input.txt'), 'hidden changed bytes\n')
      await assert.rejects(assertHeadSourceBytes(directory, head), /differ/)
      await writeFile(join(directory, 'public-input.txt'), 'original public source\n')
      git(['update-index', flag.replace('--', '--no-'), 'public-input.txt'])
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('remains inactive without explicit trace opt-in and rejects a linked trace directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-observer-optin-'))
  try {
    const script = join(directory, 'fixture.cjs')
    await writeFile(script, 'process.stdout.write("original-program");')
    const result = run(script, directory)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, 'original-program')
    assert.deepEqual(await readdir(directory), ['fixture.cjs'])
    const destination = join(directory, 'destination')
    const trace = join(directory, 'trace')
    await mkdir(destination)
    await symlink(destination, trace, 'dir')
    const blocked = run(script, directory, trace)
    assert.notEqual(blocked.status, 0)
    assert.match(blocked.stderr, /must not be a symlink/)
    assert.deepEqual(await readdir(destination), [])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
