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

test('streamed source documents retain both HTTP fixture and runtime roles', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-document-roles-'))
  try {
    const documentPath = 'apps/viewer-demo/public/example/code.cjs'
    const bytes = await readFile(join(workspaceRoot, documentPath))
    const document = fileRecord(documentPath, bytes)
    const script = join(directory, 'http-document.cjs')
    await writeFile(
      script,
      `
      const assert = require('node:assert/strict');
      const { createServer } = require('node:http');
      const document = Buffer.from(${JSON.stringify(bytes.toString('base64'))}, 'base64');
      const server = createServer((request, response) => {
        if (request.url === '/missing.cjs') { response.writeHead(404).end('missing'); return; }
        if (request.url === '/not-ok.cjs') { response.writeHead(201).end('not a fixture'); return; }
        if (request.url === '/plain.txt') { response.writeHead(200, { 'content-type': 'text/plain' }).end('public plain document'); return; }
        response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
        response.write(document.subarray(0, 17));
        response.end(document.subarray(17));
      });
      server.listen(0, '127.0.0.1', async () => {
        const origin = 'http://127.0.0.1:' + server.address().port;
        const headers = { 'user-agent': 'HeadlessChrome/158.0' };
        assert.deepEqual(Buffer.from(await (await fetch(origin + '/example/code.cjs', { headers })).arrayBuffer()), document);
        assert.equal(await (await fetch(origin + '/plain.txt', { headers })).text(), 'public plain document');
        assert.equal((await fetch(origin + '/missing.cjs', { headers })).status, 404);
        assert.equal((await fetch(origin + '/not-ok.cjs', { headers })).status, 201);
        assert.equal((await fetch(origin + '/head.cjs', { method: 'HEAD', headers })).status, 200);
        server.close();
      });
    `
    )
    const trace = join(directory, 'trace')
    const child = run(script, directory, trace)
    assert.equal(child.status, 0, child.stderr)
    const records = (await readFile(join(trace, (await readdir(trace))[0]), 'utf8'))
      .trim()
      .split('\n')
      .map(JSON.parse)
    const localRun = {
      ...runPlan,
      id: 'fixture-gate',
      gateId: 'fixture-gate',
      engines: ['chromium'],
      caseIds: ['source-document']
    }
    const runtime = {
      path: `served/${document.sha256}.cjs`,
      bytes: document.bytes,
      sha256: document.sha256
    }
    const required = [
      {
        id: 'source-document',
        gate: gatePath,
        engine: 'chromium',
        fixtures: [document],
        servedAssets: [runtime]
      }
    ]
    const controls = actualEvents()
      .filter(
        (row) =>
          row.engine === 'chromium' &&
          ['browser-launched', 'browser-gate-engine-complete'].includes(row.kind)
      )
      .map((row) => ({
        ...row,
        gateId: localRun.id,
        ...(row.kind === 'browser-gate-engine-complete' ? { caseIds: [...localRun.caseIds] } : {})
      }))
    const read = (events) => collect({ run: localRun, required, events: [...controls, ...events] })
    const proof = read(records)
    assert.deepEqual(proof[0].fixtures, [document])
    assert.deepEqual(proof[0].servedAssets, [runtime])
    const roles = records.filter((row) => row.path === '/example/code.cjs')
    assert.deepEqual(
      roles.map((row) => row.kind),
      ['served-runtime-asset', 'served-fixture']
    )
    const [{ kind: firstKind, ...first }, { kind: secondKind, ...second }] = roles
    assert.deepEqual(first, second)
    assert.equal(first.engine, 'chromium')
    assert.equal(first.bytes, bytes.length)
    assert.equal(first.sha256, document.sha256)
    assert.equal(records.filter((row) => row.path === '/plain.txt').length, 1)
    assert.equal(records.find((row) => row.path === '/plain.txt').kind, 'served-fixture')
    assert(!records.some((row) => ['/missing.cjs', '/not-ok.cjs', '/head.cjs'].includes(row.path)))
    assert.throws(
      () => read(records.filter((row) => row.kind !== 'served-fixture')),
      /Original fixture not actually observed/
    )
    for (const changed of [
      { sha256: '0'.repeat(64) },
      { bytes: document.bytes + 1 },
      { engine: 'firefox' }
    ]) {
      assert.throws(
        () =>
          read(
            records.map((row) =>
              row.path === '/example/code.cjs' && row.kind === 'served-fixture'
                ? { ...row, ...changed }
                : row
            )
          ),
        /Original fixture not actually observed/
      )
    }
    assert.throws(
      () => read(records.filter((row) => row.kind !== 'served-runtime-asset')),
      /No actual executable HTTP bytes/
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
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

test('real Node fixture events use the effective gate owner for reports and completions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prepack-node-owner-'))
  try {
    const documentPath = 'packages/renderers/drawing/test/fixtures/simple-process.bpmn'
    const document = fileRecord(documentPath, await readFile(join(workspaceRoot, documentPath)))
    assert.equal(document.bytes, 3375)
    assert.equal(
      document.sha256,
      '1c6246bf4b4d89eb19bfd5a9c7bb6b75bd78738d01bc7a21fc1f429f4d1bb058'
    )
    const script = join(directory, 'node-input.cjs')
    const executable = 'export const observedNodeInput = true;\n'
    await writeFile(
      script,
      `
      const { readFile } = require('node:fs/promises');
      const { createServer } = require('node:http');
      (async () => {
        const bytes = await readFile(${JSON.stringify(join(workspaceRoot, documentPath))});
        globalThis.__fileViewerPrepackObserveNodeFixture(${JSON.stringify(documentPath)}, bytes);
        const server = createServer((request, response) => response.writeHead(200, { 'content-type': 'text/javascript' }).end(${JSON.stringify(executable)}));
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/entry.js', { headers: { 'user-agent': 'HeadlessChrome/156.0' } });
        await response.arrayBuffer();
        await new Promise(resolve => server.close(resolve));
        globalThis.__fileViewerPrepackObserveOwnerComplete({ engine: 'chromium', phase: 'full', caseIds: ['node-fixture-case'] });
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `
    )
    for (const alias of [undefined, 'explicit-shared-owner']) {
      const owner = alias || 'bpmn-297'
      const trace = join(directory, alias || 'default-owner')
      const child = run(script, directory, trace, { FILE_VIEWER_PREPACK_GATE_ID: owner })
      assert.equal(child.status, 0, child.stderr)
      const events = (
        await Promise.all(
          (await readdir(trace)).map(async (name) =>
            (await readFile(join(trace, name), 'utf8')).trim().split('\n').map(JSON.parse)
          )
        )
      ).flat()
      const observed = events.filter((event) => event.kind === 'browser-gate-fixture')
      assert.equal(observed.length, 1)
      assert.deepEqual(observed[0].fixture, document)
      assert.equal(observed[0].gateId, owner)
      assert.equal(events.filter((event) => event.kind === 'served-runtime-asset').length, 1)
      // Browser identity is unit metadata; this test starts only the real Node/HTTP observer.
      events.push({ ...actualEvents()[0], gateId: owner })
      const plan = {
        id: 'bpmn-297',
        gate: 'packages/renderers/drawing/test/issue-297-bpmn.browser.mjs',
        engines: ['chromium'],
        observation: 'report',
        phase: 'full',
        ...(alias ? { gateId: alias } : {})
      }
      const asset = fileRecord('served/entry.js', Buffer.from(executable))
      const required = [
        {
          id: 'node-fixture-case',
          gate: plan.gate,
          engine: 'chromium',
          fixtures: [document],
          servedAssets: [asset]
        }
      ]
      const reports = [{ id: 'node-fixture-case', engine: 'chromium', passed: true }]
      const proof = (overrides = {}) =>
        collectRunProof({
          run: plan,
          required,
          events,
          reportCases: reports,
          exitCode: 0,
          toolVersions: tools,
          ...overrides
        })
      assert.equal(proof().length, 1)
      assert.equal(proof({ run: { ...plan, observation: 'completion' } }).length, 1)
      for (const change of [
        (event) => (event.kind === 'browser-gate-fixture' ? null : event),
        (event) =>
          event.kind === 'browser-gate-fixture' ? { ...event, gateId: 'foreign-owner' } : event,
        (event) =>
          event.kind === 'browser-gate-fixture'
            ? { ...event, fixture: { ...event.fixture, bytes: document.bytes + 1 } }
            : event,
        (event) =>
          event.kind === 'browser-gate-fixture'
            ? { ...event, fixture: { ...event.fixture, sha256: '0'.repeat(64) } }
            : event,
        (event) => (event.kind === 'browser-launched' ? { ...event, engine: 'webkit' } : event),
        (event) => (event.kind === 'served-runtime-asset' ? null : event),
        (event) => (event.kind === 'served-runtime-asset' ? { ...event, engine: 'webkit' } : event),
        (event) =>
          event.kind === 'served-runtime-asset' ? { ...event, sha256: '0'.repeat(64) } : event
      ])
        assert.throws(() => proof({ events: events.map(change).filter(Boolean) }))
      assert.throws(() => proof({ reportCases: [] }), /report matrix incomplete/)
      assert.throws(() => proof({ reportCases: [{ ...reports[0], passed: false }] }), /failed case/)
      assert.throws(
        () => proof({ reportCases: [{ ...reports[0], engine: 'webkit' }] }),
        /report matrix incomplete/
      )
      for (const change of [
        { gateId: 'foreign-owner' },
        { engine: 'webkit' },
        { phase: 'other' },
        { caseIds: [] }
      ])
        assert.throws(() =>
          proof({
            run: { ...plan, observation: 'completion' },
            events: events.map((event) =>
              event.kind === 'browser-gate-engine-complete' ? { ...event, ...change } : event
            )
          })
        )
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('DICOM source, built Viewer and packed owners retain distinct exact Worker-byte plans', async () => {
  const plan = JSON.parse(
    await readFile(
      join(workspaceRoot, 'packages/build-support/browser-gates/prepack-browser-manifest.json')
    )
  )
  const source = {
    path: 'served/bf7a793dd6446d4c0f287a92ca5abd20fb35d7d259072f845bf886b3723144c9.js',
    bytes: 3155061,
    sha256: 'bf7a793dd6446d4c0f287a92ca5abd20fb35d7d259072f845bf886b3723144c9'
  }
  const packed = {
    path: 'served/470125679ee57a0c16db4da78e895addae9c861bc68d10401d290d7bbf28456c.js',
    bytes: 8018848,
    sha256: '470125679ee57a0c16db4da78e895addae9c861bc68d10401d290d7bbf28456c'
  }
  const viewer = {
    path: 'served/f31e5943a8930ce2ac0331dc45aa6f6107c39c4e5927d3e530fcb1d37fa95786.js',
    bytes: 3150913,
    sha256: 'f31e5943a8930ce2ac0331dc45aa6f6107c39c4e5927d3e530fcb1d37fa95786'
  }
  for (const [runId, count, asset] of [
    ['dicom-renderer', 27, source],
    ['unified-specialist-demo', 13, viewer],
    ['dicom-packed-browser', 16, packed]
  ]) {
    const required = plan.requiredCases.filter((row) => row.runId === runId)
    assert.equal(required.length, count)
    assert(required.every((row) => JSON.stringify(row.servedAssets) === JSON.stringify([asset])))
  }
  const required = requiredPlan().map((row) => ({ ...row, servedAssets: [source] }))
  const events = actualEvents().map((row) =>
    row.kind === 'served-runtime-asset'
      ? { ...row, bytes: source.bytes, sha256: source.sha256 }
      : row
  )
  assert.equal(collect({ required, events }).length, 6)
  assert.throws(
    () =>
      collect({ required: required.map((row) => ({ ...row, servedAssets: [packed] })), events }),
    /Independent required product bytes/
  )
  const viewerRequired = requiredPlan().map((row) => ({ ...row, servedAssets: [viewer] }))
  const viewerEvents = actualEvents().map((row) =>
    row.kind === 'served-runtime-asset'
      ? { ...row, bytes: viewer.bytes, sha256: viewer.sha256 }
      : row
  )
  assert.equal(collect({ required: viewerRequired, events: viewerEvents }).length, 6)
  for (const incorrectScopeAsset of [source, packed]) {
    assert.throws(
      () =>
        collect({
          required: viewerRequired.map((row) => ({ ...row, servedAssets: [incorrectScopeAsset] })),
          events: viewerEvents
        }),
      /Independent required product bytes/
    )
  }
})

test('all original generated-fixture and source-harness producers retain current exact source pins', async () => {
  const plan = JSON.parse(
    await readFile(
      join(workspaceRoot, 'packages/build-support/browser-gates/prepack-browser-manifest.json')
    )
  )
  const pins = new Map()
  for (const row of plan.requiredCases)
    for (const record of [
      ...(row.generatedFixtures || []).map((fixture) => fixture.generator),
      ...(row.sourceHarnesses || []).map((harness) => harness.producer)
    ]) {
      if (pins.has(record.path)) assert.deepEqual(record, pins.get(record.path))
      pins.set(record.path, record)
    }
  for (const record of pins.values()) {
    let bytes = await readFile(join(workspaceRoot, record.path))
    if (record.path === 'packages/renderers/dicom/scripts/verify-packed-browser.mjs') {
      // The normal public projector relocates this one existing helper import.
      // Public checkouts already contain the projected spelling.
      bytes = Buffer.from(
        bytes
          .toString('utf8')
          .replace(
            "from '../../../../scripts/lib/pinned-pnpm.mjs'",
            "from '../../../../.github/scripts/lib/pinned-pnpm.mjs'"
          )
      )
    }
    assert.equal(bytes.length, record.bytes, record.path)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, record.path)
  }
})

test('missing product diagnostics name only bounded public gate, engine and observed byte identities', () => {
  const required = requiredPlan().map((row) => ({
    ...row,
    servedAssets: [{ ...row.servedAssets[0], sha256: '0'.repeat(64) }]
  }))
  assert.throws(
    () => collect({ required }),
    (error) => {
      assert.match(error.message, /Independent required product bytes/)
      assert(error.message.includes(JSON.stringify({ gate: runPlan.gate }).slice(0, -1)))
      assert(error.message.includes('"engine":"chromium"'))
      assert(error.message.includes('"observedAssetCount":1'))
      assert(!/\/Users\/|\/home\/|file:\/\/|original response body/.test(error.message))
      return true
    }
  )
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

const generatedPrivacyPlan = (bytes) => {
  const path = 'generated/unit-public-witness.bin'
  const required = requiredPlan().map((row) => ({
    ...row,
    fixtures: [],
    generatedFixtures: [
      {
        validator: 'original-generated-fixture-v1',
        path,
        witnessPath: 'witnesses/public.json'
      }
    ]
  }))
  const events = actualEvents()
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
  return { required, events }
}

test('generated fixture privacy failures log only safe identities and decoded-string offsets', () => {
  const positiveMessages = [],
    positiveConsole = console.error
  try {
    console.error = (value) => positiveMessages.push(value)
    assert.equal(collect(generatedPrivacyPlan(Buffer.from('public generated document'))).length, 6)
  } finally {
    console.error = positiveConsole
  }
  assert.deepEqual(positiveMessages, [])
  const cases = [
    {
      text: '😀 public C:\\unit-only\\fixture',
      guard: 'public-evidence-text',
      matches: [{ category: 'windows-drive-path', utf16Offset: '😀 public '.length }]
    },
    {
      text: 'public github_pat_' + 'a'.repeat(40),
      guard: 'public-evidence-text',
      matches: [{ category: 'github-pat-shape', utf16Offset: 'public '.length }]
    },
    {
      text: '-----BEGIN PRIVATE KEY-----\nunit-only\n-----END PRIVATE KEY-----',
      guard: 'synthetic-public-bytes',
      matches: []
    }
  ]
  for (const { text, guard, matches } of cases) {
    const bytes = Buffer.from(text),
      messages = []
    const originalConsole = console.error
    let error
    try {
      console.error = (value) => messages.push(value)
      try {
        collect(generatedPrivacyPlan(bytes))
      } catch (caught) {
        error = caught
      }
    } finally {
      console.error = originalConsole
    }
    assert.equal(error?.code, 'ERR_ASSERTION')
    assert.equal(messages.length, 1)
    const prefix = '[generated-fixture-privacy] '
    assert.equal(messages[0].slice(0, prefix.length), prefix)
    assert.deepEqual(JSON.parse(messages[0].slice(prefix.length)), {
      run: runPlan.id,
      gate: runPlan.gate,
      engine: 'chromium',
      fixturePath: 'generated/unit-public-witness.bin',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      guard,
      matches
    })
  }
})

test('generated fixture diagnostic errors cannot replace the original privacy failure', () => {
  const originalError = new Error('Original privacy guard error')
  const originalOk = assert.ok,
    originalConsole = console.error
  try {
    assert.ok = (value, message) => {
      if (
        !value &&
        message === 'Evidence contains an absolute/private path or credential-shaped material'
      )
        throw originalError
      return originalOk(value, message)
    }
    for (const unsafeMetadata of [false, true]) {
      let error,
        logged = 0
      console.error = () => {
        logged++
        throw new Error('Diagnostic writer failed')
      }
      const plan = generatedPrivacyPlan(Buffer.from('public C:\\unit-only\\fixture'))
      if (unsafeMetadata) plan.run = { ...runPlan, id: '/Users/unit-only/not-for-logging' }
      try {
        collect(plan)
      } catch (caught) {
        error = caught
      }
      assert.equal(error, originalError)
      assert.equal(logged, unsafeMetadata ? 0 : 1)
    }
  } finally {
    assert.ok = originalOk
    console.error = originalConsole
  }
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
  const originalConsole = console.error
  const diagnostics = []
  console.error = (value) => diagnostics.push(value)
  try {
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
  } finally {
    console.error = originalConsole
  }
  assert.equal(diagnostics.length, 1)
  assert.match(diagnostics[0], /^\[source-harness-privacy\] /)
  const context = JSON.parse(diagnostics[0].slice('[source-harness-privacy] '.length))
  assert.equal(context.run, runPlan.id)
  assert.equal(context.gate, runPlan.gate)
  assert.equal(context.harnessPath, path)
  assert.equal(context.bytes, privateWrapper.length)
  assert.equal(context.sha256, fileRecord(path, privateWrapper).sha256)
  assert.deepEqual(context.matches, [{ category: 'unix-absolute-path', utf16Offset: 13 }])
  assert.ok(!diagnostics[0].includes('/home/person'))
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

test('public relative source paths retain internal directory names while absolute paths and credentials remain rejected', () => {
  const relativePaths = [
    'apps/viewer-demo/public/vendor/drawio/img/lib/ibm/users/browser.svg',
    'apps/viewer-demo/public/vendor/drawio/img/lib/ibm/users/device.svg',
    'apps/viewer-demo/public/vendor/drawio/img/lib/ibm/users/integrated_digital_experiences.svg',
    'apps/viewer-demo/public/vendor/drawio/img/lib/ibm/users/physical_entity.svg',
    'apps/viewer-demo/public/vendor/drawio/img/lib/ibm/users/sensor.svg',
    'apps/viewer-demo/public/vendor/drawio/img/lib/ibm/users/user.svg',
    'fixtures/home/public.xml',
    'fixtures/tmp/public.xml'
  ]
  for (const path of relativePaths) {
    assert.equal(safePath(path), path)
    assert.doesNotThrow(() => assertPublicEvidence({ path }))
  }
  for (const directory of [
    'Users',
    'home',
    'private',
    'tmp',
    'var',
    'etc',
    'opt',
    'root',
    'workspace',
    'mnt'
  ]) {
    const path = `/${directory}/person/private-input`
    assert.throws(() => safePath(path))
    for (const prefix of ['', ' ', '\n', '"', "'", '=', '('])
      assert.throws(() => assertPublicEvidence(prefix + path), /absolute\/private path/)
    assert.throws(() => assertPublicEvidence({ nested: [{ path }] }), /absolute\/private path/)
  }
  for (const value of [
    'C:\\private\\input',
    'file:///absolute-input',
    'git.flyfish.dev',
    'github_pat_' + 'a'.repeat(40),
    'ghp_' + 'a'.repeat(40),
    'Bearer ' + 'a'.repeat(40)
  ])
    assert.throws(() => assertPublicEvidence({ value }), /absolute\/private path/)
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

test('the new CMS PEM plan is confined to its approved producer, inputs and constraints', async () => {
  const manifest = JSON.parse(
    await readFile(
      join(workspaceRoot, 'packages/build-support/browser-gates/prepack-browser-manifest.json')
    )
  )
  const selected = manifest.requiredCases.flatMap((row) =>
    (row.generatedFixtures || []).filter(
      (fixture) => fixture.validator === 'signature-panel-public-cms-pem-v1'
    )
  )
  assert.equal(selected.length, 72)
  assert.deepEqual([...new Set(selected.map((fixture) => fixture.path))].sort(), [
    'generated/signature-panel/reading.pdf.p7m',
    'generated/signature-panel/reading.xml.p7m',
    'generated/signature-panel/reading.xml.p7m.p7m'
  ])
  validateManifest(manifest)
  const changes = [
    (fixture) => {
      fixture.validator = 'unreviewed-pem-validator'
    },
    (fixture) => {
      fixture.path = 'generated/signature-panel/unreviewed.p7m'
    },
    (fixture) => {
      fixture.generator.bytes += 1
    },
    (fixture) => {
      fixture.generator.sha256 = '0'.repeat(64)
    },
    (fixture) => {
      fixture.generator.path = 'test/unreviewed-generator.mjs'
    },
    (fixture) => {
      fixture.format = 'binary'
    },
    (fixture) => {
      fixture.constraints.prefixHex = '30'
    },
    (fixture) => {
      fixture.constraints.maxBytes += 1
    },
    (fixture) => {
      fixture.constraints.extra = 'unreviewed'
    },
    (fixture) => {
      fixture.extra = 'unreviewed'
    }
  ]
  for (const change of changes) {
    const modified = structuredClone(manifest)
    const fixture = modified.requiredCases
      .flatMap((row) => row.generatedFixtures || [])
      .find((fixture) => fixture.validator === 'signature-panel-public-cms-pem-v1')
    change(fixture)
    assert.throws(() => validateManifest(modified))
  }
})

test('only the two original DICOM-bearing gates receive headed Firefox after ambient overrides are cleared', async () => {
  const manifest = JSON.parse(
    await readFile(
      join(workspaceRoot, 'packages/build-support/browser-gates/prepack-browser-manifest.json'),
      'utf8'
    )
  )
  validateManifest(manifest)
  assert.equal(manifest.runs.length, 22)
  assert.equal(manifest.requiredCases.length, 1383)
  const headedIds = ['dicom-renderer', 'unified-specialist-demo']
  for (const id of headedIds) {
    const gate = manifest.runs.find((run) => run.id === id)
    assert.deepEqual(gate.engines, ['chromium', 'firefox', 'webkit'])
    assert.deepEqual(gate.env, { FILE_VIEWER_HEADFUL_BROWSERS: 'firefox' })
  }
  for (const mutate of [
    (plan) => {
      plan.forbiddenEnvironment = plan.forbiddenEnvironment.filter(
        (name) => name !== 'FILE_VIEWER_HEADFUL_BROWSERS'
      )
    },
    ...headedIds.flatMap((id) => [
      (plan) => {
        delete plan.runs.find((run) => run.id === id).env
      },
      (plan) => {
        plan.runs.find((run) => run.id === id).env.FILE_VIEWER_HEADFUL_BROWSERS = 'chromium,firefox'
      },
      (plan) => {
        plan.runs.find((run) => run.id === id).gate = 'test/other.browser.mjs'
      }
    ]),
    (plan) => {
      plan.runs[0].env = { ...plan.runs[0].env, FILE_VIEWER_HEADFUL_BROWSERS: 'firefox' }
    }
  ]) {
    const changed = structuredClone(manifest)
    mutate(changed)
    assert.throws(() => validateManifest(changed))
  }
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
