import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { getEventListeners } from 'node:events'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  createPointCloudWithCancellation,
  createPointSourceWithCancellation,
  verifyPointCloudSource,
  verifyPointSourceInitialization
} from './build-geo3d-point-adapters.mjs'

const require = createRequire(import.meta.url)
const engine = await readFile(require.resolve('@giro3d/giro3d/entities/PointCloud.js'), 'utf8')
verifyPointCloudSource(engine)
const start = engine.indexOf('  async loadNodeData(info, signal, attributesAndSlots) {')
const end = engine.indexOf('\n  }\n', start)
assert.ok(start >= 0 && end > start)
const method = engine.slice(start, end + 4)
// Execute the EXACT installed loading method with deterministic source promises.
// Only its surrounding scene/mesh methods are a small test harness. Full real
// engine construction, rendering and Worker ownership remain browser tests.
const PointCloud = new Function(`return class PointCloud {
  constructor(options) {
    this.source = options.source;
    this.meshes = []; this.reloads = 0; this.disposals = 0;
    this._stateMachine = { transition(info, state) { info.state = state; } };
  }
  createMesh(data) { const mesh = { data }; this.meshes.push(mesh); return mesh; }
  onObjectCreated() {}
  clear() { this.reloads++; }
  dispose() { this.disposals++; }
  ${method}
}`)()
function harness(t) {
  const errors = []
  t.mock.method(console, 'error', (...args) => errors.push(args))
  const jobs = []
  class Source {
    getNodeData(params) {
      return new Promise((resolve, reject) => jobs.push({ params, resolve, reject }))
    }
  }
  const source = createPointSourceWithCancellation(Source, {})
  const point = createPointCloudWithCancellation(PointCloud, { source })
  const info = (id) => ({ node: { id, volume: {} }, positionDirty: true, state: 'loading' })
  return { ...point, source, jobs, errors, info }
}

test('PointCloud lifecycle rejects an unreviewed engine instead of accepting changed internals', () => {
  assert.doesNotThrow(() => verifyPointCloudSource(engine))
  assert.throws(() => verifyPointCloudSource(engine + '\n'), /Unreviewed/)
  assert.throws(() => createPointCloudWithCancellation(class {}, {}), /reviewed PointCloud/)
})

test('installed loading method preserves successful data, public clear and subclass identity', async (t) => {
  const { entity, source, stop, jobs, errors, info } = harness(t)
  const node = new AbortController(),
    item = info('visible')
  assert.ok(entity instanceof PointCloud)
  assert.equal(entity.source, source)
  entity.clear()
  assert.equal(entity.reloads, 1)
  const pending = entity.loadNodeData(item, node.signal, [])
  assert.equal(jobs.length, 1)
  const data = { pointCount: 4 }
  jobs[0].resolve(data)
  await pending
  assert.equal(item.state, 'displayed')
  assert.equal(entity.meshes[0].data, data)
  assert.equal(getEventListeners(node.signal, 'abort').length, 0)
  stop()
  stop()
  entity.clear()
  assert.equal(entity.frozen, true)
  assert.equal(entity.reloads, 1, 'Closing must never invoke the reload API')
  assert.deepEqual(errors, [])
})

test('owner cancellation reaches running loads and queued loads never touch the source', async (t) => {
  const { entity, stop, jobs, errors, info } = harness(t)
  const node = new AbortController()
  const pending = entity.loadNodeData(info('running'), node.signal, [])
  stop()
  assert.equal(jobs[0].params.signal.aborted, true)
  assert.equal(jobs[0].params.signal.reason.message, 'aborted')
  assert.equal(node.signal.aborted, false, 'The caller signal must not be mutated')
  // Real pool/network teardown can reject with a different, secondary reason.
  jobs[0].reject(new DOMException('Geo3D viewer disposed.', 'AbortError'))
  await pending
  await entity.loadNodeData(info('queued'), new AbortController().signal, [])
  assert.equal(jobs.length, 1)
  assert.equal(entity.meshes.length, 0)
  assert.equal(getEventListeners(node.signal, 'abort').length, 0)
  assert.deepEqual(errors, [])
})

test('owner abort between source fulfillment and engine continuation prevents late geometry', async (t) => {
  const { entity, stop, jobs, errors, info } = harness(t)
  const pending = entity.loadNodeData(info('late'), new AbortController().signal, [])
  jobs[0].resolve({ pointCount: 4 })
  // Source-wrapper continuation runs first; the engine continuation runs after
  // this abort. Checking only inside source.getNodeData cannot close this race.
  queueMicrotask(stop)
  await pending
  assert.equal(entity.meshes.length, 0)
  assert.deepEqual(errors, [])
})

