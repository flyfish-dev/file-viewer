import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertSafeSourcePath,
  assertPublishedDocxLock,
  docxCompatibilityPath,
  docxManifestPath,
  docxPackage,
  docxPatchEntries,
  docxPatchFiles,
  stableVersion
} from './lib/docx-release-state.mjs'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const registry = '--registry=https://registry.npmjs.org/'
function commandRunner(root) {
  return (command, args, binary = false) => {
    const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command
    const result = spawnSync(executable, args, {
      cwd: root,
      encoding: binary ? undefined : 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 600_000,
      shell: false
    })
    if (result.error) throw result.error
    assert.equal(
      result.status,
      0,
      `${command} failed: ${result.stderr || result.signal || result.status}`
    )
    return result.stdout
  }
}
async function optionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}
async function installedFiles(directory, prefix = '') {
  const files = []
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    if (!prefix && entry.name === 'node_modules') continue
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    assert.ok(!entry.isSymbolicLink(), `Unexpected link in installed DOCX distribution: ${path}`)
    if (entry.isDirectory()) files.push(...(await installedFiles(directory, path)))
    else {
      assert.ok(entry.isFile(), `Unexpected installed DOCX entry: ${path}`)
      files.push(path)
    }
  }
  return files.sort()
}

// This reads public registry bytes only. Nothing is extracted into, patched in,
// or repacked from the production package. tar writes exclusively to stdout.
async function withPublishedDocxArchive(version, run, inspect) {
  assert.match(version, stableVersion)
  const spec = `${docxPackage}@${version}`
  const metadata = JSON.parse(
    await run('npm', ['view', spec, 'version', 'dist', '--json', registry])
  )
  assert.equal(metadata.version, version, 'Registry DOCX version mismatch')
  assert.match(
    metadata.dist?.integrity || '',
    /^sha512-[A-Za-z0-9+/]+={0,2}$/,
    'Registry must supply SHA-512 integrity'
  )
  const temporary = await mkdtemp(join(tmpdir(), 'file-viewer-docx-registry-'))
  try {
    const packed = JSON.parse(
      await run('npm', [
        'pack',
        spec,
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        temporary,
        registry
      ])
    )
    assert.equal(packed.length, 1, 'Expected exactly one registry tarball')
    const { filename, integrity } = packed[0]
    assert.ok(
      filename && basename(filename) === filename && !filename.includes('\\'),
      'Unsafe registry tarball filename'
    )
    assert.equal(integrity, metadata.dist.integrity, 'Registry tarball metadata changed')
    const archive = join(temporary, filename)
    assert.ok((await lstat(archive)).isFile(), 'Registry tarball must be a regular file')
    assert.equal(
      `sha512-${createHash('sha512')
        .update(await readFile(archive))
        .digest('base64')}`,
      integrity,
      'Registry tarball integrity mismatch'
    )
    const names = (await run('tar', ['-tzf', archive]))
      .trim()
      .split('\n')
      .filter((name) => name && !name.endsWith('/'))
    const entries = names.map((name) => {
      assert.ok(
        name.startsWith('package/') && !/[\x00-\x1f\\]/.test(name),
        'Unexpected registry archive entry'
      )
      const entry = name.slice('package/'.length)
      assert.ok(
        entry.split('/').every((part) => part && part !== '.' && part !== '..'),
        'Unsafe registry archive entry'
      )
      return entry
    })
    assert.equal(new Set(entries).size, entries.length, 'Duplicate registry archive entries')
    assert.ok(
      entries.includes('package.json') &&
        entries.includes('dist/docx-preview.mjs') &&
        entries.includes('dist/docx-preview.worker.js'),
      'Registry DOCX distribution is incomplete'
    )
    return await inspect(archive, entries, {
      package: docxPackage,
      version,
      mode: 'published',
      integrity
    })
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

export async function verifyPublishedDocxFiles({ directory, version, run }) {
  return withPublishedDocxArchive(version, run, async (archive, entries, provenance) => {
    assert.deepEqual(
      await installedFiles(directory),
      [...entries].sort(),
      'Installed DOCX file set differs from the registry distribution'
    )
    const sha256 = {}
    for (const entry of entries) {
      await assertSafeSourcePath(directory, entry)
      const expected = await run('tar', ['-xOzf', archive, `package/${entry}`], true)
      const actual = await readFile(join(directory, entry))
      assert.ok(
        actual.equals(Buffer.from(expected)),
        `Installed DOCX ${entry} differs from the ordinary registry distribution`
      )
      sha256[entry] = createHash('sha256').update(actual).digest('hex')
    }
    return { ...provenance, sha256 }
  })
}

// The paragraph regression uses the old ordinary public release only as a
// negative-control input. This never modifies the installed production engine.
export async function readPublishedDocxEntry(
  version,
  entry,
  { run = commandRunner(defaultRoot) } = {}
) {
  return withPublishedDocxArchive(version, run, async (archive, entries, provenance) => {
    assert.ok(entries.includes(entry), `Missing public DOCX baseline entry: ${entry}`)
    const bytes = Buffer.from(await run('tar', ['-xOzf', archive, `package/${entry}`], true))
    return {
      text: bytes.toString('utf8'),
      provenance: { ...provenance, entry, sha256: createHash('sha256').update(bytes).digest('hex') }
    }
  })
}

export async function verifyDocxDistribution(
  root = defaultRoot,
  { requirePublished = false, run = commandRunner(root) } = {}
) {
  const manifest = JSON.parse(await readFile(join(root, docxManifestPath), 'utf8'))
  const version = manifest.dependencies[docxPackage]
  assert.match(version, stableVersion)
  const require = createRequire(join(root, docxManifestPath))
  const ownedManifest = await realpath(
    join(root, dirname(docxManifestPath), 'node_modules', docxPackage, 'package.json')
  )
  const physicalRoot = await realpath(root)
  const ownedRelativePath = relative(physicalRoot, ownedManifest)
  assert.ok(
    ownedRelativePath &&
      !isAbsolute(ownedRelativePath) &&
      ownedRelativePath !== '..' &&
      !ownedRelativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`),
    'Installed DOCX must physically belong to this checkout, not an ancestor or external store'
  )
  assert.equal(
    require.resolve(`${docxPackage}/package.json`),
    ownedManifest,
    'DOCX resolution must use the Word renderer installation, not an ancestor or NODE_PATH'
  )
  const directory = dirname(ownedManifest)
  const installed = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  assert.equal(installed.name, docxPackage)
  assert.equal(
    installed.version,
    version,
    'Installed DOCX version differs from the Word dependency'
  )
  const patches = docxPatchEntries(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8'))
  await assertSafeSourcePath(root, docxCompatibilityPath)
  const pin = await optionalJson(join(root, docxCompatibilityPath))
  if (patches.length) {
    assert.ok(
      !requirePublished,
      'DOCX still has an active patch; prepare the ordinary published release first'
    )
    assert.equal(patches.length, 1, 'Unexpected DOCX compatibility patch cohort')
    assert.equal(patches[0].key, `${docxPackage}@${version}`)
    assert.equal(pin?.package, docxPackage, 'DOCX compatibility provenance is missing')
    assert.equal(pin.version, version)
    assert.ok(
      pin.sourceBuild,
      'The compatibility runtime must be compiled from owning docxjs source'
    )
    for (const entry of ['docx-preview.mjs', 'docx-preview.worker.js'])
      assert.match(
        pin.sha256?.[entry] || '',
        /^[a-f0-9]{64}$/,
        `Missing compatibility fingerprint: ${entry}`
      )
    for (const [entry, expected] of Object.entries(pin.sha256)) {
      await assertSafeSourcePath(directory, `dist/${entry}`)
      assert.equal(
        createHash('sha256')
          .update(await readFile(join(directory, 'dist', entry)))
          .digest('hex'),
        expected,
        `Installed DOCX ${entry} differs from its owning-source build`
      )
    }
    return { package: docxPackage, version, mode: 'compatibility', sha256: pin.sha256 }
  }
  assert.equal(
    pin,
    undefined,
    'Remove obsolete DOCX compatibility metadata before registry adoption'
  )
  assert.deepEqual(
    await docxPatchFiles(root),
    [],
    'Remove obsolete DOCX patch distributions before registry adoption'
  )
  assertPublishedDocxLock(await readFile(join(root, 'pnpm-lock.yaml'), 'utf8'), version)
  return verifyPublishedDocxFiles({ directory, version, run })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(
    process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--published'),
    'Usage: node .github/scripts/verify-docx-distribution.mjs [--published]'
  )
  console.log(
    '[docx-distribution]',
    JSON.stringify(
      await verifyDocxDistribution(defaultRoot, {
        requirePublished: process.argv[2] === '--published'
      })
    )
  )
}
