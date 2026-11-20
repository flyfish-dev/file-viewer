import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawn, execFileSync } from 'node:child_process'
import { createOptionalSdkRegistry } from './optional-sdk-registry.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const fixtures = resolve(import.meta.dirname, '../test/types')
assert.equal(process.argv.length, 3, 'Supply the new exact candidate receipt explicitly')
const receiptPath = resolve(process.argv[2])
const input = JSON.parse(await readFile(receiptPath, 'utf8'))
assert.equal(input.status, 'prepared-for-private-complete-cold-validation')
assert.equal(input.packages.length, 89)
assert.equal(input.releaseApproval, false)
assert.equal(createHash('sha256').update(await readFile(join(root, 'pnpm-lock.yaml'))).digest('hex'), input.lockfileSha256)
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), input.sourceCommit)
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }), '')
const out = await mkdtemp(join(tmpdir(), 'file-viewer-optional-sdk-types-'))
await mkdir(join(out, 'logs'))
const reportPath = join(root, `.release/optional-sdk-strict-report-${input.sourceCommit.slice(0, 12)}.json`)
const report = { schemaVersion: 1, sourceCommit: input.sourceCommit, packReceipt: receiptPath,
  packReceiptSha256: createHash('sha256').update(await readFile(receiptPath)).digest('hex'),
  externalConsumerRoot: out, packageCount: input.packages.length, releaseApproval: false,
  noHostOverrides: true, noAliases: true, noTarballRewrites: true, scope: 'Actual compiled optional SDK contracts, strictly checked with and without genuine peers',
  commands: [], cohorts: [], startedAt: new Date().toISOString() }
const save = async () => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
const packages = new Map()
for (const row of input.packages) {
  const tarball = join(input.output, 'packs', row.tarball)
  const bytes = await readFile(tarball)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256)
  const manifest = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }))
  assert.equal(manifest.name, row.packageName)
  assert.equal(manifest.version, row.version)
  packages.set(row.packageName, { row, tarball, manifest })
}
const server = createOptionalSdkRegistry(packages)
await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok) })
const registry = 'http://127.0.0.1:' + server.address().port
report.privateTemporaryRegistry = registry
const environment = { ...process.env, CI: 'true', npm_config_registry: registry,
  npm_config_userconfig: '/dev/null', npm_config_globalconfig: join(out, 'global.npmrc'),
  npm_config_audit: 'false', npm_config_fund: 'false' }