test('node cancellation leaves another request and another viewer alive', async (t) => {
  const { entity, stop, source, jobs, errors, info } = harness(t)
  const other = createPointCloudWithCancellation(PointCloud, { source })
  const a = new AbortController(),
    b = new AbortController(),
    c = new AbortController()
  const pendingA = entity.loadNodeData(info('a'), a.signal, [])
  const pendingB = entity.loadNodeData(info('b'), b.signal, [])
  const pendingC = other.entity.loadNodeData(info('c'), c.signal, [])
  const reason = new DOMException('Application cancelled only a node', 'AbortError')
  a.abort(reason)
  assert.equal(a.signal.reason, reason)
  assert.equal(jobs[0].params.signal.aborted, true)
  assert.equal(jobs[1].params.signal.aborted, false)
  assert.equal(jobs[2].params.signal.aborted, false)
  jobs[0].reject(reason)
  jobs[1].resolve({ pointCount: 2 })
  await Promise.all([pendingA, pendingB])
  stop()
  assert.equal(jobs[2].params.signal.aborted, false, 'A must not cancel B')
  jobs[2].resolve({ pointCount: 3 })
  await pendingC
  assert.equal(entity.meshes.length, 1)
  assert.equal(other.entity.meshes.length, 1)
  other.stop()
  for (const controller of [a, b, c])
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
  assert.deepEqual(errors, [])
})

test('real decoder failures remain visible to the installed PointCloud error path', async (t) => {
  const { entity, stop, jobs, errors, info } = harness(t)
  const failure = new Error('Malformed point payload')
  const pending = entity.loadNodeData(info('corrupt'), new AbortController().signal, [])
  jobs[0].reject(failure)
  await pending
  assert.deepEqual(errors, [[failure]])
  assert.equal(entity.meshes.length, 0)
  stop()
})

test('pre-aborted nodes allocate no source work or listeners', async (t) => {
  const { entity, stop, jobs, errors, info } = harness(t)
  const node = new AbortController()
  node.abort()
  await entity.loadNodeData(info('pre-aborted'), node.signal, [])
  assert.equal(jobs.length, 0)
  assert.equal(getEventListeners(node.signal, 'abort').length, 0)
  assert.deepEqual(errors, [])
  stop()
})

test('a throwing frozen listener cannot skip cancellation or base disposal', async (t) => {
  const { entity, jobs, errors, info } = harness(t)
  Object.defineProperty(entity, 'frozen', {
    set() {
      throw new Error('host frozen listener')
    }
  })
  const pending = entity.loadNodeData(info('closing'), new AbortController().signal, [])
  assert.throws(() => entity.dispose(), /host frozen listener/)
  assert.equal(entity.disposals, 1)
  assert.equal(jobs[0].params.signal.aborted, true)
  jobs[0].reject(new Error('pool already disposed'))
  await pending
  assert.equal(entity.meshes.length, 0)
  assert.deepEqual(errors, [])
})

