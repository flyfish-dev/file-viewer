import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, delimiter, dirname, extname, join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { pnpmInvocation } from '../../../../.github/scripts/lib/pinned-pnpm.mjs'
import {
  assertNoAncestorNodeModules,
  cleanEnvironment,
  containedPath,
  installedPackage,
  retainEvidence
} from '../../../renderers/dicom/scripts/verify-packed-browser.mjs'

const root = resolve(import.meta.dirname, '../../../..')
const node20Consumer = process.argv.includes('--node20-consumer')
const consumerNode = node20Consumer ? process.env.FILE_VIEWER_CONSUMER_NODE : undefined
const consumerNpmCli = node20Consumer ? process.env.FILE_VIEWER_CONSUMER_NPM_CLI : undefined
if (node20Consumer)
  assert.ok(
    consumerNode && consumerNpmCli,
    'Node20 consumer mode requires explicit FILE_VIEWER_CONSUMER_NODE and FILE_VIEWER_CONSUMER_NPM_CLI paths'
  )
const output = resolve(
  root,
  'output/mermaid-packed-browser',
  new Date().toISOString().replaceAll(':', '-')
)
const consumer = realpathSync(mkdtempSync(join(tmpdir(), 'file-viewer-mermaid-packed-')))
const cache = join(consumer, '.npm-cache')
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
mkdirSync(output, { recursive: true })
mkdirSync(cache)
const environment = cleanEnvironment(process.env)
for (const name of Object.keys(environment))
  if (/^npm_config_(cache|userconfig|globalconfig|prefix|node_options)$/i.test(name))
    delete environment[name]
Object.assign(environment, {
  npm_config_cache: cache,
  npm_config_userconfig: join(consumer, '.npmrc'),
  npm_config_globalconfig: join(consumer, '.npmrc-global')
})
const consumerEnvironment = node20Consumer
  ? { ...environment, PATH: `${dirname(consumerNode)}${delimiter}${environment.PATH}` }
  : environment
const report = {
  status: 'running',
  startedAt: new Date().toISOString(),
  node: process.version,
  scope:
    'Source-packed ordinary Mermaid/Markdown/drawing consumer without overrides; cold audit, real math/SVG and offline browser behavior; not registry release proof',
  isolation: {
    consumer,
    cacheInitiallyEmpty: readdirSync(cache).length === 0,
    nodePath: null,
    nodeOptions: null
  },
  consumerMode: node20Consumer ? 'node20-esbuild' : 'source-vite',
  commands: [],
  results: []
}
const run = (name, command, args, cwd, allowFailure = false, commandEnvironment = environment) => {
  report.stage = name
  writeJson(join(output, 'report.json'), report)
  const result = spawnSync(command, args, {
    cwd,
    env: commandEnvironment,
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 16 * 1024 * 1024
  })
  writeFileSync(join(output, `${name}.log`), `${result.stdout || ''}${result.stderr || ''}`)
  report.commands.push({
    name,
    command,
    args,
    status: result.status,
    signal: result.signal,
    error: result.error?.message
  })
  if (result.error || (!allowFailure && result.status !== 0))
    throw new Error(`${name} failed; inspect ${output}/${name}.log`)
  return result
}
const runNpm = (name, args, allowFailure = false) =>
  node20Consumer
    ? run(
        name,
        consumerNode,
        [consumerNpmCli, ...args],
        consumer,
        allowFailure,
        consumerEnvironment
      )
    : run(name, 'npm', args, consumer, allowFailure)

