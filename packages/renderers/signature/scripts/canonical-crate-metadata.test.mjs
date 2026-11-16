import assert from 'node:assert/strict'
import { readFile, mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  canonicalLogicalKey, metadataSlots, rewriteCanonicalMetadata,
  digest, validateCanonicalEnvironment, validateCanonicalPolicy, validateCanonicalSnapshot, validateCompilerQuery
} from './canonical-crate-metadata.mjs'

const policyBytes = await readFile(new URL('./canonical-crate-metadata-policy.json', import.meta.url))
const policy = JSON.parse(policyBytes)
const clone = value => structuredClone(value)
const snapshot = () => ({ tools: clone(policy.tools), sources: clone(policy.sources),
  stdlib: clone(policy.stdlib), rustSourceMarkers: clone(policy.rustSourceMarkers) })
const rootUnit = policy.compileUnits.find(row => row.logicalKey.crateName === 'file_viewer_rpgp_wrapper')
const incomingMetadata = '0123456789abcdef'
// Actual public root compile-unit flags; incoming opaque metadata intentionally
// differs from every observed host. No host/old-cache value grants eligibility.
function rootArgs(target) {
  return ['--crate-name', 'file_viewer_rpgp_wrapper', '--edition=2021', 'src/lib.rs',
    '--error-format=json', '--json=diagnostic-rendered-ansi,artifacts,future-incompat',
    '--crate-type', 'cdylib', '--crate-type', 'rlib', '--emit=dep-info,link',
    '-C', 'opt-level=z', '-C', 'panic=abort', '-C', 'codegen-units=1',
    '--check-cfg', 'cfg(docsrs,test)', '--check-cfg', 'cfg(feature, values())',
    '-C', `metadata=${incomingMetadata}`, '--out-dir', resolve(target, 'wasm32-unknown-unknown/release/deps'),
    '--target', 'wasm32-unknown-unknown', '-C', 'strip=symbols',
    '-L', `dependency=${resolve(target, 'wasm32-unknown-unknown/release/deps')}`,
    '-L', `dependency=${resolve(target, 'release/deps')}`,
    ...['pgp', 'serde', 'serde_wasm_bindgen', 'wasm_bindgen'].flatMap(name =>
      ['--extern', `${name}=${resolve(target, 'release/deps', name + '.rlib')}`]),
    '--remap-path-prefix=/public-build=/file-viewer-rpgp-build']
}

test('public canonical policy is complete, unique and contains no machine paths or command logs', () => {
  assert.equal(validateCanonicalPolicy(policy).size, 183)
  assert.doesNotMatch(policyBytes.toString('utf8'), /\/Users\/|\/home\/|file:\/\/|originalArgv|actualArgv/)
  assert.equal(policy.canonicalMetadataOrigin.rustWasmSha256, '25a409f35afb1a7179f4e08c71e7b1bb73dd435fca2155fc459116d9072d24c0')
})

