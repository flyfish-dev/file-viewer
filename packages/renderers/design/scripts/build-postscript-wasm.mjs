import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, realpath, rm, unlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const STET_REPOSITORY = 'https://github.com/AndyCappDev/stet.git'
const STET_COMMIT = '3aaf0a76ebd0f9129a715dfa10614d8871d8e965'
const GOOGLE_FONTS_COMMIT = 'ade3d1533e06b2b1462ffcde8e08b129627ca360'
const TINOS_LICENSE_COMMIT = '3b4482a99b80ea5fc75f187b1be3120a3f5905b3'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const patchPath = resolve(packageDir, 'source/postscript/stet-safe-browser.patch')
const cargoLockPath = resolve(packageDir, 'source/postscript/Cargo.lock')
const outputJs = resolve(packageDir, 'src/postscriptRuntime/stet_wasm.js')
const outputTypes = resolve(packageDir, 'src/postscriptRuntime/stet_wasm.d.ts')
const outputWasm = resolve(packageDir, 'runtime/postscript/stet_wasm_bg.wasm')
const keepTemp = process.argv.includes('--keep-temp')

const fontFiles = [
  ['carlito/Carlito-Bold.ttf', 'Carlito-Bold.ttf', 'bb5d20f79b82599ec72983597437373a80f2d2085fa91fc144fd74e876a594db'],
  ['carlito/Carlito-BoldItalic.ttf', 'Carlito-BoldItalic.ttf', 'b32928186c119599e03ca6a1ffc680fdcb7fac95772f4b95d989cf6cd3861517'],
  ['carlito/Carlito-Italic.ttf', 'Carlito-Italic.ttf', '0b019225e58d702bfedcbd35c21696769f8ee115cb6343f84c2f240312450d1c'],
  ['carlito/Carlito-Regular.ttf', 'Carlito-Regular.ttf', 'f6418f708baede9789daef5d458c0f53d2a888af9820e8062934e504fedc6595'],
  ['cousine/Cousine-Bold.ttf', 'Cousine-Bold.ttf', '17c8a7245156d2253531c9e529474937b09d9f641c5ae7695c5e33f22822eef4'],
  ['cousine/Cousine-BoldItalic.ttf', 'Cousine-BoldItalic.ttf', '848e858726fee0ae27b754e4cd6a2755209bf1428a8c91f747696d58c33906c3'],
  ['cousine/Cousine-Italic.ttf', 'Cousine-Italic.ttf', 'ea2a76ae3d0ece9cd59f0d30fdc08dd70e8f5f457beee5b0852a7b50c2286c7c'],
  ['cousine/Cousine-Regular.ttf', 'Cousine-Regular.ttf', '1da22250675fc4c42fcf3a9736c44bc0570516105331443b663fd5cfbd1412fe'],
  ['notosanssymbols2/NotoSansSymbols2-Regular.ttf', 'NotoSansSymbols2-Regular.ttf', '7d5fb73b7ca67a6798101741f5d280a3d016a56a197afcd4199dbb57b4b82a21'],
  ['tinos/Tinos-Bold.ttf', 'Tinos-Bold.ttf', '393269dbab8899f938db19783eca5eac92eb431f7ae0ab45b8349ca895f1a06b'],
  ['tinos/Tinos-BoldItalic.ttf', 'Tinos-BoldItalic.ttf', 'a5de79f0fe863ea0954757acb3d47b3ccd0a930ce3dd5b97230cd3866790a06e'],
  ['tinos/Tinos-Italic.ttf', 'Tinos-Italic.ttf', '5942266ed398b155d7dc23e36833e7ec6be988f2439bdbeb8ef1bede808eaa91'],
  ['tinos/Tinos-Regular.ttf', 'Tinos-Regular.ttf', '60a0e8ef0c04dd5dd69ffe91025fa2ae5836cbd35600a82ba031977557e2cb61'],
]

const licenseFiles = [
  [`https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_COMMIT}/ofl/carlito/OFL.txt`, 'OFL-Carlito.txt', '58402f82a7c332a700294988fe7554fbb0a63a8d27ccc1ee3bbc640311990a00'],
  [`https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_COMMIT}/ofl/cousine/OFL.txt`, 'OFL-Cousine.txt', 'b81c4d4dc0a9f72c9155e78187316e016e2012a8102468804173dc61468b906d'],
  [`https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_COMMIT}/ofl/notosanssymbols2/OFL.txt`, 'OFL-NotoSansSymbols2.txt', 'b118dd41337806a5d4797052c77caf3bd096aed783e5eb21b4d11154351e1ac0'],
  [`https://raw.githubusercontent.com/googlefonts/tinos/${TINOS_LICENSE_COMMIT}/OFL.txt`, 'OFL-Tinos.txt', 'cb3382d4643e8b02c12e322c220a3c76a5020d667e4fd4e7c75e744cca6caa6b'],
]