try {
  await retainEvidence(output, consumer, report, async () => {
    assert.equal(process.env.NODE_OPTIONS, undefined)
    assert.equal(process.env.NODE_PATH, undefined)
    assertNoAncestorNodeModules(consumer)
    report.isolation.ancestorNodeModulesAbsent = true
    writeFileSync(
      join(consumer, '.npmrc'),
      'registry=https://registry.npmjs.org\nengine-strict=true\n'
    )
    writeFileSync(join(consumer, '.npmrc-global'), '')
    if (node20Consumer) {
      report.consumerNode = run(
        'consumer-node-version',
        consumerNode,
        ['--version'],
        consumer
      ).stdout.trim()
      assert.match(
        report.consumerNode,
        /^v20\./,
        'The consumer install and browser build must actually run on Node20'
      )
      report.consumerNpm = runNpm('consumer-npm-version', ['--version']).stdout.trim()
    }
    const pnpm = pnpmInvocation()
    const packs = join(output, 'packs')
    mkdirSync(packs)
    const sources = {
      core: 'packages/core',
      'renderer-text': 'packages/renderers/text',
      'capability-mermaid': 'packages/capabilities/mermaid',
      'renderer-drawing': 'packages/renderers/drawing'
    }
    const versions = Object.fromEntries(
      Object.entries(sources).map(([name, path]) => [
        name,
        JSON.parse(readFileSync(join(root, path, 'package.json'), 'utf8')).version
      ])
    )
    report.source = {
      commit: run('source-commit', 'git', ['rev-parse', 'HEAD'], root).stdout.trim(),
      changes: run('source-status', 'git', ['status', '--porcelain'], root).stdout.trim()
    }
    report.tarballs = {}
    const dependencies = {}
    for (const [name, version] of Object.entries(versions)) {
      run(
        `pack-${name}`,
        pnpm.command,
        [...pnpm.args, '--filter', `@file-viewer/${name}`, 'pack', '--pack-destination', packs],
        root
      )
      const path = join(packs, `file-viewer-${name}-${version}.tgz`)
      dependencies[`@file-viewer/${name}`] = `file:${path}`
      report.tarballs[basename(path)] = hash(path)
    }
    report.consumerManifest = {
      name: 'file-viewer-mermaid-packed-browser-regression',
      private: true,
      type: 'module',
      dependencies
    }
    writeJson(join(consumer, 'package.json'), report.consumerManifest)
    runNpm('cold-install', ['install', '--no-audit', '--no-fund'])
    report.entries = Object.entries(versions).map(([name, version]) =>
      installedPackage(consumer, `@file-viewer/${name}`, version)
    )
    const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'))
    assert.equal(
      lock.packages['node_modules/mermaid'],
      undefined,
      'Consumers install the compiled engine, without the Node22 Mermaid source dependency'
    )
    assert.equal(
      lock.packages['node_modules/katex'],
      undefined,
      'Reviewed KaTeX bytes are bundled with the engine'
    )
    for (const [path, metadata] of Object.entries(lock.packages)) {
      if (!path) continue
      const manifestPath = join(consumer, path, 'package.json')
      if (!existsSync(manifestPath) && metadata.optional) continue
      const actual = JSON.parse(
        readFileSync(containedPath(join(consumer, 'node_modules'), manifestPath), 'utf8')
      )
      assert.equal(
        actual.version,
        metadata.version,
        `Installed dependency version drifted: ${path}`
      )
    }
    report.consumerLockSha256 = hash(join(consumer, 'package-lock.json'))
    writeJson(join(output, 'production-package.json'), report.consumerManifest)
    writeFileSync(
      join(output, 'production-package-lock.json'),
      readFileSync(join(consumer, 'package-lock.json'))
    )
    report.audits = {}
    for (const [name, args] of [
      ['full', []],
      ['production', ['--omit=dev']]
    ]) {
      const result = runNpm(`audit-${name}`, ['audit', '--json', ...args], true)
      const data = JSON.parse(result.stdout)
      writeJson(join(output, `audit-${name}.json`), data)
      report.audits[name] = {
        status: result.status,
        vulnerabilities: data.metadata?.vulnerabilities,
        error: data.error
      }
      assert.equal(result.status, 0, 'Ordinary packed Mermaid consumer audit must pass')
      assert.equal(
        data.metadata?.vulnerabilities?.total,
        0,
        'Ordinary packed Mermaid consumer must have zero advisories'
      )
    }
    const runtime = join(consumer, 'node_modules/@file-viewer/capability-mermaid/dist')
    const bundled = JSON.parse(readFileSync(join(runtime, 'bundled-runtime.json'), 'utf8'))
    for (const [name, record] of Object.entries(bundled.files))
      assert.equal(
        hash(join(runtime, name)),
        record.sha256,
        `Installed runtime bytes changed: ${name}`
      )
    for (const [name, version] of [
      ['mermaid', '12.1.0'],
      ['katex', '0.18.2']
    ])
      assert.ok(
        bundled.packages.some((p) => p.name === name && p.version === version),
        `Missing reviewed ${name}`
      )
    assert.ok(
      bundled.packages.every(
        (p) =>
          p.license &&
          /^[a-f0-9]{64}$/.test(p.packageJsonSha256) &&
          Object.keys(p.licenseFiles).length > 0
      ),
      'Every bundled input must record its declared license and actual license text hash'
    )
    assert.ok(
      readFileSync(join(runtime, 'THIRD_PARTY_LICENSES.txt'), 'utf8').includes(
        'Permission is hereby granted'
      ),
      'Bundled third-party license text is missing'
    )
    report.bundledRuntime = {
      manifestSha256: hash(join(runtime, 'bundled-runtime.json')),
      packages: bundled.packages,
      filesVerified: Object.keys(bundled.files).length
    }
    writeFileSync(
      join(consumer, 'index.html'),
      '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="markdown" style="width:720px;height:480px"></div><div id="drawing" style="width:720px;height:480px"></div><script type="module" src="/main.js"></script></body></html>'
    )
    writeFileSync(
      join(consumer, 'main.js'),
      `
import '@file-viewer/capability-mermaid'
import { renderFileViewerMarkdown } from '@file-viewer/renderer-text'
import { renderFileViewerDrawing } from '@file-viewer/renderer-drawing'
const encoder = new TextEncoder()
const instances = []
window.mermaidPacked = {
  async render(caseName = 'flowchart') {
    const source = caseName === 'math' ? String.raw\`flowchart LR\nA["$$x^2$$"] --> B["$$\\sqrt{x}$$"]\` : caseName === 'sequence' ? 'sequenceDiagram\\nparticipant Bob @{ "type" : "database" }\\nparticipant Link\\nLink->>Bob: Cold sequence\\nBob-->>Link: Offline response' : 'flowchart LR\\nA[Cold] --> B[Offline]'
    instances.push(await renderFileViewerMarkdown(encoder.encode('# Verified Mermaid\\n\\n' + '\`\`\`mermaid\\n' + source + '\\n\`\`\`').buffer, document.getElementById('markdown'), 'md', { filename: 'cold.md', options: { locale: 'en-US' } }))
    instances.push(await renderFileViewerDrawing(encoder.encode(source).buffer, document.getElementById('drawing'), 'mmd', { filename: 'cold.mmd', options: { locale: 'en-US' } }))
    await document.fonts.ready
  },
  async rejectExternal(encoded = false) {
    const source = encoded
      ? 'flowchart LR\\nA["$$x^2$$ <img src=&#104;ttps://example.invalid/never-request.png>"]'
      : 'flowchart LR\\nA["<img src=\\"https://example.invalid/never-request.png\\">"]'
    const instance = await renderFileViewerMarkdown(encoder.encode('\`\`\`mermaid\\n' + source + '\\n\`\`\`').buffer, document.getElementById('markdown'), 'md', { filename: 'external.md', options: { locale: 'en-US' } })
    const rejected = Boolean(document.querySelector('.markdown-mermaid-error')) && !document.querySelector('#markdown .markdown-mermaid svg')
    await instance.unmount()
    return rejected
  },
  async destroy() { for (const instance of instances.splice(0)) await instance.unmount() }
}
`
    )
    const dist = join(consumer, 'dist')
    if (node20Consumer) {
      runNpm('install-consumer-bundler', [
        'install',
        '--save-dev',
        '--save-exact',
        '--no-audit',
        '--no-fund',
        'esbuild@0.28.2'
      ])
      for (const [path, metadata] of Object.entries(lock.packages)) {
        if (!path) continue
        const manifestPath = join(consumer, path, 'package.json')
        if (!existsSync(manifestPath) && metadata.optional) continue
        assert.equal(
          JSON.parse(readFileSync(manifestPath, 'utf8')).version,
          metadata.version,
          `Test tooling changed the production dependency: ${path}`
        )
      }
      for (const [name, record] of Object.entries(bundled.files))
        assert.equal(
          hash(join(runtime, name)),
          record.sha256,
          `Test tooling changed the installed engine: ${name}`
        )
      mkdirSync(dist)
      writeFileSync(join(dist, 'index.html'), readFileSync(join(consumer, 'index.html')))
      writeFileSync(
        join(consumer, 'build-consumer.mjs'),
        `import { build } from 'esbuild';\nconsole.log(JSON.stringify({ node: process.version, bundler: 'esbuild@0.28.2' }));\nawait build({ entryPoints: ['main.js'], outdir: 'dist', bundle: true, format: 'esm', platform: 'browser', target: 'es2020', splitting: true, loader: { '.woff': 'file', '.woff2': 'file', '.ttf': 'file', '.eot': 'file', '.svg': 'file', '.png': 'file' }, logLevel: 'warning' });\n`
      )
      const build = run(
        'node20-browser-build',
        consumerNode,
        ['build-consumer.mjs'],
        consumer,
        false,
        consumerEnvironment
      )
      report.consumerBuild = JSON.parse(build.stdout.trim().split('\n')[0])
      assert.equal(report.consumerBuild.node, report.consumerNode)
    } else {
      const viteRequire = createRequire(join(root, 'packages/capabilities/mermaid/package.json'))
      const { build } = await import(pathToFileURL(viteRequire.resolve('vite')).href)
      await build({ root: consumer, logLevel: 'warn', build: { outDir: dist, target: 'es2020' } })
    }
    const server = createServer((request, response) => {
      try {
        const name = new URL(request.url, 'http://localhost').pathname
        const path = resolve(dist, '.' + decodeURIComponent(name === '/' ? '/index.html' : name))
        if (!path.startsWith(dist + sep) || !existsSync(path) || !statSync(path).isFile()) {
          response.writeHead(404).end()
          return
        }
        response
          .writeHead(200, {
            'Content-Type':
              {
                '.js': 'application/javascript',
                '.html': 'text/html',
                '.css': 'text/css',
                '.wasm': 'application/wasm',
                '.woff2': 'font/woff2'
              }[extname(path)] || 'application/octet-stream'
          })
          .end(readFileSync(path))
      } catch {
        response.writeHead(400).end()
      }
    })
    await new Promise((accept, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', accept)
    })
    try {
      const origin = `http://127.0.0.1:${server.address().port}`
      const playwright = createRequire(join(root, 'package.json'))('playwright')
      for (const name of ['chromium', 'webkit']) {
        const result = { browser: name, errors: [], externalRequests: [], failedResponses: [] }
        report.results.push(result)
        const browser = await playwright[name].launch({ headless: true })
        try {
          result.version = browser.version()
          const page = await browser.newPage({ viewport: { width: 1000, height: 1100 } })
          page.on('pageerror', (error) => result.errors.push(error.message))
          page.on('response', (response) => {
            if (response.status() >= 400)
              result.failedResponses.push({ url: response.url(), status: response.status() })
          })
          await page.route('**/*', (route) => {
            if (new URL(route.request().url()).origin === origin) return route.continue()
            result.externalRequests.push(route.request().url())
            return route.abort()
          })
          await page.goto(origin)
          await page.waitForFunction(() => Boolean(window.mermaidPacked))
          for (const caseName of ['flowchart', 'math', 'sequence']) {
            await page.evaluate((caseName) => window.mermaidPacked.render(caseName), caseName)
            await page.waitForFunction(
              () =>
                document.querySelector('#drawing svg') ||
                document.querySelector('#drawing .drawing-state.error')
            )
            await page.evaluate(
              () =>
                new Promise((accept) => requestAnimationFrame(() => requestAnimationFrame(accept)))
            )
            const evidence = await page.evaluate(() =>
              ['markdown', 'drawing'].map((id) => {
                const target = document.getElementById(id),
                  svg = target.querySelector('svg'),
                  box = svg?.getBoundingClientRect()
                const viewport = target.getBoundingClientRect()
                const mathLabels = Array.from(svg?.querySelectorAll('.katex') || []).map((node) => {
                  const bounds = node.getBoundingClientRect()
                  return {
                    width: bounds.width,
                    height: bounds.height,
                    visible:
                      bounds.width > 0 &&
                      bounds.height > 0 &&
                      bounds.left >= viewport.left - 1 &&
                      bounds.right <= viewport.right + 1 &&
                      bounds.top >= viewport.top - 1 &&
                      bounds.bottom <= viewport.bottom + 1
                  }
                })
                return {
                  id,
                  svg: Boolean(svg),
                  width: box?.width,
                  height: box?.height,
                  text: Array.from(svg?.querySelectorAll('text, .nodeLabel') || [])
                    .map((node) => node.textContent)
                    .join(' ')
                    .slice(0, 300),
                  mathNodes: mathLabels.length,
                  mathLabels,
                  errors: target.querySelectorAll('[role="alert"], .drawing-state.error').length,
                  errorText: target.querySelector('.drawing-state.error')?.textContent
                }
              })
            )
            assert.ok(
              evidence.every((e) => e.svg && e.width > 20 && e.height > 20 && e.errors === 0),
              `Missing actual Mermaid SVG: ${JSON.stringify(evidence)}`
            )
            if (caseName === 'math')
              assert.ok(
                evidence.every(
                  (e) => e.mathNodes === 2 && e.mathLabels.every((label) => label.visible)
                ),
                `Both KaTeX labels must be visibly inside the viewer: ${JSON.stringify(evidence)}`
              )
            else if (caseName === 'sequence')
              assert.ok(
                evidence.every(
                  (e) =>
                    e.text.includes('Bob') &&
                    e.text.includes('Link') &&
                    e.text.includes('Cold sequence') &&
                    e.text.includes('Offline response')
                ),
                'Mermaid12 must render spaced participant config and the Link participant through both consumers'
              )
            else
              assert.ok(
                evidence.every((e) => e.text.includes('Cold') && e.text.includes('Offline')),
                'Rendered diagram labels must match the source'
              )
            result[caseName] = evidence
            await page.screenshot({ path: join(output, `${name}-${caseName}.png`) })
            await page.evaluate(() => window.mermaidPacked.destroy())
            assert.equal(
              await page.evaluate(
                () => document.querySelectorAll('#markdown svg, #drawing svg').length
              ),
              0,
              'Both Mermaid consumers must release their SVG on unmount'
            )
          }
          assert.equal(
            await page.evaluate(() => window.mermaidPacked.rejectExternal()),
            true,
            'External Mermaid resource must remain rejected'
          )
          assert.equal(
            await page.evaluate(() => window.mermaidPacked.rejectExternal(true)),
            true,
            'Encoded resources must be rejected before generating math labels'
          )
          assert.deepEqual(
            result.externalRequests,
            [],
            'Ordinary Mermaid rendering must be offline'
          )
          assert.deepEqual(
            result.failedResponses,
            [],
            'All bundled runtime/font assets must resolve'
          )
          assert.deepEqual(
            result.errors,
            [],
            'Packed Mermaid must render without browser exceptions'
          )
          result.status = 'passed'
        } catch (error) {
          result.status = 'failed'
          result.error = error.stack || String(error)
          throw error
        } finally {
          await browser.close()
        }
      }
    } finally {
      await new Promise((accept) => server.close(accept))
    }
  })
  console.log(`Packed Mermaid browser passed; evidence: ${output}`)
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
