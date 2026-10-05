/** Pack built output and exercise a physical npm consumer outside this workspace. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync } from 'node:fs'
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../../../..')
const output = join(root, 'output/geo3d-browser'), proof = join(root, 'output/geo3d-focused/installed-consumer')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const inside = (path, directory) => path === directory || path.startsWith(directory + sep)
const report = { status: 'running', checks: [], packages: [], commands: [], limitations: [
  'Compiler, bundler, browser driver and test fixtures come from the checkout; runtime modules must resolve physically inside the installed consumer.',
  'The fresh npm resolution has its own retained package-lock.json; it is not the workspace lockfile or a production-scale benchmark.',
] }
await mkdir(join(proof, 'tarballs'), { recursive: true })
await mkdir(join(proof, 'consumer'), { recursive: true })
await mkdir(output, { recursive: true })
const temp = await mkdtemp(join(tmpdir(), 'file-viewer-geo3d-installed-'))
const consumer = join(temp, 'consumer'), tarballs = join(temp, 'tarballs'), childOutput = join(consumer, 'browser-evidence')
assert.ok(!inside(await realpath(temp), await realpath(root)), 'Consumer must not be inside the checkout')
await mkdir(consumer); await mkdir(tarballs)

async function run(label, command, args, cwd, env = process.env) {
  const logPath = join(proof, `${label}.log`)
  const log = createWriteStream(logPath)
  let tail = '', spawnError, timedOut = false, logError
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  const capture = bytes => { log.write(bytes); tail = (tail + bytes.toString('utf8')).slice(-10000) }
  child.stdout.on('data', capture); child.stderr.on('data', capture)
  child.on('error', error => { spawnError = error })
  log.on('error', error => { logError = error; child.kill('SIGKILL') })
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL') }, 10 * 60 * 1000)
  const exit = await new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })))
  clearTimeout(timer)
  if (!logError) await new Promise(resolve => log.end(resolve))
  report.commands.push({ label, command, exit, timedOut, log: basename(logPath) })
  if (spawnError || logError || timedOut || exit.code !== 0) {
    throw new Error(`${label} failed: ${spawnError || logError || (timedOut ? 'command deadline' : `exit ${exit.code}`)}\n${tail}`)
  }
  console.log(`GEO3D_INSTALLED_STEP ${label} passed`)
}
const passed = (name, details = {}) => { report.checks.push({ name, status: 'passed', ...details }) }
const rendererRequire = createRequire(resolve(here, '../package.json'))
const typescript = rendererRequire('typescript')

try {
  // pnpm rewrites workspace protocol versions in the tarballs. No adapter build
  // or lifecycle install script is run in the consumer; it receives compiled files.
  const localPackages = ['packages/core', 'packages/renderers/geometry-engine', 'packages/renderers/3d']
  for (const path of localPackages) {
    const folder = join(root, path), metadata = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'))
    const before = new Set(await readdir(tarballs))
    await run(`pack-${metadata.name.split('/').pop()}`, 'pnpm', ['pack', '--pack-destination', tarballs], folder,
      { ...process.env, npm_config_ignore_scripts: 'true' })
    const added = (await readdir(tarballs)).filter(name => name.endsWith('.tgz') && !before.has(name))
    assert.equal(added.length, 1, `Expected exactly one tarball for ${metadata.name}`)
    const file = join(tarballs, added[0]), bytes = await readFile(file)
    report.packages.push({ name: metadata.name, version: metadata.version, tarball: added[0], bytes: bytes.length, sha256: sha256(bytes) })
    await copyFile(file, join(proof, 'tarballs', added[0]))
  }
  passed('built tarballs retained with exact hashes')
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'geo3d-installed-consumer-proof', version: '1.0.0', private: true, type: 'module' }, null, 2))
  await writeFile(join(temp, 'user.npmrc'), '')
  await writeFile(join(temp, 'global.npmrc'), '')
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key) && !['NODE_PATH', 'NPM_TOKEN', 'NODE_AUTH_TOKEN'].includes(key)))
  Object.assign(env, { npm_config_userconfig: join(temp, 'user.npmrc'), npm_config_globalconfig: join(temp, 'global.npmrc') })
  const npmFlags = ['--ignore-scripts', '--no-audit', '--no-fund', '--strict-peer-deps', '--registry=https://registry.npmjs.org/']
  await run('install-without-optional-peers', 'npm', ['install', '--save-exact', ...npmFlags, ...report.packages.map(pkg => join(tarballs, pkg.tarball))], consumer, env)
  const absent = ['@giro3d/giro3d', 'jszip', '@thatopen/components', '@thatopen/fragments', 'web-ifc']
  for (const name of absent) assert.equal(existsSync(join(consumer, 'node_modules', name)), false, `Optional peer ${name} was installed implicitly`)
  const lazyProbe = join(consumer, 'lazy-entry.mjs')
  await writeFile(lazyProbe, `import assert from 'node:assert/strict';
await import('@file-viewer/renderer-3d');
const {createGeo3dRenderer}=await import('@file-viewer/renderer-3d/geo3d');
assert.equal(typeof createGeo3dRenderer,'function');
assert.ok(createGeo3dRenderer());
console.log('Both public entries imported with all optional specialist peers absent');
`)
  await run('lazy-public-entries', process.execPath, [lazyProbe], consumer, env)
  passed('public entries are lazy without optional peers', { absent })
  const threeTypesVersion = rendererRequire('@types/three/package.json').version
  await run('install-explicit-geo3d-peers', 'npm', ['install', '--save-exact', ...npmFlags, '@giro3d/giro3d@2.0.4', 'jszip@3.10.2', `@types/three@${threeTypesVersion}`], consumer, env)
  // Reinstall solely from the newly captured consumer lock before exercising it.
  await run('clean-lockfile-install', 'npm', ['ci', ...npmFlags], consumer, env)
  for (const filename of ['package.json', 'package-lock.json']) await copyFile(join(consumer, filename), join(proof, 'consumer', filename))
  report.lockSha256 = sha256(await readFile(join(consumer, 'package-lock.json')))
  const consumerRequire = createRequire(join(consumer, 'package.json'))
  const installed = join(consumer, 'node_modules/@file-viewer/renderer-3d')
  for (const pkg of report.packages) {
    const folder = join(consumer, 'node_modules', pkg.name)
    assert.equal((await lstat(folder)).isSymbolicLink(), false, `${pkg.name} must be installed, not workspace-linked`)
    assert.ok(inside(await realpath(folder), consumer))
    const metadata = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'))
    assert.equal(metadata.version, pkg.version)
    assert.ok(!Object.values(metadata.dependencies || {}).some(value => value.startsWith('workspace:')), 'Packed manifest retained workspace protocol')
  }
  for (const path of ['src', 'scripts']) assert.equal(existsSync(join(installed, path)), false, `Development ${path} unexpectedly shipped`)
  const manifest = JSON.parse(await readFile(join(installed, 'dist/geo3d-workers/manifest.json'), 'utf8'))
  assert.equal(sha256(await readFile(join(installed, 'dist/geo3dPointFactories.js'))), manifest.adapterSha256)
  assert.equal(sha256(await readFile(join(installed, 'dist/geo3dRasterFactories.js'))), manifest.raster.factorySha256)
  const giroRoot = dirname(dirname(consumerRequire.resolve('@giro3d/giro3d/core/Instance.js')))
  assert.equal(JSON.parse(await readFile(join(giroRoot, 'package.json'), 'utf8')).version, '2.0.4')
  const engineFiles = { LASSource: 'sources/LASSource.js', COPCSource: 'sources/COPCSource.js', PointCloud: 'entities/PointCloud.js', PointCloudSource: 'sources/PointCloudSource.js', worker: 'sources/las/worker.js' }
  for (const [name, path] of Object.entries(engineFiles)) assert.equal(sha256(await readFile(join(giroRoot, path))), manifest.sourceHashes[name], `Installed engine drift: ${name}`)
  passed('physical installed factories and reviewed engine hashes', { engine: '2.0.4', sourceAndBuildScriptsAbsent: true, adapterSha256: manifest.adapterSha256, rasterSha256: manifest.raster.factorySha256 })

  const fixture = join(consumer, 'geo3d-consumer.mts')
  await copyFile(resolve(here, '../test/types/geo3d-consumer.mts'), fixture)
  const diagnostics = []
  for (const mode of ['NodeNext', 'Bundler']) {
    const ts = typescript
    const program = ts.createProgram([fixture], { target: ts.ScriptTarget.ES2022,
      module: mode === 'NodeNext' ? ts.ModuleKind.NodeNext : ts.ModuleKind.ESNext,
      moduleResolution: mode === 'NodeNext' ? ts.ModuleResolutionKind.NodeNext : ts.ModuleResolutionKind.Bundler,
      strict: true, noEmit: true, skipLibCheck: true, types: [], lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    })
    const errors = ts.getPreEmitDiagnostics(program)
    diagnostics.push({ mode, count: errors.length })
    if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: path => path, getCurrentDirectory: () => consumer, getNewLine: () => '\n' }))
    assert.ok(program.getSourceFiles().some(file => file.fileName === join(installed, 'dist/geo3dRuntime.d.ts')), 'Public API fixture did not resolve the installed declarations')
    for (const file of program.getSourceFiles()) {
      if (file.fileName.includes('geo3d') && !inside(file.fileName, consumer)) throw new Error(`Type check escaped the installed consumer: ${file.fileName}`)
    }
  }
  passed('installed public TypeScript API', { diagnostics, thirdPartyDeclarationInternalsSkipped: true })
  await copyFile(fixture, join(proof, 'consumer/geo3d-consumer.mts'))

  const assets = join(consumer, 'deployment/nested/assets/geo3d')
  await mkdir(assets, { recursive: true }); await writeFile(join(assets, 'host-owned.txt'), 'keep host data')
  await run('installed-asset-copy-cli', process.execPath, [join(installed, 'bin/copy-geo3d-assets.mjs'), assets], consumer, env)
  assert.equal(await readFile(join(assets, 'host-owned.txt'), 'utf8'), 'keep host data')
  for (const path of ['workers/las-worker.js', 'workers/geotiff-worker.js', 'workers/texture-worker.js', 'laz-perf/laz-perf.wasm', 'three/draco/draco_decoder.wasm', 'three/basis/basis_transcoder.wasm']) {
    assert.ok((await readFile(join(assets, path))).length > 0, `Missing installed asset ${path}`)
  }
  passed('installed asset-copy command and custom deployment path')

  const browserRunner = join(consumer, 'run-browser-suites.mjs')
  await writeFile(browserRunner, `await import(${JSON.stringify(new URL('./verify-geo3d-browser-scenarios.mjs', import.meta.url).href)});\nawait import(${JSON.stringify(new URL('./verify-geo3d-concurrent.mjs', import.meta.url).href)});\n`)
  await run('installed-browser-suites', process.execPath, [browserRunner], consumer, {
    ...env, GEO3D_TEST_PACKAGE_ROOT: installed, GEO3D_TEST_CONSUMER_ROOT: consumer, GEO3D_TEST_OUTPUT: childOutput,
  })
  const browser = JSON.parse(await readFile(join(childOutput, 'report.json'), 'utf8'))
  assert.equal(browser.status, 'passed'); assert.equal(browser.concurrency?.status, 'passed')
  assert.equal(browser.cases.length, 13); assert.equal(browser.concurrency.cases.length, 10)
  assert.deepEqual(browser.concurrency.notRun, [])
  for (const suite of ['datasets', 'concurrent']) {
    const graph = JSON.parse(await readFile(join(childOutput, `${suite}-module-graph.json`), 'utf8'))
    assert.equal(graph.installedConsumer, true)
    assert.equal(graph.rendererPackageRoot, await realpath(installed))
    assert.ok(graph.modules.length > 0)
  }
  passed('same 13 dataset and 10 concurrent/abort cases against installed bytes', { datasetCases: 13, concurrencyCases: 10, workspaceRuntimeModules: 0 })
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'; report.failure = String(error)
  throw error
} finally {
  try {
    if (existsSync(join(childOutput, 'report.json'))) report.browser = JSON.parse(await readFile(join(childOutput, 'report.json'), 'utf8'))
    if (existsSync(childOutput)) {
      for (const filename of await readdir(childOutput)) {
        if (filename.endsWith('.png')) await copyFile(join(childOutput, filename), join(output, `installed-${filename}`))
        else if (filename.endsWith('-module-graph.json')) await copyFile(join(childOutput, filename), join(proof, filename))
      }
    }
    await writeFile(join(proof, 'report.json'), JSON.stringify(report, null, 2) + '\n')
    const existing = JSON.parse(await readFile(join(output, 'report.json'), 'utf8'))
    existing.installedConsumer = report
    if (report.status !== 'passed') existing.status = 'failed'
    await writeFile(join(output, 'report.json'), JSON.stringify(existing, null, 2) + '\n')
    console.log('GEO3D_INSTALLED_SUMMARY', JSON.stringify({ status: report.status, checks: report.checks, packages: report.packages, lockSha256: report.lockSha256, failure: report.failure }))
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}