delete environment.NODE_PATH
delete environment.NODE_OPTIONS
await writeFile(environment.npm_config_globalconfig, '')
async function run(label, command, args, cwd, extraEnv = {}, expectedExitCode = 0) {
  const logfile = join(out, 'logs', label + '.log')
  const startedAt = new Date().toISOString()
  const result = await new Promise((done, reject) => {
    const child = spawn(command, args, { cwd, env: { ...environment, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] })
    const chunks = []
    child.stdout.on('data', chunk => chunks.push(chunk))
    child.stderr.on('data', chunk => chunks.push(chunk))
    child.once('error', reject)
    child.once('close', (code, signal) => done({ code, signal, bytes: Buffer.concat(chunks) }))
  })
  await writeFile(logfile, result.bytes)
  const record = { label, command: [command, ...args], cwd, logfile, exitCode: result.code, expectedExitCode, signal: result.signal, startedAt, finishedAt: new Date().toISOString() }
  report.commands.push(record)
  await save()
  console.log(label + ': exit ' + result.code + ', ' + logfile)
  if (result.code !== expectedExitCode) console.log(result.bytes.toString().slice(-6500))
  return record
}
const metadata = packages.get('@file-viewer/renderer-3d').manifest
const configs = [
  {id: 'without-sdk', peers: {}, fixture: 'without-sdk-consumer.mts', threeTypes: '0.187.0'},
  {id: 'ifc', peers: {'@thatopen/components': metadata.peerDependencies['@thatopen/components'], '@thatopen/fragments': metadata.peerDependencies['@thatopen/fragments'], 'web-ifc': metadata.peerDependencies['web-ifc'], three: '0.187.0'}, fixture: 'ifc-consumer.mts', threeTypes: '0.187.0'},
  {id: 'giro3d', peers: {'@giro3d/giro3d': metadata.peerDependencies['@giro3d/giro3d'], three: '0.180.0'}, fixture: 'geo3d-consumer.mts', threeTypes: '0.185.0'},
]
try {
  for (const config of configs) {
    const project = join(out, config.id)
    const cache = join(project, '.npm-cache')
    await mkdir(project)
    const testDependencies = { typescript: '6.0.3', esbuild: '0.28.2', '@types/node': '26.5.1', '@types/jquery': '4.0.1', '@types/three': config.threeTypes, '@types/react': '19.2.17' }
    // Tool/type hosts are ordinary consumer devDependencies, never replacements for runtime dependencies.
    await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'exact89-' + config.id, version: '1.0.0', private: true, type: 'module', dependencies: { '@file-viewer/renderer-3d': packages.get('@file-viewer/renderer-3d').row.version, ...config.peers }, devDependencies: testDependencies }, null, 2) + '\n')
    const state = { id: config.id, project, directCandidatePackages: ['@file-viewer/renderer-3d'], peers: config.peers, emptyCache: cache }
    report.cohorts.push(state)
    await save()
    const install = await run(config.id + '-cold-install', 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache], project)
    if (install.exitCode) { state.status = 'install-failed'; continue }
    const lock = JSON.parse(await readFile(join(project, 'package-lock.json'), 'utf8'))
    state.installedOwnedPackages = []
    for (const [name, p] of packages) {
      const installed = lock.packages['node_modules/' + name]
      if (installed) {
        assert.equal(installed.version, p.row.version)
        assert.equal(installed.integrity, p.row.integrity)
        state.installedOwnedPackages.push(name)
      }
    }
    state.lockSha256 = createHash('sha256').update(await readFile(join(project, 'package-lock.json'))).digest('hex')
    if (config.id === 'without-sdk') {
      const sdkPaths = Object.keys(lock.packages).filter(path => /(?:^|\/)node_modules\/(?:@giro3d\/giro3d|@thatopen\/components|@thatopen\/fragments|web-ifc)$/.test(path))
      assert.deepEqual(sdkPaths, [], 'The SDK-free consumer must contain no optional SDK installation')
      state.optionalSdkPackagesAbsent = true
    }
    await writeFile(join(project, 'types.mts'), await readFile(join(fixtures, config.fixture)))
    state.fixture = config.fixture
    for (const [name, module, moduleResolution] of [['nodenext', 'NodeNext', 'NodeNext'], ['bundler', 'ESNext', 'Bundler']]) {
      const tsconfig = 'tsconfig.' + name + '.json'
      await writeFile(join(project, tsconfig), JSON.stringify({compilerOptions: {target: 'ESNext', module, moduleResolution, strict: true, skipLibCheck: false, noEmit: true, lib: ['ESNext', 'DOM', 'DOM.Iterable'], types: ['node', 'jquery']}, files: ['types.mts']}, null, 2))
      state[name] = await run(config.id + '-strict-' + name, process.execPath, ['node_modules/typescript/bin/tsc', '-p', tsconfig], project)
    }
    if (config.id === 'without-sdk') {
      await writeFile(join(project, 'assert-no-sdk.mjs'), `import assert from 'node:assert/strict';
import ts from 'typescript';
const config=ts.readConfigFile('tsconfig.nodenext.json',ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());
const program=ts.createProgram(parsed.fileNames,parsed.options);
const leaks=program.getSourceFiles().filter(f=> ['/node_modules/@giro3d/', '/node_modules/@thatopen/', '/node_modules/web-ifc/'].some(path=>f.fileName.includes(path)));
assert.equal(leaks.length,0,'SDK-free declarations must not reach an optional SDK');
console.log('SDK-free declaration graph verified');
`)
      state.declarationIsolation = await run('without-sdk-declaration-isolation', process.execPath, ['assert-no-sdk.mjs'], project)
      await writeFile(join(project, 'inspect-without-sdk.mjs'), "import assert from 'node:assert/strict';\nimport {isCopcLasBuffer} from '@file-viewer/renderer-3d/geo3d/inspect';\nassert.equal(isCopcLasBuffer(new ArrayBuffer(0)),false);\nconsole.log('SDK-free inspection runtime verified');\n")
      state.inspectionRuntime = await run('without-sdk-inspection-runtime', process.execPath, ['inspect-without-sdk.mjs'], project)
      state.missingSdkNegativeCases = []
      for (const [id, entry, symbol, sdkPrefix, count] of [
        ['ifc', 'ifc', 'createIfcRenderer', '@thatopen/', 2],
        ['giro3d', 'geo3d', 'createGeo3dRenderer', '@giro3d/', 11],
      ]) {
        const fixture = `types.missing-${id}.mts`
        await writeFile(join(project, fixture), `import { ${symbol} } from '@file-viewer/renderer-3d/${entry}';\nvoid ${symbol};\n`)
        for (const mode of ['nodenext', 'bundler']) {
          const config = JSON.parse(await readFile(join(project, `tsconfig.${mode}.json`), 'utf8'))
          config.files = [fixture]
          const configPath = `tsconfig.missing-${id}-${mode}.json`
          await writeFile(join(project, configPath), JSON.stringify(config, null, 2))
          const record = await run(`without-sdk-missing-${id}-${mode}`, process.execPath,
            ['node_modules/typescript/bin/tsc', '-p', configPath], project, {}, 2)
          const lines = (await readFile(record.logfile, 'utf8')).split(/\r?\n/).filter(line => /error TS\d+:/.test(line))
          assert.equal(record.exitCode, 2, 'Importing a specialist entry without its required SDK must fail')
          assert.equal(lines.length, count, 'Missing SDK diagnostics must match the actual emitted declaration imports')
          assert.ok(lines.every(line => line.includes('error TS2307: Cannot find module') && line.includes(sdkPrefix)),
            'A missing SDK must give clear module-resolution errors, without unrelated declaration defects')
          state.missingSdkNegativeCases.push({ entry, mode, fixture, configPath, command: record.label,
            expectedDiagnosticCount: count, actualDiagnosticCount: lines.length, diagnosticCode: 'TS2307',
            requiredPeerPrefix: sdkPrefix, passed: true })
          await save()
        }
      }
    }
    state.auditFull = { status: 'not-run', reason: 'Explicit private candidate dependency metadata disclosure authorization pending' }
    state.auditProduction = { status: 'not-run', reason: 'Explicit private candidate dependency metadata disclosure authorization pending' }
    state.status = 'completed'
    await save()
  }
  report.finishedAt = new Date().toISOString()
  report.installCoverage = [...new Set(report.cohorts.flatMap(c => c.installedOwnedPackages || []))].sort()
  report.completeInstallCoverage = report.cohorts.every(c=>c.installedOwnedPackages?.includes('@file-viewer/renderer-3d'))
  report.allCommandsPassed = report.commands.every(c => c.exitCode === c.expectedExitCode)
  await save()
  console.log(JSON.stringify({ report: reportPath, out, installCoverage: report.installCoverage.length, allCommandsPassed: report.allCommandsPassed }))
  if (!report.allCommandsPassed || !report.completeInstallCoverage) process.exitCode = 1
} finally { await new Promise(done => server.close(done)); await save() }
