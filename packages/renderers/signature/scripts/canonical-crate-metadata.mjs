#!/usr/bin/env node
// Cargo's host-sensitive crate identities can alter otherwise identical Wasm LTO.
// This opt-in build control preserves the compiler and every argument except its
// one metadata value. The public policy pins the complete semantic compile unit.
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync, realpathSync } from 'node:fs'
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const helperPath = fileURLToPath(import.meta.url)
const policyPath = resolve(dirname(helperPath), 'canonical-crate-metadata-policy.json')
export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export const stableJson = value => JSON.stringify(value, (_key, item) =>
  item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)
const equal = (actual, expected, message) => assert.equal(stableJson(actual), stableJson(expected), message)
const inside = (file, directory) => file.startsWith(directory + sep)
const sorted = values => [...values].sort()
const cargoPrintQuery = ['-', '--crate-name', '___', '--print=file-names',
  '--crate-type', 'bin', '--crate-type', 'rlib', '--crate-type', 'dylib',
  '--crate-type', 'cdylib', '--crate-type', 'staticlib', '--crate-type', 'proc-macro',
  '--print=sysroot', '--print=split-debuginfo', '--print=crate-name', '--print=cfg', '-Wwarnings']
const options = (args, flag) => args.flatMap((value, index) => {
  if (value === flag) {
    assert(index + 1 < args.length, `Missing ${flag} value`)
    return [args[index + 1]]
  }
  return value.startsWith(flag + '=') ? [value.slice(flag.length + 1)] : []
})
const codegenOptions = args => args.flatMap((value, index) => {
  if (['-C', '--codegen'].includes(value)) return [args[index + 1]]
  if (value.startsWith('-C') && value.length > 2) return [value.slice(2)]
  return value.startsWith('--codegen=') ? [value.slice(10)] : []
})

export function metadataSlots(args) {
  return args.flatMap((value, index) => {
    if (['-C', '--codegen'].includes(value) && args[index + 1]?.startsWith('metadata='))
      return [{ index: index + 1, prefix: 'metadata=', value: args[index + 1].slice(9) }]
    for (const prefix of ['-Cmetadata=', '--codegen=metadata='])
      if (value.startsWith(prefix)) return [{ index, prefix, value: value.slice(prefix.length) }]
    return []
  })
}

