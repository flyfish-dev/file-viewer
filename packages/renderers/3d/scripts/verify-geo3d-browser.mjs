import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'

// Keep the exact installed engine source next to a failing lifecycle report.
// Reading these files does not import or modify the engine or its dependencies.
const here = dirname(fileURLToPath(import.meta.url))
const output = resolve(here, '../../../../output/geo3d-validation')
const resolver = createRequire(resolve(here, '../package.json'))
const evidence = { packages: [], files: {}, errors: [] }

async function packageRoot(name, entry, from = resolver) {
  let directory = dirname(from.resolve(entry))
  for (;;) {
    try {
      const data = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
      if (data.name === name) return { directory, data }
    } catch {
      /* Continue to the installed package root. */
    }
    const parent = dirname(directory)
    if (parent === directory) throw new Error(`Package root not found: ${name}`)
    directory = parent
  }
}

async function collect(pkg, directory = pkg.directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await collect(pkg, path, relative)
    } else if (
      /\.(?:[cm]?js|ts)$/.test(entry.name) &&
      /(?:WorkerPool|LASSource|COPCSource|GeoTIFFSource|PointCloud|RequestQueue|OperationCounter|Promise|worker|pool|TextureGenerator)/i.test(
        relative
      )
    ) {
      const bytes = await readFile(path)
      if (bytes.length > 180000) continue
      evidence.files[`${pkg.data.name}/${relative}`] = {
        sha256: createHash('sha256').update(bytes).digest('hex'),
        text: bytes.toString('utf8')
      }
    }
  }
}

try {
  const giro = await packageRoot('@giro3d/giro3d', '@giro3d/giro3d/core/Instance.js')
  const giroResolver = createRequire(join(giro.directory, 'package.json'))
  for (const pkg of [giro, await packageRoot('geotiff', 'geotiff', giroResolver)]) {
    evidence.packages.push(pkg.data)
    await collect(pkg)
  }
} catch (error) {
  evidence.errors.push(String(error))
}
await mkdir(output, { recursive: true })
await writeFile(join(output, 'engine-ownership.json'), JSON.stringify(evidence, null, 2))

// The full sources remain in the artifact; log only ownership-relevant lines.
for (const [name, file] of Object.entries(evidence.files)) {
  if (
    !/(?:sources\/GeoTIFFSource\.js|utils\/TextureGenerator\.js|dist-module\/(?:pool\.js|worker\/[^/]+\.js))$/.test(
      name
    )
  )
    continue
  console.log(`ENGINE_OWNERSHIP ${name} SHA256 ${file.sha256}`)
  const lines = file.text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (
      /Fetcher|ConcurrentDownloader|_downloader|async fetch|bindParameters|dispose\(/.test(lines[i])
    ) {
      console.log(`${i + 1}: ${lines[i].slice(0, 400)}`)
    }
  }
}

function summarize(name, report) {
  console.log(
    'GEO3D_BROWSER_SUMMARY',
    JSON.stringify({
      report: name,
      status: report.status,
      failure: report.failure,
      notRun: report.notRun,
      passed: (report.cases ?? []).filter((item) => item.status === 'passed').length,
      failed: (report.cases ?? []).filter((item) => item.status === 'failed').length
    })
  )
  for (const item of report.cases ?? []) {
    const errors = item.errors ?? []
    console.log(
      'GEO3D_BROWSER_CASE',
      JSON.stringify({
        name: item.name,
        status: item.status,
        failure: item.failure,
        errorCount: errors.length,
        errorPreview: [...new Set(errors.map(String))]
          .slice(0, 4)
          .map((error) => error.slice(0, 1800)),
        cleanup: item.cleanup,
        resources: item.resources,
        aborted: item.aborted,
        screenshotCaptured: Boolean(item.screenshotPngBase64),
        requestCount: item.requests?.length,
        transferCount: item.transfers?.length
      })
    )
  }
}

// Full errors, screenshots and transfers remain unchanged in the JSON artifacts.
// Bound console output only: no filtering of test errors or acceptance assertions.
try {
  await import('./verify-geo3d-browser-scenarios.mjs')
  await import('./verify-geo3d-concurrent.mjs')
  await import('./verify-geo3d-host-browser.mjs')
  await import('./verify-geo3d-archive-browser.mjs')
  await import('./verify-geo3d-installed.mjs')
} finally {
  try {
    const report = JSON.parse(
      await readFile(resolve(output, '../geo3d-browser/report.json'), 'utf8')
    )
    summarize('datasets', report)
    if (report.concurrency) summarize('concurrency', report.concurrency)
    if (report.installedConsumer?.browser) {
      summarize('installed-datasets', report.installedConsumer.browser)
      if (report.installedConsumer.browser.concurrency)
        summarize('installed-concurrency', report.installedConsumer.browser.concurrency)
    }
    if (report.status === 'failed' && !report.installedConsumer) {
      for (const [name, file] of Object.entries(evidence.files)) {
        if (
          !/(?:entities\/PointCloud|sources\/(?:PointCloudSource|COPCSource|LASSource)|OperationCounter|PromiseUtils)\.js$/.test(
            name
          )
        )
          continue
        console.log(`ENGINE_CANCELLATION ${name} SHA256 ${file.sha256}`)
        const lines = file.text.split('\n'),
          selected = new Set()
        if (/(?:PointCloudSource|OperationCounter|PromiseUtils)\.js$/.test(name)) {
          for (let i = 0; i < lines.length; i++) selected.add(i)
        } else {
          for (let i = 0; i < lines.length; i++) {
            if (
              /^  (?:async )?(?:initialize|initializeOnce|clear|loadNodeData|dispose)\(/.test(
                lines[i]
              )
            ) {
              let end = i + 1
              while (end < lines.length && !/^  }/.test(lines[end])) end++
              for (let j = i; j <= Math.min(end, i + 150); j++) selected.add(j)
            }
          }
        }
        for (const i of [...selected].sort((a, b) => a - b)) console.log(`${i + 1}: ${lines[i]}`)
      }
    }
  } catch (error) {
    console.error('Geo3D browser report could not be summarized:', String(error))
  }
}
