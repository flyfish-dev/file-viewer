import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFile(resolve(packageDir, path), 'utf8')

const cargo = await read('rust/Cargo.toml')
assert.match(
  cargo,
  /pgp\s*=\s*\{[^}]*version\s*=\s*"=0\.20\.0"[^}]*features\s*=\s*\["wasm"\]/s,
  'rPGP 0.20.0 with the wasm feature must be pinned.'
)
assert.doesNotMatch(cargo, /lgpl/i, 'The Rust manifest must not introduce LGPL code.')

const worker = await read('src/signature.worker.ts')
assert.match(
  worker,
  /import\(['"]\.\/rpgp-wasm\/rpgp_wrapper\.js['"]\)/,
  'The Worker must lazily import the fixed wasm-bindgen module path.'
)
assert.match(
  worker,
  /rpgp_wrapper_bg\.wasm/,
  'The Worker must initialize the standalone WASM asset.'
)
assert.doesNotMatch(worker, /gnupg|gpg\s+--/i, 'The Worker must not invoke GnuPG.')

const client = await read('src/openpgp/client.ts')
assert.match(client, /new Worker\(/, 'The OpenPGP backend must execute in a Web Worker.')
assert.match(
  client,
  /\.\.\/signature\.worker\.js/,
  'The Worker must be created from the emitted optional renderer asset.'
)

const rendererIndex = await read('src/index.ts')
for (const extension of ['asc', 'sig', 'pgp', 'gpg']) {
  assert.match(
    rendererIndex,
    new RegExp(`['"]${extension}['"]`),
    `${extension} must be registered by the optional signature renderer.`
  )
}

const protocol = await read('src/workerProtocol.ts')
for (const operation of ['classify', 'inspect', 'verify-detached']) {
  assert.match(
    protocol,
    new RegExp(`type:\\s*['"]${operation}['"]`),
    `Worker protocol must include ${operation}.`
  )
}
for (const forbidden of ['decrypt', 'sign-message', 'generate-key', 'unlock-private-key']) {
  assert.doesNotMatch(
    protocol,
    new RegExp(`type:\\s*['"]${forbidden}['"]`),
    `Sensitive operation ${forbidden} must not be exposed.`
  )
}

const rustLib = await read('rust/src/lib.rs')
for (const exported of ['classify_openpgp', 'inspect_openpgp', 'verify_detached_signature']) {
  assert.match(
    rustLib,
    new RegExp(`pub fn ${exported}\\b`),
    `Rust wrapper must export ${exported}.`
  )
}
assert.doesNotMatch(
  rustLib,
  /pub fn (?:decrypt|sign|generate_key|unlock_private)/,
  'Rust wrapper must not expose private-key operations.'
)

async function collectSourceFiles(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['dist', 'target', 'test'].includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await collectSourceFiles(path)))
    else if (['.ts', '.js', '.mjs', '.rs', '.json', '.toml'].includes(extname(entry.name)))
      result.push(path)
  }
  return result
}

for (const file of await collectSourceFiles(packageDir)) {
  if (file === fileURLToPath(import.meta.url)) continue
  const text = await readFile(file, 'utf8')
  assert.doesNotMatch(
    text,
    /child_process[^\n]*(?:gpg|gnupg)|(?:exec|spawn)[^(]*\([^\n]*(?:gpg|gnupg)/i,
    `External GnuPG invocation remains in ${file}.`
  )
}

console.log('OpenPGP rPGP/WASM architecture verification passed.')