export function canonicalLogicalKey(args, { cwd, hostTarget } = {}) {
  const one = (flag, fallback) => {
    const found = options(args, flag)
    if (!found.length && fallback !== undefined) return fallback
    assert.equal(found.length, 1, `Expected exactly one ${flag}`)
    return found[0]
  }
  const sources = args.filter(value => !value.startsWith('-') && value.endsWith('.rs'))
  assert.equal(sources.length, 1, 'Expected exactly one Rust source input')
  let source = sources[0].replaceAll('\\', '/')
  if (cwd && !isAbsolute(source) && /\/registry\/src\//.test(cwd)) source = resolve(cwd, source)
  const registry = /\/registry\/src\/([^/]+)\/([^/]+)\/(.+\.rs)$/.exec(source)
  let sourceKey
  if (registry) sourceKey = { kind: 'registry', index: registry[1], packageVersion: registry[2], relative: registry[3] }
  else {
    if (isAbsolute(source)) {
      const match = /\/packages\/renderers\/signature\/rust\/(.+\.rs)$/.exec(source)
      assert(match, 'Unrecognized absolute non-registry source')
      source = match[1]
    }
    assert(!source.split('/').includes('..'), 'Source escapes the package Rust directory')
    sourceKey = { kind: 'workspace-signature-rust', relative: source }
  }
  const codegen = codegenOptions(args).filter(value => !['metadata', 'extra-filename'].includes(value?.split('=')[0]))
  const key = {
    crateName: one('--crate-name'),
    crateTypes: sorted(options(args, '--crate-type').flatMap(value => value.split(','))),
    target: one('--target', 'host') === hostTarget ? 'host' : one('--target', 'host'), source: sourceKey, edition: one('--edition'),
    emit: sorted(one('--emit').split(',')), cfg: sorted(options(args, '--cfg')),
    checkCfg: sorted(options(args, '--check-cfg')),
    codegenExceptMetadataAndOutputFilename: sorted(codegen),
    externCrateNames: sorted(options(args, '--extern').map(value => value.split('=')[0]))
  }
  return { key, sha256: digest(stableJson(key)) }
}

export function compilerProbeKey(args, context) {
  const cwd = context.cwd
  const owner = /\/registry\/src\/([^/]+)\/([^/]+)$/.exec(cwd || '')
  assert(owner, 'Compiler probe must belong to a locked registry package')
  const stdin = args.includes('-')
  if (!stdin) return canonicalLogicalKey(args, context)
  const names = options(args, '--crate-name')
  assert.equal(names.length, 1)
  assert.match(names[0], /^autocfg_[a-f0-9]+_[0-9]+$/, 'Unknown stdin compiler probe')
  // autocfg's crate-name suffix names a temporary output, not source semantics.
  const normalized = args.map(value => value === '-' ? '__stdin_probe__.rs' : value === names[0] ? 'autocfg_probe' : value)
  if (!options(normalized, '--edition').length) normalized.push('--edition=2015')
  const { key } = canonicalLogicalKey(normalized, context)
  key.source = { kind: 'stdin-compiler-probe', index: owner[1], packageVersion: owner[2] }
  return { key, sha256: digest(stableJson(key)) }
}

export function validateCanonicalPolicy(policy) {
  assert.equal(policy.schemaVersion, 1)
  assert.equal(policy.purpose, 'file-viewer-rpgp-canonical-crate-metadata')
  assert.equal(policy.sources.length, 8, 'Expected eight canonical Rust source inputs')
  assert.equal(policy.stdlib.length, 28, 'Expected complete canonical wasm standard library')
  equal(policy.rustSourceMarkers.map(row => row.path), ['core/src/lib.rs', 'alloc/src/lib.rs', 'std/src/lib.rs'], 'Expected the three standard rust-src roots')
  assert.equal(policy.compileUnits.length, 183, 'Expected complete canonical compile-unit policy')
  const index = new Map()
  for (const row of policy.compileUnits) {
    assert.match(row.canonicalMetadata, /^[a-f0-9]{16}$/)
    assert.equal(row.logicalKeySha256, digest(stableJson(row.logicalKey)), 'Policy logical-key digest changed')
    assert(!index.has(row.logicalKeySha256), 'Ambiguous canonical compile unit')
    index.set(row.logicalKeySha256, row)
  }
  assert.equal(policy.compilerProbes.length, 5, 'Expected the complete normal build-script probe API')
  const probeKeys = new Set()
  for (const row of policy.compilerProbes) {
    assert.equal(row.logicalKeySha256, digest(stableJson(row.logicalKey)))
    assert(!probeKeys.has(row.logicalKeySha256), 'Ambiguous compiler probe')
    probeKeys.add(row.logicalKeySha256)
  }
  return index
}

export function validateCanonicalEnvironment(environment) {
  for (const name of ['RUSTC_WRAPPER', 'RUSTC_WORKSPACE_WRAPPER', 'RUSTC', 'CARGO_TARGET_DIR', 'RUSTFLAGS', 'CARGO_ENCODED_RUSTFLAGS'])
    assert(!environment[name], `Canonical metadata mode conflicts with existing ${name}`)
}

export function validateCanonicalSnapshot(policy, actual) {
  equal(actual.tools, policy.tools, 'Canonical Rust/Cargo compiler commit or release changed')
  equal(actual.sources, policy.sources, 'Canonical Rust source inputs changed')
  equal(actual.stdlib, policy.stdlib, 'Canonical wasm target standard library changed')
  equal(actual.rustSourceMarkers, policy.rustSourceMarkers, 'Canonical rust-src markers changed or missing')
}

export function validateCompilerQuery(args, context) {
  if ([['-vV'], ['--version'], ['--version', '--verbose']].some(template => stableJson(template) === stableJson(args))) return
  const targets = options(args, '--target'), remaps = options(args, '--remap-path-prefix')
  assert(targets.length <= 1, 'Ambiguous compiler query target')
  assert(!targets.length || targets[0] === 'wasm32-unknown-unknown', 'Unknown compiler query target')
  equal(sorted(remaps), targets.length ? sorted(context.remaps) : [], 'Compiler query remaps changed')
  const normalized = []
  for (let index = 0; index < args.length; index++) {
    const value = args[index]
    if (['--target', '--remap-path-prefix'].includes(value)) { index++; continue }
    if (value.startsWith('--target=') || value.startsWith('--remap-path-prefix=')) continue
    normalized.push(value)
  }
  equal(normalized, cargoPrintQuery, 'Unknown compiler query arguments or print kinds')
}

// Validate every argument category. Physical output/dependency paths must stay
// in this isolated target; only the normal privacy remaps are accepted.
function validateCompilerArguments(args, context, key) {
  const suffixes = codegenOptions(args).filter(value => value?.startsWith('extra-filename='))
  assert(suffixes.length <= 1, 'Ambiguous compiler extra-filename')
  if (suffixes.length) assert.match(suffixes[0], /^extra-filename=-[a-f0-9]{16}$/, 'Invalid compiler extra-filename')
  const valued = new Set(['--crate-name', '--crate-type', '--edition', '--emit', '--target', '--cfg', '--check-cfg',
    '--error-format', '--json', '--cap-lints', '--extern', '--out-dir', '--remap-path-prefix',
    '--warn', '--allow', '--deny', '--forbid', '--force-warn', '-C', '--codegen', '-L', '-A', '-W', '-D', '-F'])
  for (let index = 0; index < args.length; index++) {
    const value = args[index]
    if (valued.has(value)) { assert(index + 1 < args.length, 'Missing compiler argument'); index++; continue }
    if ((!value.startsWith('-') && value.endsWith('.rs')) || value === '-') continue
    if ([...valued].some(flag => flag.startsWith('--') && value.startsWith(flag + '='))) continue
    if (/^-(?:C|L|A|W|D|F).+/.test(value)) continue
    assert.fail(`Unknown canonical compiler argument: ${value}`)
  }
  const output = options(args, '--out-dir')
  assert.equal(output.length, 1, 'Expected one isolated compiler output')
  assert(inside(resolve(output[0]), context.targetDirectory), 'Compiler output escaped the isolated target')
  if (key.source.kind === 'workspace-signature-rust') {
    const source = args.find(value => !value.startsWith('-') && value.endsWith('.rs'))
    const expected = resolve(context.rustDir, key.source.relative)
    assert.equal(resolve(context.cwd || context.rustDir, source), expected, 'Workspace compiler source escaped the preflight Rust root')
    assert.equal(realpathSync(expected), expected, 'Workspace compiler source must be the real preflight input')
  } else {
    const owner = resolve(context.registrySourceRoot, key.source.index, key.source.packageVersion)
    if (key.source.kind === 'stdin-compiler-probe')
      assert.equal(realpathSync(context.cwd), owner, 'Compiler probe owner escaped the actual Cargo registry')
    else {
      const source = args.find(value => !value.startsWith('-') && value.endsWith('.rs'))
      const expected = resolve(owner, key.source.relative)
      assert.equal(resolve(context.cwd || context.rustDir, source), expected, 'Registry compiler source escaped the actual Cargo registry')
      assert.equal(realpathSync(expected), expected, 'Registry compiler source must be the real locked input')
    }
  }
  for (const group of options(args, '--extern')) {
    const separator = group.indexOf('=')
    if (separator >= 0)
      assert(inside(realpathSync(group.slice(separator + 1)), context.targetDirectory), 'Extern dependency escaped the isolated target')
  }
  for (let index = 0; index < args.length; index++) {
    const value = args[index] === '-L' ? args[index + 1] : args[index].startsWith('-L') ? args[index].slice(2) : null
    if (value !== null) {
      assert(value.startsWith('dependency='), 'Unexpected canonical native linker search')
      assert(inside(resolve(value.slice(11)), context.targetDirectory), 'Dependency search escaped the isolated target')
    }
  }
  equal(sorted(options(args, '--remap-path-prefix')), key.target === 'host' ? [] : sorted(context.remaps), 'Canonical compiler privacy remaps changed')
}

export function rewriteCanonicalMetadata(args, { policy, context }) {
  const slots = metadataSlots(args)
  if (!slots.length) {
    if (args.some(value => ['-vV', '-V', '--version'].includes(value) || value === '--print' || value.startsWith('--print='))) {
      validateCompilerQuery(args, context)
      return { args: [...args], kind: 'query-passthrough' }
    }
    validateCanonicalPolicy(policy)
    const logical = compilerProbeKey(args, context)
    const probe = policy.compilerProbes.find(row => row.logicalKeySha256 === logical.sha256)
    assert(probe, 'Unknown compiler-probe semantic input or profile')
    equal(logical.key, probe.logicalKey, 'Compiler probe logical key changed')
    validateCompilerArguments(args, context, logical.key)
    for (const input of probe.inputs) {
      const bytes = readFileSync(resolve(context.cwd, input.path))
      assert.equal(bytes.byteLength, input.bytes, 'Compiler probe source size changed')
      assert.equal(digest(bytes), input.sha256, 'Compiler probe source changed')
    }
    return { args: [...args], kind: 'compiler-probe-passthrough', logicalKeySha256: logical.sha256 }
  }
  assert.equal(slots.length, 1, 'Ambiguous compiler metadata slots')
  assert.match(slots[0].value, /^[a-f0-9]{16}$/i, 'Invalid compiler metadata value')
  const index = validateCanonicalPolicy(policy)
  const logical = canonicalLogicalKey(args, context)
  const row = index.get(logical.sha256)
  assert(row, 'Unknown canonical semantic compile unit or profile')
  equal(logical.key, row.logicalKey, 'Canonical semantic logical key changed')
  validateCompilerArguments(args, context, logical.key)
  const actual = [...args]
  actual[slots[0].index] = slots[0].prefix + row.canonicalMetadata
  return { args: actual, kind: 'canonical-metadata', logicalKeySha256: logical.sha256,
    originalMetadata: slots[0].value, actualMetadata: row.canonicalMetadata }
}

const identity = async (directory, name) => {
  const bytes = await readFile(resolve(directory, name))
  return { path: name, bytes: bytes.byteLength, sha256: digest(bytes) }
}
const toolFields = (text, names) => Object.fromEntries(names.map(name => {
  const value = text.split('\n').find(line => line.startsWith(name + ': '))?.slice(name.length + 2)
  assert(value, `Missing real tool identity field ${name}`)
  return [name, value]
}))

export async function prepareCanonicalMetadata({ rustDir, environment }) {
  validateCanonicalEnvironment(environment)
  const policyBytes = await readFile(policyPath), helperBytes = await readFile(helperPath)
  const policy = JSON.parse(policyBytes), policySha256 = digest(policyBytes), helperSha256 = digest(helperBytes)
  validateCanonicalPolicy(policy)
  const inspect = (command, args) => execFileSync(command, args, { cwd: rustDir, env: environment, encoding: 'utf8' }).trim()
  const rustcVersion = inspect('rustc', ['--version', '--verbose'])
  const cargoVersion = inspect('cargo', ['--version', '--verbose'])
  const sysroot = inspect('rustc', ['--print', 'sysroot'])
  const compilerPath = await realpath(resolve(sysroot, 'bin/rustc'))
  const compiler = await identity(dirname(compilerPath), 'rustc')
  const sourceNames = ['Cargo.lock', 'Cargo.toml']
  const walk = async (directory, prefix) => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      assert(!entry.isSymbolicLink(), 'Canonical Rust source symlink is unsupported')
      if (entry.isDirectory()) await walk(resolve(directory, entry.name), `${prefix}${entry.name}/`)
      else if (entry.name.endsWith('.rs')) sourceNames.push(`${prefix}${entry.name}`)
    }
  }
  await walk(resolve(rustDir, 'src'), 'src/')
  const stdlibDir = resolve(sysroot, 'lib/rustlib/wasm32-unknown-unknown/lib')
  const stdlibNames = (await readdir(stdlibDir)).filter(name => /\.(rlib|rmeta)$/.test(name)).sort()
  const rustSourceRoot = resolve(sysroot, 'lib/rustlib/src/rust/library')
  assert((await lstat(rustSourceRoot)).isDirectory(), 'Canonical mode requires the real rust-src component')
  const actual = {
    tools: { rustc: toolFields(rustcVersion, ['release', 'commit-hash', 'LLVM version']), cargo: toolFields(cargoVersion, ['release', 'commit-hash']) },
    sources: await Promise.all(sourceNames.map(name => identity(rustDir, name))),
    stdlib: await Promise.all(stdlibNames.map(name => identity(stdlibDir, name))),
    rustSourceMarkers: await Promise.all(['core/src/lib.rs', 'alloc/src/lib.rs', 'std/src/lib.rs'].map(name => identity(rustSourceRoot, name)))
  }
  validateCanonicalSnapshot(policy, actual)
  const toolchainDigest = digest(stableJson({ rustcVersion, cargoVersion, compiler, stdlib: actual.stdlib, rustSourceMarkers: actual.rustSourceMarkers }))
  const cacheIdentity = digest(stableJson({ policySha256, helperSha256, toolchainDigest }))
  const targetDirectory = resolve(rustDir, `target/canonical-${cacheIdentity}`)
  await mkdir(targetDirectory, { recursive: true })
  assert.equal(await realpath(targetDirectory), targetDirectory, 'Canonical target must not contain symlink parents')
  assert((await lstat(helperPath)).mode & 0o111, 'Canonical compiler wrapper must retain its executable mode')
  const runDirectory = await mkdtemp(resolve(targetDirectory, 'invocation-'))
  const context = { schemaVersion: 1, policySha256, helperSha256, toolchainDigest, cacheIdentity,
    rustDir, targetDirectory, compilerPath, registrySourceRoot: resolve(environment.CARGO_HOME || resolve(homedir(), '.cargo'), 'registry/src'),
    argvLog: resolve(runDirectory, 'argv.jsonl'),
    remaps: [...new Set([homedir(), resolve(rustDir, '..'), resolve(environment.CARGO_HOME || resolve(homedir(), '.cargo')), sysroot])]
      .map(prefix => `${prefix}=/file-viewer-rpgp-build`),
    hostTarget: toolFields(rustcVersion, ['host']).host, snapshot: actual }
  const contextPath = resolve(runDirectory, 'context.json')
  await writeFile(contextPath, JSON.stringify(context) + '\n', { mode: 0o600 })
  await writeFile(context.argvLog, '', { mode: 0o600 })
  return { ...context, contextPath, environment: { CARGO_TARGET_DIR: targetDirectory,
    RUSTC_WRAPPER: helperPath, FILE_VIEWER_RPGP_CANONICAL_CONTEXT: contextPath } }
}

