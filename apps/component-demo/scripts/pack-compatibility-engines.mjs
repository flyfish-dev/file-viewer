import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import { verifyDocxDistribution } from '../../../.github/scripts/verify-docx-distribution.mjs'

export function compatibilityEngineCandidates(docxMode) {
  assert.ok(['compatibility', 'published'].includes(docxMode), 'Unknown DOCX distribution mode')
  const candidates = [
    ['packages/renderers/presentation-ppt', 'patches/ppt-http-compatibility.json']
  ]
  if (docxMode === 'compatibility')
    candidates.unshift(['packages/renderers/word', 'patches/docx-engine-compatibility.json'])
  return candidates
}

// These are normal installed distributions. Their executable bytes must match
// the owning-source build fingerprints before entering a physical consumer.
export async function packCompatibilityEngines(root, output) {
  const destination = join(output, 'engine-tarballs')
  await mkdir(destination, { recursive: true })
  const docx = await verifyDocxDistribution(root)
  const provenance =
    docx.mode === 'published'
      ? [
          {
            ...docx,
            method: 'Unmodified ordinary registry dependency; no DOCX candidate tarball or override'
          }
        ]
      : []
  // Preserve the existing compatibility rehearsal until the published migration.
  // Afterwards, cold consumers resolve DOCX normally from their registry.
  for (const [owner, metadataPath] of compatibilityEngineCandidates(docx.mode)) {
    const metadata = JSON.parse(await readFile(resolve(root, metadataPath), 'utf8'))
    const require = createRequire(resolve(root, owner, 'package.json'))
    let directory = dirname(require.resolve(metadata.package))
    for (;;) {
      try {
        const installed = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
        if (installed.name === metadata.package) {
          assert.equal(installed.version, metadata.version)
          break
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      assert.notEqual(dirname(directory), directory, `Cannot locate ${metadata.package}`)
      directory = dirname(directory)
    }
    for (const [name, expected] of Object.entries(metadata.sha256)) {
      const entry = metadata.package === '@file-viewer/docx' ? join('dist', name) : name
      const actual = createHash('sha256')
        .update(await readFile(join(directory, entry)))
        .digest('hex')
      assert.equal(
        actual,
        expected,
        `${metadata.package}/${entry} differs from its owning-source build`
      )
    }
    const staging = join(
      output,
      'engine-distributions',
      metadata.package.replace('@file-viewer/', '')
    )
    await cp(directory, staging, {
      recursive: true,
      filter: (source) => basename(source) !== 'node_modules'
    })
    execFileSync(
      'npm',
      [
        'pack',
        '--ignore-scripts',
        '--cache',
        join(output, 'npm-pack-cache'),
        '--pack-destination',
        destination
      ],
      {
        cwd: staging,
        encoding: 'utf8',
        stdio: 'pipe'
      }
    )
    provenance.push({
      package: metadata.package,
      version: metadata.version,
      runtimeVersion: metadata.runtimeVersion,
      verifiedSha256: metadata.sha256,
      method:
        'Normal installed compatibility distribution, verified against owning-source build fingerprints; unpublished test candidate'
    })
  }
  await writeFile(
    join(output, 'engine-candidate-provenance.json'),
    JSON.stringify(provenance, null, 2) + '\n'
  )
  return destination
}