test('built factory preserves the host engine import and runtime installs stop before add', async () => {
  const built = await readFile(new URL('../dist/geo3dPointFactories.js', import.meta.url), 'utf8')
  assert.match(built, /from ["']@giro3d\/giro3d\/entities\/PointCloud\.js["']/)
  assert.match(built, /createOwnedPointCloud/)
  const runtime = (
    await readFile(new URL('../src/geo3dRuntime.ts', import.meta.url), 'utf8')
  ).replace(/\s+/g, '')
  const stop = runtime.indexOf('stopPointRequests=point.stop')
  assert.ok(stop >= 0 && stop < runtime.indexOf('awaitcurrent.add(pointEntity)'))
  assert.doesNotMatch(runtime, /pointEntity\.clear\(/)
  // Source ownership generation must never modify the installed peer.
  assert.equal(
    await readFile(require.resolve('@giro3d/giro3d/entities/PointCloud.js'), 'utf8'),
    engine
  )
})

const sourceBase = await readFile(
  require.resolve('@giro3d/giro3d/sources/PointCloudSource.js'),
  'utf8'
)
verifyPointSourceInitialization(sourceBase)
const initStart = sourceBase.indexOf('  initialize() {')
const initEnd = sourceBase.indexOf('\n  }\n', initStart)
assert.ok(initStart >= 0 && initEnd > initStart)
const installedInitialize = sourceBase.slice(initStart, initEnd + 4)

test('source initialization rejects an unreviewed base implementation', () => {
  assert.doesNotThrow(() => verifyPointSourceInitialization(sourceBase))
  assert.throws(() => verifyPointSourceInitialization(sourceBase + '\n'), /Unreviewed/)
})

test('initialization is single-flight, reentrant and signals ready exactly once', async () => {
  const reentered = [],
    events = []
  let calls = 0
  class Source {
    _initializePromise = null
    _ready = false
    get ready() {
      return this._ready
    }
    initializeOnce() {
      calls++
      reentered.push(this.initialize())
      return this
    }
    dispatchEvent(event) {
      events.push(event)
      reentered.push(this.initialize())
    }
  }
  const source = createPointSourceWithCancellation(Source, {})
  const promise = source.initialize()
  assert.equal(source.initialize(), promise)
  assert.equal(source.ready, false)
  assert.equal(await promise, source)
  assert.equal(source.ready, true)
  assert.equal(calls, 1)
  assert.deepEqual(events, [{ type: 'initialized' }])
  assert.deepEqual(reentered, [promise, promise])
  assert.equal(source.initialize(), promise)
})

for (const kind of ['AbortError', 'Error']) {
  test(`handled ${kind} initialization has no detached rejection; installed negative control fails`, () => {
    // A separate strict process makes unhandled rejection detection independent
    // of the test runner's own event handlers. The negative control executes the
    // exact pinned base method that caused the real pending-COPC browser failure.
    const script = (fixed) => `
import assert from 'node:assert/strict';
import { createPointSourceWithCancellation } from ${JSON.stringify(new URL('./build-geo3d-point-adapters.mjs', import.meta.url).href)};
const reason = ${kind === 'AbortError' ? "new DOMException('retained initialization failure', 'AbortError')" : "new Error('retained initialization failure')"};
class Source {
  _initializePromise = null;
  _ready = false;
  initializeOnce() { return Promise.reject(reason); }
  dispatchEvent() { throw new Error('Failed source must not announce readiness'); }
  ${installedInitialize}
}
const source = ${fixed ? 'createPointSourceWithCancellation(Source, {})' : 'new Source()'};
const promise = source.initialize();
assert.equal(source.initialize(), promise);
await assert.rejects(promise, error => error === reason);
assert.equal(source._ready, false);
await new Promise(resolve => setImmediate(resolve));
`
    const run = (fixed) =>
      spawnSync(
        process.execPath,
        ['--unhandled-rejections=strict', '--input-type=module', '-e', script(fixed)],
        { encoding: 'utf8', timeout: 10000 }
      )
    const broken = run(false)
    assert.equal(broken.error, undefined)
    assert.notEqual(
      broken.status,
      0,
      'Negative control must demonstrate the installed detached rejection'
    )
    assert.match(broken.stderr, /retained initialization failure/)
    const fixed = run(true)
    assert.equal(fixed.error, undefined)
    assert.equal(fixed.status, 0, fixed.stderr)
    assert.equal(fixed.stderr, '')
  })
}

test('synchronous initialization failure rejects the same retained promise', async () => {
  const failure = new Error('Synchronous initialization failure')
  class Source {
    initializeOnce() {
      throw failure
    }
  }
  const source = createPointSourceWithCancellation(Source, {})
  let promise
  assert.doesNotThrow(() => {
    promise = source.initialize()
  })
  assert.equal(source.initialize(), promise)
  await assert.rejects(promise, (error) => error === failure)
})

test('an initialized listener failure is returned to the caller, not detached', async () => {
  const failure = new Error('Host initialization listener failed')
  class Source {
    initializeOnce() {
      return this
    }
    dispatchEvent() {
      throw failure
    }
  }
  const source = createPointSourceWithCancellation(Source, {})
  const promise = source.initialize()
  await assert.rejects(promise, (error) => error === failure)
  assert.equal(source.initialize(), promise)
  assert.equal(
    source._ready,
    true,
    'The initialized state precedes the event as in the pinned engine'
  )
})

test('a rejected initialization cannot invalidate another source or a fresh source', async () => {
  const reason = new Error('Only A failed')
  class Source {
    constructor(options) {
      this.error = options.error
      this.events = []
    }
    initializeOnce() {
      if (this.error) throw this.error
      return this
    }
    dispatchEvent(event) {
      this.events.push(event)
    }
  }
  const a = createPointSourceWithCancellation(Source, { error: reason })
  const b = createPointSourceWithCancellation(Source, {})
  const results = await Promise.allSettled([a.initialize(), b.initialize()])
  assert.equal(results[0].reason, reason)
  assert.equal(results[1].value, b)
  assert.deepEqual(a.events, [])
  assert.deepEqual(b.events, [{ type: 'initialized' }])
  const c = createPointSourceWithCancellation(Source, {})
  assert.equal(await c.initialize(), c)
})
