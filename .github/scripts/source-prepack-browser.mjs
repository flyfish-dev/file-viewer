import assert from 'node:assert/strict'
import { createHash, createPrivateKey } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir, readdir, lstat } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const manifestPath = 'packages/build-support/browser-gates/prepack-browser-manifest.json'
export const jobName = 'Source prepack browser matrix'
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const engines = ['chromium', 'firefox', 'webkit']
const reviewedHarnesses = new Map([
  ['packages/renderers/drawing/test/issue-297-bpmn.browser.mjs', 'app/entry.js'],
  ['test/image-hand-tool.browser.mjs', 'main.js'],
  ['test/toolbar-keyboard.browser.mjs', 'entry.js']
])
const identity = (row) => JSON.stringify([row.gate, row.engine, row.id])
const sorted = (values) =>
  [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'))
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n')

export function safePath(value) {
  assert.equal(typeof value, 'string')
  assert.ok(
    value &&
      !isAbsolute(value) &&
      !value.includes('\\') &&
      !value.includes(':') &&
      value
        .split('/')
        .every(
          (part) =>
            part &&
            part !== '.' &&
            part !== '..' &&
            !['.git', 'node_modules', '.release'].includes(part)
        ),
    'Expected a safe public relative path'
  )
  return value
}

export function fileRecord(path, bytes) {
  return { path: safePath(path), bytes: bytes.length, sha256: sha256(bytes) }
}

export function assertPublicEvidence(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  assert.ok(
    !/(?:\/(?:Users|home|private|tmp|var|etc|opt|root|workspace|mnt)\/|[a-z]:\\|file:\/\/|git\.flyfish\.dev|github_pat_[a-z0-9_]+|gh[pousr]_[a-z0-9]{20,}|\bBearer\s+[a-z0-9._~+/-]{12,})/i.test(
      text
    ),
    'Evidence contains an absolute/private path or credential-shaped material'
  )
  return value
}

/** Generated public document witnesses are checked before any artifact write.
 * Encrypted private-key DER cannot be identified by attempting decryption. */
export function assertSyntheticPublicBytes(bytes) {
  const text = bytes.toString('utf8')
  assert.ok(
    !/-----BEGIN (?:[A-Z0-9 ]*PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/.test(text),
    'Private-key material cannot be retained as a public synthetic fixture'
  )
  if (bytes.length < 1024 * 1024 && /^[\s]*[\[{]/.test(text)) {
    let object
    try {
      object = JSON.parse(text)
    } catch {}
    const visit = (value) => {
      if (!value || typeof value !== 'object') return
      if (['RSA', 'EC', 'OKP', 'oct'].includes(value.kty)) {
        assert.ok(
          !['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k'].some((key) => Object.hasOwn(value, key)),
          'Private JWK material cannot enter a public fixture witness'
        )
      }
      for (const child of Object.values(value)) visit(child)
    }
    visit(object)
  }
  if (bytes[0] & 0x80) {
    const tag = bytes[0] & 0x40 ? bytes[0] & 0x3f : (bytes[0] >> 2) & 0x0f
    assert.ok(
      ![5, 7].includes(tag),
      'OpenPGP secret-key packets cannot enter a public fixture witness'
    )
  }
  if (bytes[0] !== 0x30) return bytes
  for (const type of ['pkcs8', 'pkcs1', 'sec1']) {
    let parsed = false
    try {
      createPrivateKey({ key: bytes, format: 'der', type })
      parsed = true
    } catch {}
    assert.ok(!parsed, 'DER private keys cannot enter a public fixture witness')
  }
  const tlv = (offset, limit) => {
    if (offset + 2 > limit) return null
    const tag = bytes[offset++],
      first = bytes[offset++]
    let length = first
    if (first & 0x80) {
      const size = first & 0x7f
      if (!size || size > 4 || offset + size > limit || bytes[offset] === 0) return null
      length = 0
      for (let index = 0; index < size; index++) length = length * 256 + bytes[offset++]
      if (length < 128) return null
    }
    if (offset + length > limit) return null
    return { tag, start: offset, end: offset + length }
  }
  const children = (node) => {
    const result = []
    let offset = node.start
    while (offset < node.end && result.length < 32) {
      const child = tlv(offset, node.end)
      if (!child) return []
      result.push(child)
      offset = child.end
    }
    return offset === node.end ? result : []
  }
  const top = tlv(0, bytes.length)
  // A valid first private-key container remains private with trailing junk.
  if (!top) return bytes
  const nodes = children(top),
    algorithm = nodes[0]?.tag === 0x30 ? children(nodes[0]) : []
  assert.ok(
    !(nodes.length === 2 && algorithm[0]?.tag === 0x06 && nodes[1].tag === 0x04),
    'EncryptedPrivateKeyInfo DER cannot enter a public fixture witness'
  )
  const version =
    nodes[0]?.tag === 0x02 && nodes[0].end - nodes[0].start === 1 ? bytes[nodes[0].start] : null
  assert.ok(
    !([0, 1].includes(version) && nodes[1]?.tag === 0x30 && nodes[2]?.tag === 0x04),
    'PrivateKeyInfo DER cannot enter a public fixture witness'
  )
  const contentInfo = nodes[1]?.tag === 0x30 ? children(nodes[1]) : []
  assert.ok(
    !(version === 3 && contentInfo[0]?.tag === 0x06 && [2, 3].includes(nodes.length)),
    'PFX private-key containers cannot enter a public fixture witness'
  )
  return bytes
}

export function validateManifest(plan) {
  assert.equal(plan.schemaVersion, 1)
  assert.equal(plan.kind, 'source-prepack-browser-manifest')
  assert.equal(plan.mode, 'prepack-only')
  assert.equal(plan.repository, 'flyfish-dev/file-viewer')
  assert.equal(plan.workflowPath, '.github/workflows/public-ci.yml')
  assert.deepEqual(plan.tools, { node: '24.20.0', pnpm: '11.0.9', playwright: '1.64.1' })
  assert.ok(
    Array.isArray(plan.runs) && plan.runs.length === 22,
    'Keep nine canonical gates, the original TIFF variant and twelve public owners'
  )
  const runIds = new Set(),
    cases = new Set()
  for (const run of plan.runs) {
    assert.ok(!runIds.has(run.id) && /^[a-z0-9-]+$/.test(run.id), 'Duplicate/invalid original run')
    runIds.add(run.id)
    safePath(run.gate)
    assert.ok(
      run.gate.startsWith('packages/') ||
        run.gate.startsWith('test/') ||
        run.gate.startsWith('apps/')
    )
    assert.ok(
      Array.isArray(run.engines) &&
        run.engines.length &&
        run.engines.every((engine) => engines.includes(engine))
    )
    assert.ok(['completion', 'report'].includes(run.observation))
    assert.ok(
      Array.isArray(run.caseIds) &&
        run.caseIds.length &&
        new Set(run.caseIds).size === run.caseIds.length
    )
    for (const engine of run.engines)
      for (const id of run.caseIds) {
        if (run.engineCases?.[engine] && !run.engineCases[engine].includes(id)) continue
        cases.add(
          identity({ gate: run.gate, engine, id: run.casePrefix ? run.casePrefix + id : id })
        )
      }
  }
  assert.ok(Array.isArray(plan.requiredCases) && plan.requiredCases.length)
  const actual = new Set(),
    witnessOwners = new Map()
  for (const row of plan.requiredCases) {
    safePath(row.gate)
    assert.ok(engines.includes(row.engine) && typeof row.id === 'string' && row.id)
    assert.ok(!actual.has(identity(row)), 'Duplicate required original case/engine')
    actual.add(identity(row))
    assert.ok(
      Array.isArray(row.fixtures),
      'Every original case needs an explicit actual fixture plan'
    )
    assert.ok(row.fixtureless !== true, 'These original document gates are not fixtureless')
    for (const witness of [...(row.generatedFixtures || []), ...(row.sourceHarnesses || [])]) {
      safePath(witness.witnessPath)
      const owner = JSON.stringify([row.runId, row.engine, witness.path])
      assert.ok(
        !witnessOwners.has(witness.witnessPath) || witnessOwners.get(witness.witnessPath) === owner,
        'Original runs/engines/inputs cannot share an ambiguous witness destination'
      )
      witnessOwners.set(witness.witnessPath, owner)
    }
    for (const fixture of row.fixtures) {
      safePath(fixture.path)
      assert.ok(
        Number.isSafeInteger(fixture.bytes) &&
          fixture.bytes > 0 &&
          /^[a-f0-9]{64}$/.test(fixture.sha256)
      )
    }
    for (const fixture of row.generatedFixtures || []) {
      assert.ok(
        ['original-generated-fixture-v1', 'issue-206-public-rs256-jws-v1'].includes(
          fixture.validator
        )
      )
      safePath(fixture.path)
      safePath(fixture.witnessPath)
      safePath(fixture.generator.path)
      assert.ok(
        Number.isSafeInteger(fixture.generator.bytes) &&
          fixture.generator.bytes > 0 &&
          /^[a-f0-9]{64}$/.test(fixture.generator.sha256)
      )
      if (fixture.validator === 'original-generated-fixture-v1') {
        assert.ok(['pdf', 'png', 'cms', 'eml', 'xml', 'zip', 'binary'].includes(fixture.format))
        assert.ok(
          Number.isSafeInteger(fixture.constraints?.maxBytes) &&
            fixture.constraints.maxBytes > 0 &&
            fixture.constraints.maxBytes <= 64 * 1024 * 1024
        )
      }
    }
    for (const harness of row.sourceHarnesses || []) {
      assert.equal(harness.inputScope, 'complete-public-tree')
      assert.equal(harness.producer.path, row.gate)
      assert.equal(
        safePath(harness.path),
        reviewedHarnesses.get(row.gate),
        'Only the three reviewed original wrapper producers/routes may use a source-harness witness'
      )
      safePath(harness.witnessPath)
    }
  }
  assert.deepEqual(
    sorted(actual),
    sorted(cases),
    'The static plan omitted or added an original case/engine'
  )
  return plan
}

function metadataEqual(actual, expected) {
  return actual.bytes === expected.bytes && actual.sha256 === expected.sha256
}

/** Exit zero alone never creates a case. The original engine boundary/report
 * and real launch, fixture and HTTP-byte observations are all required. */
export function collectRunProof({ run, required, events, reportCases, exitCode, toolVersions }) {
  assert.equal(exitCode, 0, `Original command failed: ${run.id}`)
  events = events.filter((event) => event.gateId === (run.gateId || run.id))
  const result = []
  for (const engine of run.engines) {
    const expected = required.filter((row) => row.engine === engine)
    const ids = expected.map((row) =>
      run.casePrefix ? row.id.slice(run.casePrefix.length) : row.id
    )
    let actual
    if (run.observation === 'completion') {
      const completions = events.filter(
        (event) =>
          event.kind === 'browser-gate-engine-complete' &&
          event.gateId === run.gateId &&
          event.engine === engine &&
          event.phase === run.phase
      )
      assert.equal(
        completions.length,
        1,
        `Missing/duplicate original ${run.id}/${engine}/${run.phase} completion`
      )
      actual = completions[0].caseIds
      assert.deepEqual(
        sorted(actual),
        sorted(ids),
        `Original ${run.id}/${engine} matrix changed or was partial`
      )
    } else {
      actual = (reportCases || []).filter((row) => row.engine === engine)
      assert.ok(
        actual.every((row) => row.passed === true),
        `Original ${run.id}/${engine} report contains a failed case`
      )
      assert.deepEqual(
        sorted(actual.map((row) => row.id)),
        sorted(ids),
        `Original ${run.id}/${engine} report matrix incomplete`
      )
    }
    const launches = events.filter(
      (event) => event.kind === 'browser-launched' && event.engine === engine
    )
    assert.ok(launches.length, `No real ${engine} launch observed`)
    assert.ok(
      launches.every(
        (event) =>
          event.playwrightVersion === toolVersions.playwright &&
          event.nodeVersion === 'v' + toolVersions.node &&
          typeof event.browserVersion === 'string' &&
          event.browserVersion
      ),
      'Actual browser/Playwright/Node identity drifted'
    )
    const versions = [...new Set(launches.map((row) => row.browserVersion))]
    assert.equal(versions.length, 1, 'One engine used different actual browser versions')
    const assets = new Map()
    for (const event of events.filter(
      (row) => row.kind === 'served-runtime-asset' && row.engine === engine
    )) {
      assert.ok(
        /^[a-f0-9]{64}$/.test(event.sha256) && Number.isSafeInteger(event.bytes) && event.bytes > 0
      )
      const suffix =
        extname(event.path).replace(/[^a-z0-9.]/g, '') ||
        (/wasm/.test(event.contentType) ? '.wasm' : '.js')
      const record = {
        path: `served/${event.sha256}${suffix}`,
        bytes: event.bytes,
        sha256: event.sha256
      }
      assets.set(record.path, record)
    }
    assert.ok(
      [...assets.values()].some((row) => /\.(?:[cm]?js|wasm)$/.test(row.path)),
      `No actual executable HTTP bytes for ${run.id}/${engine}`
    )
    const observed = events.flatMap((event) => {
      if (event.kind === 'served-fixture' && event.engine === engine) return [event]
      if (event.kind === 'browser-fixture' && event.engine === engine) return [event.fixture]
      if (event.kind === 'browser-gate-fixture' && event.gateId === run.gateId)
        return [event.fixture]
      return []
    })
    for (const row of expected) {
      assert.ok(
        row.fixtures.length || row.generatedFixtures?.length,
        `Unresolved actual fixture plan: ${run.id}/${row.id}`
      )
      const fixtures = row.fixtures.map((fixture) => {
        assert.ok(
          observed.some((value) => metadataEqual(value, fixture)),
          `Original fixture not actually observed: ${fixture.path}`
        )
        return { path: fixture.path, bytes: fixture.bytes, sha256: fixture.sha256 }
      })
      const witnesses = []
      for (const fixture of row.generatedFixtures || []) {
        const selected = [
          ...new Map(
            events
              .filter(
                (event) =>
                  (event.engine === engine || event.engine === null) &&
                  event.kind === 'generated-fixture-witness' &&
                  event.witness?.fixturePath === fixture.path &&
                  event.witness.kind ===
                    (fixture.validator === 'issue-206-public-rs256-jws-v1'
                      ? 'issue-206-public-jws-fixture'
                      : 'original-generated-fixture')
              )
              .map((event) => [JSON.stringify(event.witness), event])
          ).values()
        ]
        assert.equal(
          selected.length,
          1,
          `Missing/duplicate real generated fixture witness: ${fixture.path}`
        )
        const witness = selected[0].witness
        const bytes =
          witness.kind === 'issue-206-public-jws-fixture'
            ? Buffer.from(witness.compactJws)
            : Buffer.from(witness.data, 'base64')
        assertSyntheticPublicBytes(bytes)
        assertPublicEvidence(bytes.toString('utf8'))
        if (fixture.constraints) assert.ok(bytes.length <= fixture.constraints.maxBytes)
        const record = fileRecord(fixture.path, bytes)
        assert.ok(
          observed.some((value) => value.path === fixture.path && metadataEqual(value, record)),
          'Generated witness differs from the original actual load/serve input'
        )
        fixtures.push(record)
        witnesses.push({ path: fixture.witnessPath, value: assertPublicEvidence(witness) })
      }
      const servedAssets = []
      for (const asset of row.servedAssets || []) {
        assert.ok(
          [...assets.values()].some((actual) => metadataEqual(actual, asset)),
          `Independent required product bytes were not actually observed: ${asset.path}`
        )
        servedAssets.push(asset)
      }
      for (const harness of row.sourceHarnesses || []) {
        const selected = [
          ...new Map(
            events
              .filter(
                (event) =>
                  event.kind === 'source-harness-witness' &&
                  event.engine === engine &&
                  event.witness?.assetPath === harness.path
              )
              .map((event) => [JSON.stringify(event.witness), event])
          ).values()
        ]
        assert.equal(
          selected.length,
          1,
          'Required original source-harness bytes are missing or ambiguous'
        )
        const witness = selected[0].witness,
          bytes = Buffer.from(witness.data, 'base64')
        assertPublicEvidence(bytes.toString('utf8'))
        const record = fileRecord(harness.path, bytes)
        assert.ok(
          events.some(
            (event) =>
              event.kind === 'served-runtime-asset' &&
              event.engine === engine &&
              event.path === '/' + harness.path &&
              metadataEqual(event, record)
          ),
          'Source-harness witness differs from actual HTTP bytes'
        )
        servedAssets.push(record)
        witnesses.push({ path: harness.witnessPath, value: assertPublicEvidence(witness) })
      }
      assert.ok(
        servedAssets.length,
        'An independent required product/harness byte plan is mandatory'
      )
      result.push({
        id: row.id,
        gate: row.gate,
        engine,
        status: 'passed',
        fixtures: sorted(fixtures),
        tools: [
          { name: 'node', version: toolVersions.node },
          { name: 'pnpm', version: toolVersions.pnpm },
          { name: 'playwright', version: toolVersions.playwright },
          { name: engine, version: versions[0] }
        ],
        servedAssets: sorted(servedAssets),
        witnesses,
        observation: {
          run: run.id,
          engine,
          phase: run.phase || 'original-report',
          originalCase: ids[expected.indexOf(row)],
          commandExitCode: exitCode,
          launchCount: launches.length,
          originalCaseCount: actual.length
        }
      })
    }
  }
  return result
}

export function parseOwnerReports(parser, documents) {
  const rows = []
  const add = (engine, id, passed) => rows.push({ engine, id, passed: passed === true })
  for (const { label, document: value } of documents) {
    if (parser === 'dicom-packed') {
      assert.equal(value.status, 'passed')
      for (const result of value.results) {
        assert.equal(result.status, 'passed')
        assert.equal(result.cleanup, 'passed')
        assert.deepEqual(result.errors, [])
        for (const fixture of result.fixtures)
          add(
            result.browser,
            fixture.fixture,
            fixture.status === 'passed' && fixture.cleanup === 'passed'
          )
      }
    } else if (parser === 'pdf-lifecycle') {
      for (const row of value.reports) add(row.engine, row.mode, row.passed)
    } else if (parser === 'full-amd') {
      for (const row of value.cases)
        add(row.engine, `${row.surface ? 'component-demo' : 'amd'}:${row.sample}`, row.passed)
    } else if (parser === 'vue-toolbar') {
      assert.equal(value.passed, true)
      assert.deepEqual(value.pageErrors, [])
      assert.deepEqual(value.externalRequests, [])
      for (const row of value.cases) add(value.engine, `${row.integration}:${row.name}`, row.passed)
    } else if (parser === 'bpmn') {
      assert.equal(value.status, 'passed')
      for (const row of value.engines) {
        assert.deepEqual(row.errors, [])
        assert.deepEqual(row.external, [])
        for (const check of row.checks) add(row.name, check, true)
      }
    } else if (parser === 'image-pan') {
      for (const row of value.results) add(row.engine, row.mode, row.passed)
    } else if (parser === 'pdf-selection') {
      assert.equal(value.passed, true)
      for (const row of value.cases)
        add(
          row.browser,
          `${row.mode}:${row.id}`,
          Boolean(row.during && row.copied?.handled && row.changedPixels > 0)
        )
    } else if (parser === 'pdf-stream') {
      assert.equal(value.status, 'passed')
      for (const row of value.cases)
        add(row.browser, `${row.wrapper}:${row.mode}`, row.status === 'passed')
    } else if (parser === 'spreadsheet-worker') {
      for (const row of value.results) add(row.engine, `worker:${row.worker}`, row.passed)
    } else if (parser === 'toolbar-keyboard') {
      assert.equal(value.status, 'passed')
      for (const row of value.cases)
        add(row.engine, `${row.mode}:${row.isolation}`, row.status === 'passed')
    } else if (parser === 'source-feedback') {
      assert.equal(value.status, 'passed')
      for (const row of value.cases) {
        const engine = engines.find((engine) => row.id.startsWith(engine + '-'))
        assert.ok(engine)
        add(engine, row.id.slice(engine.length + 1), row.status === 'passed')
      }
    } else if (parser === 'signature-suite') {
      assert.equal(value.passed, true)
      for (const row of value.cases) {
        const engine =
          row.browserName || engines.find((engine) => row.key?.startsWith(engine + '-'))
        assert.ok(engine)
        const key = row.key
          ? row.key.slice(engine.length + 1)
          : row.scenario || `viewport:${row.viewport}:legacy:${row.legacy}`
        add(engine, `${label}:${key}`, label === 'hosts' ? true : row.passed)
      }
    } else throw new Error(`Unknown original public report parser: ${parser}`)
  }
  return rows
}

async function regularBytes(root, path) {
  safePath(path)
  const absolute = resolve(root, path)
  for (let current = absolute; current !== resolve(root); current = dirname(current)) {
    const stat = await lstat(current)
    assert.ok(!stat.isSymbolicLink(), 'Source/evidence links are forbidden')
    if (current === absolute) assert.ok(stat.isFile(), 'Expected a regular source/evidence file')
  }
  return readFile(absolute)
}

export async function readTrace(directory) {
  const result = []
  for (const name of (await readdir(directory)).sort()) {
    assert.match(name, /^(?:runtime|gate-completions|gate-fixtures)-\d+\.jsonl$/)
    const bytes = await regularBytes(directory, name)
    assert.ok(bytes.length < 128 * 1024 * 1024, 'Trace exceeds bounded inspection')
    for (const line of bytes.toString('utf8').trim().split('\n').filter(Boolean)) {
      const event = JSON.parse(line)
      assert.equal(event.schemaVersion, 1)
      result.push(event)
    }
  }
  return result
}

export async function collectOriginalScreenshots(root, run) {
  const roots = run.evidenceDirectories || []
  const result = []
  for (const directory of roots) {
    safePath(directory)
    assert.ok(
      directory.startsWith('output/') &&
        !directory.startsWith('output/source-prepack-browser/proof'),
      'Only declared original task-owned output screenshots may be retained'
    )
    const walk = async (relativeDirectory) => {
      const entries = await readdir(resolve(root, relativeDirectory), {
        withFileTypes: true
      }).catch((error) => {
        if (error.code === 'ENOENT') return []
        throw error
      })
      for (const entry of entries) {
        const source = relativeDirectory + '/' + entry.name
        if (entry.isSymbolicLink())
          throw new Error('Original screenshot output must not contain links')
        if (entry.isDirectory()) {
          await walk(source)
          continue
        }
        if (
          !entry.isFile() ||
          !/\.(?:png|jpe?g)$/.test(entry.name) ||
          /(?:^|[-_.])fail(?:ure)?(?:[-_.]|$)/i.test(entry.name)
        )
          continue
        const engine = source.match(/(?:^|[\/._-])(chromium|firefox|webkit)(?:[\/._-]|$)/)?.[1]
        if (!run.engines.includes(engine)) continue // Never assign an unlabelled or overwritten image to an engine.
        const bytes = await regularBytes(root, source)
        if (entry.name.endsWith('.png'))
          assert.ok(
            bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
            'Original screenshot is not PNG bytes'
          )
        else
          assert.ok(
            bytes.length >= 4 &&
              bytes.readUInt16BE(0) === 0xffd8 &&
              bytes.readUInt16BE(bytes.length - 2) === 0xffd9,
            'Original screenshot is not JPEG bytes'
          )
        const path = `screenshots/${run.id}/${sha256(Buffer.from(source)).slice(0, 16)}-${entry.name}`
        result.push({ engine, path: safePath(path), bytes })
      }
    }
    await walk(directory)
  }
  return result
}

export async function assertHeadSourceBytes(root, expectedHead, { records = false } = {}) {
  const git = (args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()
  assert.equal(git(['rev-parse', 'HEAD']), expectedHead, 'Source HEAD changed')
  const algorithm = git(['rev-parse', '--show-object-format'])
  assert.ok(['sha1', 'sha256'].includes(algorithm))
  const entries = execFileSync('git', ['ls-tree', '-rz', '--full-tree', 'HEAD'], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024
  })
    .toString()
    .split('\0')
    .filter(Boolean)
  const actual = []
  for (const entry of entries) {
    const tab = entry.indexOf('\t'),
      [mode, type, blob] = entry.slice(0, tab).split(' '),
      path = entry.slice(tab + 1)
    assert.equal(type, 'blob', 'Only regular tracked source files are supported')
    assert.ok(['100644', '100755'].includes(mode), 'Source links/submodules are forbidden')
    const file = resolve(root, safePath(path)),
      stat = await lstat(file)
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `Source is not a regular file: ${path}`)
    assert.equal(
      Boolean(stat.mode & 0o111),
      mode === '100755',
      `Tracked source executable mode changed: ${path}`
    )
    const hash = createHash(algorithm).update(`blob ${stat.size}\0`)
    const contentHash = createHash('sha256')
    for await (const chunk of createReadStream(file)) {
      hash.update(chunk)
      contentHash.update(chunk)
    }
    assert.equal(hash.digest('hex'), blob, `Tracked source bytes differ from actual HEAD: ${path}`)
    actual.push({ path, mode, blob, bytes: stat.size, sha256: contentHash.digest('hex') })
  }
  assert.equal(git(['rev-parse', 'HEAD']), expectedHead, 'Source HEAD changed during input binding')
  return records ? actual : entries.length
}

async function execute(command, args, { cwd, env, log }) {
  await mkdir(dirname(log), { recursive: true })
  const stream = (await import('node:fs')).createWriteStream(log, { flags: 'wx', mode: 0o600 })
  try {
    return await new Promise((accept, reject) => {
      const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
      child.stdout.pipe(stream, { end: false })
      child.stderr.pipe(stream, { end: false })
      child.once('error', reject)
      child.once('close', (code, signal) =>
        signal ? reject(new Error(`Original process terminated by ${signal}`)) : accept(code)
      )
    })
  } finally {
    await new Promise((resolve) => stream.end(resolve))
  }
}

export function checkTools(root) {
  const require = createRequire(join(root, 'package.json'))
  const versions = {
    node: process.versions.node,
    pnpm: execFileSync('pnpm', ['--version'], { cwd: root, encoding: 'utf8' }).trim(),
    playwright: require('playwright/package.json').version
  }
  assert.deepEqual(
    versions,
    { node: '24.20.0', pnpm: '11.0.9', playwright: '1.64.1' },
    'Use the fixed actual tools; do not relabel or substitute them'
  )
  return versions
}

async function main() {
  const root = resolve('.')
  if (process.argv.includes('--check-tools')) {
    checkTools(root)
    return
  }
  assert.equal(
    process.env.GITHUB_ACTIONS,
    'true',
    'The product driver runs only in the approved temporary hosted job'
  )
  assert.equal(process.env.GITHUB_REPOSITORY, 'flyfish-dev/file-viewer')
  assert.equal(process.env.GITHUB_EVENT_NAME, 'pull_request')
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
  assert.equal(
    event.pull_request?.head?.repo?.full_name,
    process.env.GITHUB_REPOSITORY,
    'Fork execution is not approved'
  )
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  const head = git(['rev-parse', 'HEAD'])
  assert.equal(head, event.pull_request.head.sha)
  assert.equal(head, process.env.FILE_VIEWER_PREPACK_EXPECTED_HEAD)
  const publicTree = git(['rev-parse', 'HEAD^{tree}'])
  const sourceInputsBefore = await assertHeadSourceBytes(root, head, { records: true })
  const sourceManifest = await regularBytes(root, manifestPath)
  const plan = validateManifest(JSON.parse(sourceManifest))
  const tools = checkTools(root)
  const sourceLock = await regularBytes(root, 'pnpm-lock.yaml')
  const output = resolve(root, 'output/source-prepack-browser')
  assert.ok(!(await lstat(output).catch(() => null)), 'Use a fresh task-owned output directory')
  await mkdir(output, { recursive: true })
  const observer = resolve(root, '.github/scripts/source-prepack-observer.cjs')
  await regularBytes(root, '.github/scripts/source-prepack-observer.cjs')
  for (const attachment of plan.attachments) {
    safePath(attachment.path)
    assert.match(
      attachment.sourceUrl,
      /^https:\/\/github\.com\/user-attachments\/files\/\d+\/[A-Za-z0-9_.-]+$/
    )
    assert.equal(attachment.uploadOriginal, false)
    const destination = resolve(root, attachment.path)
    assert.ok(
      !(await lstat(destination).catch(() => null)),
      'Do not overwrite an existing original fixture'
    )
    await mkdir(dirname(destination), { recursive: true })
    const bytes = execFileSync('gh', ['api', attachment.sourceUrl], {
      maxBuffer: 16 * 1024 * 1024,
      timeout: 120000
    })
    assert.ok(
      metadataEqual(fileRecord(attachment.path, bytes), attachment),
      'Public original attachment bytes differ from the approved input'
    )
    await writeFile(destination, bytes, { flag: 'wx' })
  }
  const allCases = []
  for (const run of plan.runs) {
    if (run.observedWith) continue // Original source DICOM command already awaits this whole packed owner.
    const directory = join(output, 'raw', run.id)
    const trace = join(directory, 'trace')
    await mkdir(trace, { recursive: true })
    const env = { ...process.env }
    for (const key of Object.keys(env))
      if (
        /^(?:NODE_OPTIONS|NODE_PATH|FILE_VIEWER_TEST_BROWSERS|FILE_VIEWER_PDF_I18N_ONLY|FILE_VIEWER_SOURCE_FEEDBACK_WRAPPERS|.*_INSTALLED_ROOT|.*_COLD_ROOT)$/i.test(
          key
        ) ||
        plan.forbiddenEnvironment.includes(key)
      )
        delete env[key]
    const observationOwners = [run, ...plan.runs.filter((owner) => owner.observedWith === run.id)]
    for (const owner of observationOwners)
      for (const directory of owner.evidenceDirectories || []) {
        assert.ok(
          !(await lstat(resolve(root, safePath(directory))).catch(() => null)),
          'Original screenshot output must start absent for this fresh execution'
        )
      }
    Object.assign(env, run.env || {}, {
      FILE_VIEWER_PREPACK_TRACE_DIR: trace,
      FILE_VIEWER_PREPACK_GATE_ID: run.gateId || run.id,
      NODE_OPTIONS: `--require=${observer}`,
      FILE_VIEWER_PREPACK_GENERATED_FIXTURES: JSON.stringify(
        observationOwners.flatMap((owner) =>
          (owner.generatedObservations || []).map((fixture) => ({
            ...fixture,
            gateId: owner.gateId || owner.id
          }))
        )
      )
    })
    const harnessPaths = [
      ...new Set(
        plan.requiredCases
          .filter((row) => row.runId === run.id)
          .flatMap((row) => (row.sourceHarnesses || []).map((harness) => harness.path))
      )
    ]
    env.FILE_VIEWER_PREPACK_SOURCE_HARNESSES = JSON.stringify(
      harnessPaths.map((path) => ({ path, httpPath: '/' + path, maxBytes: 64 * 1024 * 1024 }))
    )
    if (run.engineEnv) env[run.engineEnv] = run.engines.join(',')
    for (const [key, path] of Object.entries(run.outputs || {})) env[key] = resolve(root, path)
    for (const [index, prerequisite] of (run.prerequisites || []).entries()) {
      assert.equal(
        await execute(prerequisite[0], prerequisite.slice(1), {
          cwd: root,
          env,
          log: join(directory, `prerequisite-${index}.log`)
        }),
        0,
        'An original prerequisite failed'
      )
    }
    let exitCode
    if (run.singleEngine) {
      // Demo's original entry selects one engine. Preserve three actual executions.
      for (const engine of run.engines) {
        exitCode = await execute(process.execPath, [run.gate], {
          cwd: root,
          env: { ...env, [run.engineEnv]: engine },
          log: join(directory, `${engine}.log`)
        })
        assert.equal(exitCode, 0, `Original ${run.id}/${engine} failed`)
      }
    } else
      exitCode = await execute(process.execPath, [run.gate], {
        cwd: root,
        env,
        log: join(directory, 'original.log')
      })
    const events = await readTrace(trace)
    for (const owner of [run, ...plan.runs.filter((owner) => owner.observedWith === run.id)]) {
      const documents = []
      for (const source of owner.reports || []) {
        let path = source.path
        if (source.latestDirectory) {
          const entries = await readdir(resolve(root, source.latestDirectory), {
            withFileTypes: true
          })
          const candidates = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort()
          assert.equal(candidates.length, 1, 'Expected exactly the fresh original packed DICOM run')
          path = join(source.latestDirectory, candidates[0], 'report.json')
        }
        documents.push({
          label: source.label,
          document: JSON.parse(await regularBytes(root, path))
        })
      }
      const reportCases =
        owner.observation === 'report' ? parseOwnerReports(owner.parser, documents) : undefined
      for (const boundary of owner.boundaries || [])
        for (const engine of boundary.engines) {
          const completions = events.filter(
            (event) =>
              event.gateId === (owner.gateId || owner.id) &&
              event.kind === 'browser-gate-engine-complete' &&
              event.phase === boundary.phase &&
              event.engine === engine
          )
          assert.equal(completions.length, 1, 'Missing/duplicate actual original owner boundary')
          assert.deepEqual(
            sorted(completions[0].caseIds),
            sorted(boundary.caseIds),
            'Original owner boundary matrix changed'
          )
          reportCases.push(...completions[0].caseIds.map((id) => ({ engine, id, passed: true })))
        }
      const screenshots = await collectOriginalScreenshots(root, owner)
      allCases.push(
        ...collectRunProof({
          run: owner,
          required: plan.requiredCases.filter((row) => row.runId === owner.id),
          events,
          reportCases,
          exitCode,
          toolVersions: tools
        }).map((row) => ({
          ...row,
          screenshots: screenshots.filter((image) => image.engine === row.engine)
        }))
      )
    }
  }
  assert.deepEqual(
    sorted(allCases.map(identity)),
    sorted(plan.requiredCases.map(identity)),
    'Whole original case/engine matrix is incomplete'
  )
  assert.equal(git(['rev-parse', 'HEAD']), head)
  const sourceInputsAfter = await assertHeadSourceBytes(root, head, { records: true })
  assert.deepEqual(
    sourceInputsAfter,
    sourceInputsBefore,
    'Actual source inputs changed during original execution'
  )
  assert.equal(sha256(await regularBytes(root, manifestPath)), sha256(sourceManifest))
  assert.equal(sha256(await regularBytes(root, 'pnpm-lock.yaml')), sha256(sourceLock))
  const runId = Number(process.env.GITHUB_RUN_ID),
    attempt = Number(process.env.GITHUB_RUN_ATTEMPT)
  const jobs = JSON.parse(
    execFileSync(
      'gh',
      [
        'api',
        `repos/${plan.repository}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`
      ],
      { encoding: 'utf8' }
    )
  )
  const matching = jobs.jobs.filter(
    (job) => job.name === jobName && job.head_sha === head && job.run_id === runId
  )
  assert.equal(matching.length, 1, 'Cannot independently identify the actual hosted job')
  const proofDirectory = join(output, 'proof')
  await mkdir(proofDirectory)
  const sourceInputsPath = 'evidence/public-source-inputs.json'
  const sourceInputsBytes = jsonBytes(
    assertPublicEvidence({
      schemaVersion: 1,
      kind: 'source-prepack-public-tree-inputs',
      inputScope: 'complete-public-tree',
      publicHead: head,
      publicTree,
      lockSha256: sha256(sourceLock),
      before: sourceInputsBefore,
      after: sourceInputsAfter
    })
  )
  await mkdir(join(proofDirectory, 'evidence'))
  await writeFile(join(proofDirectory, sourceInputsPath), sourceInputsBytes, { flag: 'wx' })
  const sourceInputs = fileRecord(sourceInputsPath, sourceInputsBytes)
  const cases = []
  for (const row of allCases) {
    const evidence = []
    const path = `cases/${sha256(Buffer.from(identity(row)))}.json`
    const bytes = jsonBytes(
      assertPublicEvidence({
        ...row.observation,
        publicHead: head,
        publicTree,
        sourceFilesExactlyMatchedHeadBeforeAndAfter: sourceInputsBefore.length
      })
    )
    await mkdir(join(proofDirectory, 'cases'), { recursive: true })
    await writeFile(join(proofDirectory, path), bytes, { flag: 'wx' })
    evidence.push(fileRecord(path, bytes))
    if (
      plan.requiredCases.find((entry) => identity(entry) === identity(row))?.sourceHarnesses?.length
    )
      evidence.push(sourceInputs)
    for (const screenshot of row.screenshots) {
      const destination = join(proofDirectory, screenshot.path)
      await mkdir(dirname(destination), { recursive: true })
      const existing = await readFile(destination).catch(() => null)
      if (existing)
        assert.ok(existing.equals(screenshot.bytes), 'Original screenshot destination is ambiguous')
      else await writeFile(destination, screenshot.bytes, { flag: 'wx' })
      evidence.push(fileRecord(screenshot.path, screenshot.bytes))
    }
    for (const witness of row.witnesses) {
      const bytes = jsonBytes(witness.value),
        destination = join(proofDirectory, safePath(witness.path))
      await mkdir(dirname(destination), { recursive: true })
      const existing = await readFile(destination).catch(() => null)
      if (existing) assert.ok(existing.equals(bytes), 'Witness path is ambiguous')
      else await writeFile(destination, bytes, { flag: 'wx' })
      evidence.push(fileRecord(witness.path, bytes))
    }
    const { witnesses, observation, screenshots, ...entry } = row
    cases.push({ ...entry, evidence })
  }
  const proof = {
    schemaVersion: 1,
    kind: 'source-prepack-browser-proof',
    mode: 'prepack-only',
    repository: plan.repository,
    workflowPath: plan.workflowPath,
    publicHead: head,
    publicTree,
    inputManifestSha256: sha256(sourceManifest),
    lockSha256: sha256(sourceLock),
    run: { id: runId, attempt, ref: process.env.GITHUB_REF },
    job: { id: matching[0].id, name: jobName },
    sourceInputs,
    cases
  }
  await writeFile(
    join(proofDirectory, 'source-prepack-browser-proof.json'),
    jsonBytes(assertPublicEvidence(proof)),
    { flag: 'wx' }
  )
  console.log(
    `Observed ${cases.length} original source prepack case/engine results; this is not final-package or release qualification.`
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