const run = (command, args, cwd, env = process.env) => {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`)
}

const sha256 = value => createHash('sha256').update(value).digest('hex')

const downloadChecked = async (url, target, expectedSha256) => {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Failed to download ${url}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const actual = sha256(bytes)
  if (actual !== expectedSha256) {
    throw new Error(`SHA-256 mismatch for ${url}: expected ${expectedSha256}, got ${actual}`)
  }
  await writeFile(target, bytes)
}

const removeDisallowedUpstreamAssets = async root => {
  const visit = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(path)
      } else if (
        entry.name.endsWith('.t1') ||
        entry.name === 'default_cmyk.icc' ||
        entry.name === 'NimbusRoman-Regular-CFF.ps'
      ) {
        await unlink(path)
      }
    }
  }
  await visit(resolve(root, 'crates'))
}

const assertToolVersion = (command, args, expected) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${command} is required to reproduce the PostScript WASM build.`)
  const actual = `${result.stdout}${result.stderr}`.trim()
  if (!actual.includes(expected)) throw new Error(`${command} must match ${expected}; found ${actual}`)
}

assertToolVersion('rustc', ['--version'], '1.88.0')
assertToolVersion('wasm-bindgen', ['--version'], '0.2.127')
assertToolVersion('wasm-opt', ['--version'], '130')

// Rust includes path-based crate disambiguators before diagnostic path
// remapping. A random mkdtemp checkout therefore changes the linked module even
// when every source byte is identical. Keep the isolated checkout at one fixed,
// task-specific path and remove it on both entry and exit.
const temporaryRoot = join(await realpath(tmpdir()), 'file-viewer-stet-build-v3')
await rm(temporaryRoot, { recursive: true, force: true })
await mkdir(temporaryRoot, { recursive: false })
const sourceDir = resolve(temporaryRoot, 'stet')
const reproducibleBuildEnv = {
  ...process.env,
  CARGO_INCREMENTAL: '0',
  SOURCE_DATE_EPOCH: '0',
  TZ: 'UTC',
  LC_ALL: 'C',
  CARGO_ENCODED_RUSTFLAGS: [
    `--remap-path-prefix=${temporaryRoot}=/file-viewer-stet-build`,
    `--remap-path-prefix=${homedir()}=/file-viewer-build-home`,
    '-Ccodegen-units=1',
  ].join('\x1f'),
}
try {
  run('git', ['init', '--quiet', sourceDir], temporaryRoot)
  run('git', ['remote', 'add', 'origin', STET_REPOSITORY], sourceDir)
  run('git', ['fetch', '--depth=1', 'origin', STET_COMMIT], sourceDir)
  run('git', ['checkout', '--detach', 'FETCH_HEAD'], sourceDir)
  run('git', ['apply', '--whitespace=nowarn', patchPath], sourceDir)
  await copyFile(cargoLockPath, resolve(sourceDir, 'crates/stet-wasm/Cargo.lock'))

  const fontDir = resolve(sourceDir, 'crates/stet/resources/Font')
  await mkdir(fontDir, { recursive: true })
  for (const [googlePath, filename, expectedSha256] of fontFiles) {
    await downloadChecked(
      `https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_COMMIT}/ofl/${googlePath}`,
      resolve(fontDir, filename),
      expectedSha256
    )
  }
  for (const [url, filename, expectedSha256] of licenseFiles) {
    await downloadChecked(url, resolve(fontDir, filename), expectedSha256)
  }
  await removeDisallowedUpstreamAssets(sourceDir)

  run('cargo', ['fmt', '--all', '--', '--check'], sourceDir)
  run('cargo', [
    'build', '--locked', '--target', 'wasm32-unknown-unknown', '--release',
    '--manifest-path', 'crates/stet-wasm/Cargo.toml',
  ], sourceDir, reproducibleBuildEnv)
  const rawWasm = resolve(sourceDir, 'crates/stet-wasm/target/wasm32-unknown-unknown/release/stet_wasm.wasm')
  const generatedDir = resolve(temporaryRoot, 'generated')
  await mkdir(generatedDir, { recursive: true })
  run('wasm-bindgen', ['--target', 'web', '--out-dir', generatedDir, '--out-name', 'stet_wasm', rawWasm], sourceDir)
  const optimizedWasm = resolve(generatedDir, 'stet_wasm_bg.optimized.wasm')
  run('wasm-opt', ['-Oz', '--strip-debug', '--strip-dwarf', '-o', optimizedWasm, resolve(generatedDir, 'stet_wasm_bg.wasm')], sourceDir)

  const wasm = await readFile(optimizedWasm)
  const searchable = wasm.toString('latin1')
  const forbidden = [/%!PS-AdobeFont[^\0]*Nimbus/i, /Copyright \(URW\)/i, /GNU AFFERO/i, /\bAGPL\b/i, /FOGRA39/i]
  const found = forbidden.find(pattern => pattern.test(searchable))
  if (found) throw new Error(`Optimized WebAssembly contains forbidden redistributed asset marker ${found}.`)
  for (const localPath of [temporaryRoot, homedir()]) {
    if (searchable.includes(localPath)) {
      throw new Error(`Optimized WebAssembly leaks a local build path: ${localPath}`)
    }
  }

  await mkdir(dirname(outputJs), { recursive: true })
  await mkdir(dirname(outputWasm), { recursive: true })
  await copyFile(resolve(generatedDir, 'stet_wasm.js'), outputJs)
  await copyFile(resolve(generatedDir, 'stet_wasm.d.ts'), outputTypes)
  await copyFile(optimizedWasm, outputWasm)
  console.log(`[renderer-design] Rebuilt safe Stet WASM ${sha256(wasm)} (${wasm.byteLength} bytes).`)
} finally {
  if (keepTemp) console.log(`[renderer-design] Kept temporary source at ${temporaryRoot}`)
  else await rm(temporaryRoot, { recursive: true, force: true })
}