test('unknown incoming host metadata changes only its single slot for a known semantic unit', async () => {
  const target = await realpath(await mkdtemp(resolve(tmpdir(), 'rpgp-canonical-metadata-test-')))
  try {
    await mkdir(resolve(target, 'release/deps'), { recursive: true })
    for (const name of ['pgp', 'serde', 'serde_wasm_bindgen', 'wasm_bindgen'])
      await writeFile(resolve(target, 'release/deps', name + '.rlib'), '')
    const rustDir = resolve(target, 'rust')
    await mkdir(resolve(rustDir, 'src'), { recursive: true })
    await writeFile(resolve(rustDir, 'src/lib.rs'), 'Test-owned preflight source')
    const args = rootArgs(target), original = [...args]
    const context = { targetDirectory: target, rustDir, cwd: rustDir, remaps: ['/public-build=/file-viewer-rpgp-build'] }
    assert.deepEqual(canonicalLogicalKey(args).key, rootUnit.logicalKey)
    const actual = rewriteCanonicalMetadata(args, { policy, context })
    assert.deepEqual(args, original)
    assert.equal(actual.actualMetadata, rootUnit.canonicalMetadata)
    const changed = args.flatMap((arg, index) => arg === actual.args[index] ? [] : [index])
    assert.deepEqual(changed, [metadataSlots(args)[0].index])
    assert.equal(actual.originalMetadata, incomingMetadata)
    assert.deepEqual(rewriteCanonicalMetadata(['-vV'], { policy, context }).args, ['-vV'])
    for (const mutation of [
      input => input.map(value => value === 'opt-level=z' ? 'opt-level=3' : value),
      input => [...input, '--cfg', 'feature="unknown"'],
      input => input.map(value => value === 'src/lib.rs' ? 'src/unknown.rs' : value),
      input => input.map(value => value === 'src/lib.rs' ? '/tmp/foreign/packages/renderers/signature/rust/src/lib.rs' : value),
      input => [...input, '--sysroot', '/unreviewed-toolchain'],
      input => [...input, '--remap-path-prefix=/extra=/file-viewer-rpgp-build'],
      input => [...input, '-C', 'metadata=1111111111111111'],
      input => [...input, '-C', 'extra-filename=../../escaped'],
      input => [...input, '-C', 'extra-filename=-1111111111111111', '-C', 'extra-filename=-2222222222222222'],
      input => input.map(value => value === `metadata=${incomingMetadata}` ? 'metadata=not-hex' : value),
      input => input.map(value => value.startsWith('pgp=') ? 'pgp=/outside-target/libpgp.rlib' : value)
    ]) assert.throws(() => rewriteCanonicalMetadata(mutation(args), { policy, context }))
    assert.throws(() => rewriteCanonicalMetadata(['--crate-name', 'unknown', 'src/lib.rs'], { policy, context }), /probe|metadata/)
  } finally { await rm(target, { recursive: true, force: true }) }
})

