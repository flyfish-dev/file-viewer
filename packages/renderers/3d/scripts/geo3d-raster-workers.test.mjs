import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { adaptGeoTIFFSource, adaptTextureGenerator, copyRasterPackageLicenses, extractTextureWorker } from './build-geo3d-raster-adapters.mjs'
const require = createRequire(import.meta.url)

test('raster factories retain engine APIs but isolate both pools', async () => {
  const source = await readFile(require.resolve('@giro3d/giro3d/sources/GeoTIFFSource.js'), 'utf8')
  const texture = await readFile(require.resolve('@giro3d/giro3d/utils/TextureGenerator.js'), 'utf8')
  const a = adaptGeoTIFFSource(source), b = adaptTextureGenerator(texture)
  assert.match(a, /export function createGeoTIFFSource\(workers, options\)/)
  assert.match(a, /workers\.dispose\(\)/)
  assert.match(a, /workers\.combineSignal\(signal\)/)
  assert.match(a, /texture\.dispose\(\); throw workers\.signal\.reason/)
  assert.ok(!a.includes("import TextureGenerator from"))
  assert.ok(!a.includes(', Pool }'))
  assert.ok(!b.includes('new Worker('))
  assert.ok(!b.includes('URL.createObjectURL'))
  assert.match(b, /function getDecoderPool\(\) \{ return pool; \}/)
  assert.match(extractTextureWorker(texture), /CreatePixelBuffer/)
  assert.throws(() => adaptGeoTIFFSource(source + '\n'), /Unreviewed/)
  assert.throws(() => adaptTextureGenerator(texture + '\n'), /Unreviewed/)
})

