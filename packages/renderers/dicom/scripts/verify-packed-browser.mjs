import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import {
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pnpmInvocation } from '../../../../.github/scripts/lib/pinned-pnpm.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const script = fileURLToPath(import.meta.url)
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n')

// Start a new Node process with these values removed: clearing process.env after
// startup cannot undo NODE_OPTIONS preloads or Node's initialized search paths.
export function cleanEnvironment(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(([name]) => !/^(NODE_PATH|NODE_OPTIONS)$/i.test(name))
  )
}

export function assertNoAncestorNodeModules(consumer) {
  let directory = dirname(realpathSync(consumer))
  while (true) {
    const path = join(directory, 'node_modules')
    let found = false
    try {
      // lstat also rejects dangling links and non-directory entries: the gate
      // must establish a clean setup, not guess which ancestor Node will use.
      lstatSync(path)
      found = true
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw Object.assign(
          new Error(`Contaminated validation setup: cannot inspect ancestor ${path}`, {
            cause: error
          }),
          { code: 'CONTAMINATED_VALIDATION_SETUP' }
        )
      }
    }
    if (found) {
      throw Object.assign(new Error(`Contaminated validation setup: ancestor ${path} exists`), {
        code: 'CONTAMINATED_VALIDATION_SETUP'
      })
    }
    const parent = dirname(directory)
    if (parent === directory) return
    directory = parent
  }
}

export function containedPath(directory, path) {
  const physical = realpathSync(path)
  assert.ok(
    physical.startsWith(realpathSync(directory) + sep),
    `Installed package escaped consumer: ${path} -> ${physical}`
  )
  return physical
}

export function installedPackage(consumer, name, version) {
  const require = createRequire(join(consumer, 'package.json'))
  const entry = containedPath(join(consumer, 'node_modules'), require.resolve(name))
  let directory = dirname(entry)
  while (directory !== dirname(directory)) {
    const path = join(directory, 'package.json')
    if (existsSync(path)) {
      const manifest = JSON.parse(readFileSync(containedPath(consumer, path), 'utf8'))
      if (manifest.name === name) {
        assert.equal(manifest.version, version, `Installed version drifted: ${name}`)
        return { name, version, entry: relative(consumer, entry), manifestSha256: sha256(path) }
      }
    }
    directory = dirname(directory)
  }
  throw new Error(`Installed package identity missing: ${name}`)
}

export async function retainRenderedPixels(page, result) {
  // Retain the sample that satisfied the poll. A later canvas read can differ
  // between rendering/compositing steps and is not the evidence we asserted.
  const sample = await page.waitForFunction(() => {
    const pixels = window.dicomPacked.pixels()
    return pixels?.maximum > 64 && pixels.brightRatio > 0.01 ? pixels : false
  })
  try {
    result.pixels = await sample.jsonValue()
    assert.ok(
      result.pixels?.maximum > 64 && result.pixels.brightRatio > 0.01,
      'Retained CT pixel evidence must have maximum > 64 and brightRatio > 0.01'
    )
  } finally {
    await sample.dispose()
  }
}

// Finalize on every ordinary failure, including install/audit/build/launch. The
// outer process also records timeouts if a stuck child cannot reach this block.
export async function retainEvidence(output, consumer, report, verify) {
  mkdirSync(output, { recursive: true })
  writeJson(join(output, 'report.json'), report)
  try {
    await verify()
    report.status = 'passed'
  } catch (error) {
    report.status = 'failed'
    report.error = error.stack || String(error)
    if (error.code) report.failureKind = error.code
    throw error
  } finally {
    report.finishedAt = new Date().toISOString()
    try {
      for (const name of ['package.json', 'package-lock.json', 'index.html', 'main.js']) {
        if (existsSync(join(consumer, name))) {
          copyFileSync(join(consumer, name), join(output, name))
        }
      }
    } finally {
      writeJson(join(output, 'report.json'), report)
      rmSync(consumer, { recursive: true, force: true })
    }
  }
}