test('normal registry compiler probes preserve argv and require their declared source/profile/output boundary', async () => {
  const temporary = await realpath(await mkdtemp(resolve(tmpdir(), 'rpgp-compiler-probe-test-')))
  try {
    const target = resolve(temporary, 'target')
    const controlled = clone(policy)
    for (const probe of controlled.compilerProbes) {
      const source = probe.logicalKey.source
      const cwd = resolve(temporary, 'registry/src', source.index, source.packageVersion)
      await mkdir(cwd, { recursive: true })
      for (const input of probe.inputs) {
        await mkdir(resolve(cwd, input.path, '..'), { recursive: true })
        const bytes = Buffer.from('Test-owned compiler-input identity: ' + input.path)
        await writeFile(resolve(cwd, input.path), bytes)
        input.bytes = bytes.length; input.sha256 = digest(bytes)
      }
    }
    const probe = controlled.compilerProbes.find(row => row.logicalKey.crateName === 'proc_macro2')
    const source = probe.logicalKey.source
    const cwd = resolve(temporary, 'registry/src', source.index, source.packageVersion)
    const context = { targetDirectory: target, cwd, registrySourceRoot: resolve(temporary, 'registry/src'), hostTarget: 'aarch64-unknown-linux-gnu', remaps: [] }
    const args = ['--cfg=procmacro2_build_probe', '--edition=2021', '--crate-name=proc_macro2',
      '--crate-type=lib', '--cap-lints=allow', '--emit=dep-info,metadata', '--out-dir', resolve(target, 'release/build/probe/out'),
      source.relative, '--target', context.hostTarget]
    const result = rewriteCanonicalMetadata(args, { policy: controlled, context })
    assert.equal(result.kind, 'compiler-probe-passthrough')
    assert.deepEqual(result.args, args)
    assert.throws(() => rewriteCanonicalMetadata([...args, '-C', 'opt-level=3'], { policy: controlled, context }))
    assert.throws(() => rewriteCanonicalMetadata(args.map(value => value === source.relative ? 'src/unknown.rs' : value), { policy: controlled, context }))
    assert.throws(() => rewriteCanonicalMetadata(args.map(value => value === resolve(target, 'release/build/probe/out') ? '/outside' : value), { policy: controlled, context }))
    await writeFile(resolve(cwd, source.relative), 'changed source')
    assert.throws(() => rewriteCanonicalMetadata(args, { policy: controlled, context }), /source/)

    const stdinProbe = controlled.compilerProbes.find(row => row.logicalKey.source.kind === 'stdin-compiler-probe')
    const stdinSource = stdinProbe.logicalKey.source
    const stdinContext = { targetDirectory: target, registrySourceRoot: resolve(temporary, 'registry/src'), cwd: resolve(temporary, 'registry/src', stdinSource.index, stdinSource.packageVersion),
      remaps: ['/public-build=/file-viewer-rpgp-build'] }
    const stdinArgs = ['--crate-name', 'autocfg_0123456789abcdef_123', '--crate-type=lib', '--out-dir', resolve(target, 'wasm32-unknown-unknown/release/build/probe/out'),
      '--emit=llvm-ir', '--target', 'wasm32-unknown-unknown', '--remap-path-prefix=/public-build=/file-viewer-rpgp-build', '-']
    assert.deepEqual(rewriteCanonicalMetadata(stdinArgs, { policy: controlled, context: stdinContext }).args, stdinArgs)
    assert.throws(() => rewriteCanonicalMetadata(stdinArgs.map(value => value === '--emit=llvm-ir' ? '--emit=link' : value), { policy: controlled, context: stdinContext }))
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

test('compiler queries accept only complete real version/print templates, never mixed compilation flags', () => {
  const context = { remaps: ['/public-build=/file-viewer-rpgp-build'] }
  const base = ['-', '--crate-name', '___', '--print=file-names', '--crate-type', 'bin', '--crate-type', 'rlib',
    '--crate-type', 'dylib', '--crate-type', 'cdylib', '--crate-type', 'staticlib', '--crate-type', 'proc-macro',
    '--print=sysroot', '--print=split-debuginfo', '--print=crate-name', '--print=cfg', '-Wwarnings']
  for (const args of [['-vV'], ['--version'], ['--version', '--verbose'], base,
    [...base.slice(0, 4), '--target', 'wasm32-unknown-unknown', '--remap-path-prefix=/public-build=/file-viewer-rpgp-build', ...base.slice(4)]])
    validateCompilerQuery(args, context)
  for (const args of [
    ['--version', 'src/unknown.rs', '--emit=link'], ['-vV', '--out-dir', '/outside'],
    [...base, '--print=link-args'], [...base, '--print=native-static-libs'],
    [...base, '-C', 'opt-level=3'], [...base, '--out-dir', '/outside'],
    [...base, '--target', 'unreviewed-target']
  ]) assert.throws(() => validateCompilerQuery(args, context))
})

test('ambiguous canonical key or changed key digest cannot grant eligibility', () => {
  const duplicate = clone(policy)
  duplicate.compileUnits[1] = clone(duplicate.compileUnits[0])
  assert.throws(() => validateCanonicalPolicy(duplicate), /Ambiguous/)
  const changed = clone(policy)
  changed.compileUnits[0].logicalKey.crateName += '_different'
  assert.throws(() => validateCanonicalPolicy(changed), /logical-key digest/)
})

test('compiler/Cargo commits, every source/std row and rust-src markers are exact', () => {
  validateCanonicalSnapshot(policy, snapshot())
  for (const mutate of [
    input => { input.tools.rustc['commit-hash'] = '0'.repeat(40) },
    input => { input.tools.cargo['commit-hash'] = '0'.repeat(40) },
    input => { input.tools.rustc['LLVM version'] = 'different' },
    input => { input.sources[0].sha256 = '0'.repeat(64) },
    input => { input.sources.push({ ...input.sources[0], path: 'src/extra.rs' }) },
    input => { input.stdlib[0].sha256 = '0'.repeat(64) },
    input => { input.stdlib.pop() },
    input => { input.rustSourceMarkers = [] },
    input => { input.rustSourceMarkers[0].sha256 = '0'.repeat(64) }
  ]) {
    const actual = snapshot(); mutate(actual)
    assert.throws(() => validateCanonicalSnapshot(policy, actual))
  }
})

test('existing wrappers, custom compiler/target or flags cannot inject a different recipe', () => {
  validateCanonicalEnvironment({ FILE_VIEWER_RPGP_CANONICAL_METADATA: '1' })
  for (const key of ['RUSTC_WRAPPER', 'RUSTC_WORKSPACE_WRAPPER', 'RUSTC', 'CARGO_TARGET_DIR', 'RUSTFLAGS', 'CARGO_ENCODED_RUSTFLAGS'])
    assert.throws(() => validateCanonicalEnvironment({ [key]: 'unreviewed' }), new RegExp(key))
})