test('the built raster workers are shipped as hash-matched static assets', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/geo3d-workers/manifest.json', import.meta.url)))
  assert.deepEqual(Object.keys(manifest.raster.files).sort(), ['geotiff-worker.js', 'texture-worker.js'])
  for (const [name, digest] of Object.entries(manifest.raster.files)) {
    const bytes = await readFile(new URL(`../dist/geo3d-workers/${name}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest)
    assert.ok(bytes.length > 1000)
  }
  assert.ok(manifest.raster.packages.every(pkg => pkg.files.length > 0))
  const lerc = manifest.raster.packages.find(pkg => pkg.name === 'lerc')
  assert.ok(lerc, 'The bundled Lerc decoder must retain its legal files')
  assert.equal(lerc.version, '3.0.0')
  assert.deepEqual(lerc.files, ['lerc-LICENSE', 'lerc-NOTICE'])
  for (const pkg of manifest.raster.packages) {
    for (const name of pkg.files) {
      const bytes = await readFile(new URL(`../dist/geo3d-workers/raster-licenses/${name}`, import.meta.url))
      assert.equal(createHash('sha256').update(bytes).digest('hex'), pkg.sha256[name])
    }
  }
})

const lercMetadata = { name: 'lerc', version: '3.0.0', license: 'Apache-2.0' }
const lercUpstreamBlobs = {
  'lerc-LICENSE': '863d15091ebca6473a211f9d99a0051502f63d8b',
  'lerc-NOTICE': '826163b3f97fc3c5c417ae72440e263927e99163',
}
function assertLercUpstreamBytes(name, bytes) {
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
  assert.equal(blob, lercUpstreamBlobs[name], `${name} must match its reviewed upstream blob`)
}
async function licenseFixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'geo3d-raster-licenses-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const folder = join(root, 'package'), output = join(root, 'output')
  await mkdir(folder)
  return { root, folder, output }
}

test('missing Lerc package license uses exact retained LICENSE and NOTICE offline', async t => {
  const { folder, output } = await licenseFixture(t)
  const result = await copyRasterPackageLicenses({ folder, metadata: lercMetadata }, output)
  assert.deepEqual(result.files, ['lerc-LICENSE', 'lerc-NOTICE'])
  assert.equal(result.license, 'Apache-2.0')
  for (const name of result.files) {
    const bytes = await readFile(join(output, name))
    assertLercUpstreamBytes(name, bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), result.sha256[name])
  }
})

test('Lerc fallback restores exact upstream bytes from LF and CRLF checkouts', async t => {
  for (const lineEnding of ['\n', '\r\n']) {
    const { root, folder, output } = await licenseFixture(t)
    const retained = join(root, 'retained')
    await mkdir(retained)
    const inputs = new Map()
    for (const name of Object.keys(lercUpstreamBlobs)) {
      const original = await readFile(new URL(`../licenses/${name}`, import.meta.url), 'utf8')
      const input = Buffer.from(original.replace(/\r\n/g, '\n').replace(/\n/g, lineEnding))
      inputs.set(name, input)
      await writeFile(join(retained, name), input)
    }
    const result = await copyRasterPackageLicenses({ folder, metadata: lercMetadata }, output, retained)
    assert.deepEqual(result.files, Object.keys(lercUpstreamBlobs))
    for (const [name, input] of inputs) {
      const bytes = await readFile(join(output, name))
      assertLercUpstreamBytes(name, bytes)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), result.sha256[name])
      assert.deepEqual(await readFile(join(retained, name)), input, 'Checkout files must remain unchanged')
    }
  }
})

test('raster license collection preserves packaged LICENSE and NOTICE', async t => {
  const { root, folder, output } = await licenseFixture(t)
  await writeFile(join(folder, 'LICENSE.txt'), 'Test package license\n')
  await writeFile(join(folder, 'NOTICE'), 'Test package attribution\n')
  await writeFile(join(folder, 'README.md'), 'Not a license\n')
  const metadata = { name: '@test/decoder', version: '1.0.0', license: 'MIT' }
  const result = await copyRasterPackageLicenses({ folder, metadata }, output, join(root, 'absent-fallback'))
  assert.deepEqual(result.files, ['_test_decoder-LICENSE.txt', '_test_decoder-NOTICE'])
  assert.equal(await readFile(join(output, result.files[1]), 'utf8'), 'Test package attribution\n')
})

test('raster license fallback rejects unreviewed names, versions and declarations', async t => {
  const { folder, output } = await licenseFixture(t)
  for (const metadata of [
    { ...lercMetadata, name: 'another-decoder' },
    { ...lercMetadata, version: '3.0.1' },
    { ...lercMetadata, license: 'MIT' },
    { name: 'lerc', version: '3.0.0' },
  ]) {
    await assert.rejects(copyRasterPackageLicenses({ folder, metadata }, output), /Missing raster decoder license/)
  }
})

test('NOTICE alone is not accepted as a raster decoder license', async t => {
  const { folder, output } = await licenseFixture(t)
  await writeFile(join(folder, 'NOTICE'), 'Attribution is not the full license\n')
  const metadata = { name: 'another-decoder', version: '1.0.0', license: 'MIT' }
  await assert.rejects(copyRasterPackageLicenses({ folder, metadata }, output), /Missing raster decoder license/)
})

test('altered retained Lerc LICENSE or NOTICE fails closed before copying', async t => {
  const { root, folder, output } = await licenseFixture(t)
  const retained = join(root, 'retained')
  await mkdir(retained)
  const originals = new Map()
  for (const name of ['lerc-LICENSE', 'lerc-NOTICE']) {
    const bytes = await readFile(new URL(`../licenses/${name}`, import.meta.url))
    originals.set(name, bytes)
    await writeFile(join(retained, name), bytes)
  }
  for (const [name, bytes] of originals) {
    await writeFile(join(retained, name), Buffer.concat([bytes, Buffer.from('\nchanged\n')]))
    await assert.rejects(copyRasterPackageLicenses({ folder, metadata: lercMetadata }, output, retained), /Unreviewed raster decoder legal file/)
    await assert.rejects(readFile(join(output, 'lerc-LICENSE')), { code: 'ENOENT' })
    await writeFile(join(retained, name), bytes)
  }
})

test('owned raster scheduler binds geotiff parameters and settles aborts', async t => {
  const { createGeo3dRasterWorkers } = await import('../dist/geo3dRasterWorkers.js')
  const NativeWorker = globalThis.Worker, originalDocument = globalThis.document
  const workers = []
  class TestWorker extends EventTarget {
    constructor(url) { super(); this.url = String(url); this.terminated = false; workers.push(this) }
    postMessage(data) { this.data = data }
    terminate() { this.terminated = true }
    respond(payload) { this.dispatchEvent(new MessageEvent('message', { data: { requestId: this.data.id, payload } })) }
  }
  globalThis.Worker = TestWorker
  globalThis.document = { baseURI: 'https://local.invalid/app/' }
  t.after(() => { globalThis.Worker = NativeWorker; globalThis.document = originalDocument })
  const controllerA = new AbortController(), controllerB = new AbortController()
  const a = createGeo3dRasterWorkers('/nested/geo3d/', controllerA.signal)
  const b = createGeo3dRasterWorkers('/nested/geo3d/', controllerB.signal)
  t.after(() => { a.dispose(); b.dispose() })
  assert.equal(workers.length, 0)
  const buffer = new ArrayBuffer(8)
  const cancelled = assert.rejects(a.decoder.bindParameters(5, { predictor: 2 }).decode(buffer), /abort/i)
  const active = b.decoder.bindParameters(1, {}).decode(new ArrayBuffer(8))
  const texture = b.texture.queue('CreatePixelBuffer', { value: 1 })
  assert.equal(workers.length, 3)
  assert.equal(workers[0].data.payload.compression, 5)
  assert.deepEqual(workers[0].data.payload.decoderParameters, { predictor: 2 })
  assert.match(workers[0].url, /\/nested\/geo3d\/workers\/geotiff-worker\.js$/)
  assert.match(workers[2].url, /\/nested\/geo3d\/workers\/texture-worker\.js$/)
  controllerA.abort(); await cancelled
  assert.equal(workers[0].terminated, true)
  assert.equal(workers[1].terminated, false)
  workers[1].respond(buffer); workers[2].respond('texture')
  assert.equal(await active, buffer); assert.equal(await texture, 'texture')
  b.dispose(); b.dispose(); assert.ok(workers.every(worker => worker.terminated))
  const request = new AbortController(), c = createGeo3dRasterWorkers('/nested/geo3d/', new AbortController().signal)
  t.after(() => c.dispose())
  const joined = c.combineSignal(request.signal); request.abort(); assert.equal(joined.aborted, true)
  const fresh = c.decoder.bindParameters(1, {}).decode(new ArrayBuffer(1))
  workers.at(-1).respond('fresh'); assert.equal(await fresh, 'fresh')
})