async function verifyPackedBrowser(output) {
  assert.equal(process.env.NODE_PATH, undefined)
  assert.equal(process.env.NODE_OPTIONS, undefined)
  const packs = join(output, 'packs')
  // Neither ancestor node_modules nor a shared npm cache can supply this graph.
  const consumer = realpathSync(mkdtempSync(join(tmpdir(), 'file-viewer-dicom-packed-')))
  const cache = join(consumer, '.npm-cache')
  mkdirSync(cache)
  const environment = cleanEnvironment(process.env)
  for (const name of Object.keys(environment)) {
    if (/^npm_config_(cache|userconfig|globalconfig|prefix|node_options)$/i.test(name)) {
      delete environment[name]
    }
  }
  Object.assign(environment, {
    npm_config_cache: cache,
    npm_config_userconfig: join(consumer, '.npmrc'),
    npm_config_globalconfig: join(consumer, '.npmrc-global')
  })
  const report = {
    status: 'running',
    startedAt: new Date().toISOString(),
    scope:
      'Source-packed CT fixture in Chromium and WebKit with documented application-root overrides; not the default dependency graph or registry tarballs',
    node: process.version,
    fixtureSha256: sha256(join(root, 'apps/viewer-demo/public/example/ct-small.dcm')),
    isolation: {
      consumer,
      cache,
      cacheInitiallyEmpty: readdirSync(cache).length === 0,
      nodePath: null,
      nodeOptions: null
    },
    commands: [],
    results: []
  }
  const checkpoint = (stage) => {
    report.stage = stage
    writeJson(join(output, 'report.json'), report)
    console.log(`DICOM packed browser: ${stage}`)
  }
  const run = (name, command, args, cwd, allowFailure = false, timeout = 120_000) => {
    checkpoint(name)
    const result = spawnSync(command, args, {
      cwd,
      encoding: 'utf8',
      env: environment,
      timeout,
      maxBuffer: 16 * 1024 * 1024
    })
    writeFileSync(join(output, `${name}.log`), `${result.stdout || ''}${result.stderr || ''}`)
    report.commands.push({
      name,
      command,
      args,
      cwd,
      status: result.status,
      signal: result.signal,
      error: result.error?.message,
      timeoutMs: timeout
    })
    writeJson(join(output, 'report.json'), report)
    if (result.error || (!allowFailure && result.status !== 0)) {
      throw new Error(`${name} failed; inspect ${join(output, `${name}.log`)}`, {
        cause: result.error
      })
    }
    return result
  }
  await retainEvidence(output, consumer, report, async () => {
    checkpoint('consumer-ancestor-isolation')
    assertNoAncestorNodeModules(consumer)
    report.isolation.ancestorNodeModulesAbsent = true
    mkdirSync(packs, { recursive: true })
    mkdirSync(join(consumer, 'public'))
    writeFileSync(
      join(consumer, '.npmrc'),
      'engine-strict=true\nregistry=https://registry.npmjs.org\n'
    )
    writeFileSync(join(consumer, '.npmrc-global'), '')
    report.source = {
      commit: run('source-commit', 'git', ['rev-parse', 'HEAD'], root).stdout.trim(),
      changes: run('source-status', 'git', ['status', '--porcelain'], root).stdout.trim(),
      hashes: Object.fromEntries(
        [
          relative(root, script),
          'pnpm-lock.yaml',
          'packages/core/package.json',
          'packages/renderers/dicom/package.json'
        ].map((path) => [path, sha256(join(root, path))])
      )
    }
    const pnpm = pnpmInvocation()
    report.pnpm = run('pnpm-version', pnpm.command, [...pnpm.args, '--version'], root).stdout.trim()
    report.npm = run('npm-version', 'npm', ['--version'], consumer).stdout.trim()
    const versions = Object.fromEntries(
      [
        ['core', 'packages/core'],
        ['renderer-dicom', 'packages/renderers/dicom']
      ].map(([name, path]) => [
        name,
        JSON.parse(readFileSync(join(root, path, 'package.json'), 'utf8')).version
      ])
    )
    for (const name of ['core', 'renderer-dicom']) {
      run(
        `pack-${name}`,
        pnpm.command,
        [...pnpm.args, '--filter', `@file-viewer/${name}`, 'pack', '--pack-destination', packs],
        root
      )
    }
    const coreTar = join(packs, `file-viewer-core-${versions.core}.tgz`)
    const dicomTar = join(packs, `file-viewer-renderer-dicom-${versions['renderer-dicom']}.tgz`)
    report.tarballs = Object.fromEntries(
      [coreTar, dicomTar].map((path) => [basename(path), sha256(path)])
    )
    const manifest = {
      name: 'file-viewer-dicom-packed-browser-regression',
      private: true,
      type: 'module',
      dependencies: {
        '@file-viewer/core': `file:${coreTar}`,
        '@file-viewer/renderer-dicom': `file:${dicomTar}`
      },
      overrides: {
        // Map the unpublished internal package, then apply only the documented
        // application policy. Consumers do not inherit workspace overrides.
        '@file-viewer/core': '$@file-viewer/core',
        dcmjs: { 'adm-zip': '0.6.1' },
        '@cornerstonejs/dicom-image-loader': { uuid: '11.1.1' },
        '@kitware/vtk.js': { fflate: '0.7.5' }
      }
    }
    report.consumerManifest = manifest
    writeJson(join(consumer, 'package.json'), manifest)
    run(
      'cold-install',
      'npm',
      ['install', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'],
      consumer,
      false,
      300_000
    )
    checkpoint('installed-package-identities')
    const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'))
    report.installedPackages = []
    for (const [path, metadata] of Object.entries(lock.packages)) {
      if (!path) continue
      const manifestPath = join(consumer, path, 'package.json')
      if (!existsSync(manifestPath) && metadata.optional) continue
      const physical = containedPath(join(consumer, 'node_modules'), manifestPath)
      const installed = JSON.parse(readFileSync(physical, 'utf8'))
      const name = path.split('node_modules/').at(-1)
      assert.equal(installed.name, name, `Installed package name drifted: ${path}`)
      assert.equal(
        installed.version,
        metadata.version,
        `Installed package version drifted: ${path}`
      )
      report.installedPackages.push({
        name,
        version: installed.version,
        path: relative(consumer, dirname(physical))
      })
    }
    report.entries = Object.entries(versions).map(([name, version]) =>
      installedPackage(consumer, `@file-viewer/${name}`, version)
    )
    report.consumerLockSha256 = sha256(join(consumer, 'package-lock.json'))
    report.audits = {}
    for (const [name, args] of [
      ['full', []],
      ['production', ['--omit=dev']]
    ]) {
      const result = run(
        `audit-${name}`,
        'npm',
        ['audit', '--json', ...args, '--registry=https://registry.npmjs.org'],
        consumer,
        true
      )
      const audit = JSON.parse(result.stdout)
      writeJson(join(output, `audit-${name}.json`), audit)
      report.audits[name] = {
        status: result.status,
        vulnerabilities: audit.metadata?.vulnerabilities,
        error: audit.error
      }
    }
    for (const audit of Object.values(report.audits)) {
      assert.equal(audit.status, 0, 'The overridden consumer audit must succeed')
      assert.equal(
        audit.vulnerabilities?.total,
        0,
        'The overridden consumer must have zero audit findings'
      )
    }
    const fixture = join(root, 'apps/viewer-demo/public/example/ct-small.dcm')
    copyFileSync(fixture, join(consumer, 'public/ct-small.dcm'))
    writeFileSync(
      join(consumer, 'index.html'),
      '<!doctype html><html><body><div id="viewer" style="width:480px;height:560px"></div><script type="module" src="/main.js"></script></body></html>'
    )
    writeFileSync(
      join(consumer, 'main.js'),
      `
import { renderFileViewerDicom } from '@file-viewer/renderer-dicom'
const target = document.getElementById('viewer')
let instance
window.dicomPacked = {
  async render() {
    const buffer = await (await fetch('/ct-small.dcm')).arrayBuffer()
    instance = await renderFileViewerDicom(buffer, target, 'dcm', {
      filename: 'ct-small.dcm', options: { locale: 'en-US' }
    })
  },
  pixels() {
    const source = target.querySelector('canvas')
    if (!source || !source.width || !source.height) return null
    const probe = document.createElement('canvas')
    probe.width = source.width
    probe.height = source.height
    const context = probe.getContext('2d')
    context.drawImage(source, 0, 0)
    const values = context.getImageData(0, 0, probe.width, probe.height).data
    let maximum = 0, bright = 0
    for (let index = 0; index < values.length; index += 4) {
      maximum = Math.max(maximum, values[index], values[index + 1], values[index + 2])
      if (values[index] > 16) bright++
    }
    return { width: source.width, height: source.height, maximum, brightRatio: bright / (values.length / 4) }
  },
  async destroy() {
    await instance.destroy()
    return !target.querySelector('.dicom-viewer')
  }
}
`
    )
    checkpoint('vite-build')
    // Vite and Playwright are repository test tools. All application imports
    // resolve from the independent consumer and its physically checked packages.
    const viteRequire = createRequire(join(root, 'apps/viewer-demo/package.json'))
    const vitePath = viteRequire.resolve('vite')
    const { build } = await import(pathToFileURL(vitePath).href)
    report.tooling = { vite: realpathSync(vitePath) }
    const dist = join(consumer, 'dist')
    await build({ root: consumer, logLevel: 'warn', build: { outDir: dist, target: 'es2020' } })
    const mime = {
      '.js': 'application/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.wasm': 'application/wasm'
    }
    const server = createServer((request, response) => {
      try {
        const pathname = new URL(request.url, 'http://localhost').pathname
        const path = resolve(
          dist,
          '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
        )
        if (!path.startsWith(dist + sep) || !existsSync(path) || !statSync(path).isFile()) {
          response.writeHead(404).end()
          return
        }
        response.writeHead(200, {
          'Content-Type': mime[extname(path)] || 'application/octet-stream'
        })
        response.end(readFileSync(path))
      } catch {
        response.writeHead(400).end()
      }
    })
    checkpoint('browser-server')
    await new Promise((accept, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', accept)
    })
    try {
      const playwright = createRequire(join(root, 'package.json'))('playwright')
      for (const name of ['chromium', 'webkit']) {
        checkpoint(name)
        const result = { browser: name, status: 'running', errors: [] }
        report.results.push(result)
        let browser
        let page
        try {
          browser = await playwright[name].launch({ headless: true, timeout: 30_000 })
          result.version = browser.version()
          page = await browser.newPage()
          page.setDefaultTimeout(30_000)
          page.on('pageerror', (error) => result.errors.push(error.message))
          await page.goto(`http://127.0.0.1:${server.address().port}`)
          await page.waitForFunction(() => Boolean(window.dicomPacked))
          await page.evaluate(() => window.dicomPacked.render())
          await retainRenderedPixels(page, result)
          await page.screenshot({ path: join(output, `${name}.png`) })
          assert.equal(await page.evaluate(() => window.dicomPacked.destroy()), true)
          result.cleanup = 'passed'
          assert.deepEqual(result.errors, [])
          result.status = 'passed'
        } catch (error) {
          result.status = 'failed'
          result.error = error.stack || String(error)
          if (page && !page.isClosed()) {
            await page
              .screenshot({ path: join(output, `${name}-failure.png`), timeout: 5_000 })
              .catch((error) => {
                result.screenshotError = error.message
              })
          }
        } finally {
          if (browser) await browser.close()
          writeJson(join(output, 'report.json'), report)
        }
      }
      assert.ok(
        report.results.every((result) => result.status === 'passed'),
        'DICOM browser scenarios failed; inspect report.json and PNG evidence'
      )
    } finally {
      await new Promise((accept) => server.close(accept))
    }
  })
  console.log(
    `Packed DICOM Chromium/WebKit CT pixels and cleanup passed; ${join(output, 'report.json')}`
  )
}

if (process.argv[1] && resolve(process.argv[1]) === script) {
  if (process.argv[2] === '--run') {
    await verifyPackedBrowser(resolve(process.argv[3]))
  } else {
    const output = resolve(
      root,
      'output/dicom-packed-browser',
      new Date().toISOString().replaceAll(':', '-')
    )
    mkdirSync(output, { recursive: true })
    const log = openSync(join(output, 'gate.log'), 'w')
    let result
    try {
      result = spawnSync(process.execPath, [script, '--run', output], {
        cwd: root,
        env: cleanEnvironment(process.env),
        stdio: ['ignore', log, log],
        timeout: 12 * 60_000
      })
    } finally {
      closeSync(log)
    }
    if (result.error || result.status !== 0) {
      const path = join(output, 'report.json')
      const report = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
      report.status = 'failed'
      report.finishedAt = new Date().toISOString()
      report.processFailure = {
        status: result.status,
        signal: result.signal,
        error: result.error?.message
      }
      writeJson(path, report)
      process.exitCode = 1
    }
    console.log(
      `DICOM packed browser ${process.exitCode ? 'failed' : 'passed'}; evidence: ${output}`
    )
  }
}