export async function canonicalMetadataDiagnostics(context) {
  const bytes = await readFile(context.argvLog)
  return { policySha256: context.policySha256, helperSha256: context.helperSha256, toolchainDigest: context.toolchainDigest,
    targetDirectory: context.targetDirectory, rustSourceMarkers: context.snapshot.rustSourceMarkers,
    argvLogSha256: digest(bytes), argv: bytes.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)) }
}

function wrapperMain(argv) {
  const context = JSON.parse(readFileSync(process.env.FILE_VIEWER_RPGP_CANONICAL_CONTEXT, 'utf8'))
  const policyBytes = readFileSync(policyPath), helperBytes = readFileSync(helperPath)
  assert.equal(digest(policyBytes), context.policySha256, 'Canonical policy changed during compilation')
  assert.equal(digest(helperBytes), context.helperSha256, 'Canonical helper changed during compilation')
  assert.equal(realpathSync(argv[0]), context.compilerPath, 'Canonical wrapper requires the actual preflight compiler')
  let result
  try { result = rewriteCanonicalMetadata(argv.slice(1), { policy: JSON.parse(policyBytes), context: { ...context, cwd: process.cwd() } }) }
  catch (error) {
    appendFileSync(context.argvLog, JSON.stringify({ policySha256: context.policySha256,
      kind: 'fail-closed', cwd: process.cwd(), originalArgv: argv, actualArgv: null, error: String(error) }) + '\n')
    throw error
  }
  appendFileSync(context.argvLog, JSON.stringify({ policySha256: context.policySha256,
    ...result, args: undefined, cwd: process.cwd(), originalArgv: argv, actualArgv: [argv[0], ...result.args] }) + '\n')
  const child = spawnSync(argv[0], result.args, { stdio: 'inherit', env: process.env })
  if (child.error) throw child.error
  if (child.signal) process.kill(process.pid, child.signal)
  else process.exit(child.status ?? 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { wrapperMain(process.argv.slice(2)) }
  catch (error) { console.error(`[rpgp-canonical-metadata] ${error.stack || error}`); process.exitCode = 1 }
}
