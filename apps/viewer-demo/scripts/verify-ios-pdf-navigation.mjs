import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

assert.equal(
  process.platform,
  'darwin',
  'This regression requires Xcode and an iPhone Simulator on macOS'
)
const root = fileURLToPath(new URL('../../..', import.meta.url))
const output = resolve(
  root,
  'output/ios-pdf-navigation',
  new Date().toISOString().replaceAll(':', '-')
)
await mkdir(output, { recursive: true })
function run(command, args, { allowFailure = false, timeout = 600_000 } = {}) {
  const result = spawnSync(command, args, {
    cwd: output,
    encoding: 'utf8',
    timeout,
    maxBuffer: 20 * 1024 * 1024
  })
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error(
      `${command} failed: ${result.error || result.status}\n${result.stdout}\n${result.stderr}`
    )
  }
  return result
}
const devices = JSON.parse(
  run('xcrun', ['simctl', 'list', 'devices', 'available', '--json']).stdout
)
const available = Object.values(devices.devices).flat()
const booted = available.filter(
  (device) => device.state === 'Booted' && device.name.startsWith('iPhone')
)
const udid = process.env.IOS_SIMULATOR_UDID || (booted.length === 1 ? booted[0].udid : undefined)
assert.ok(udid, 'Boot one iPhone Simulator, or select it with IOS_SIMULATOR_UDID')
const device = available.find((entry) => entry.udid === udid)
assert.ok(
  device?.name.startsWith('iPhone') && device.state === 'Booted',
  'Selected iPhone must already be booted'
)
const origin = new URL(process.env.CLOSED_ISSUE_DEMO_URL || 'https://demo.file-viewer.app')
assert.ok(['http:', 'https:'].includes(origin.protocol))
const sample = new URL('/example/pdf.pdf', origin)
const response = await fetch(sample, { signal: AbortSignal.timeout(30_000) })
assert.equal(response.status, 200)
const hash = createHash('sha256')
  .update(Buffer.from(await response.arrayBuffer()))
  .digest('hex')
assert.equal(
  hash,
  '6ba942deee191e84e190c69eff4434dda1bae8b224724498d2bfe38b6812d088',
  'The test headings must match the actual 13-page PDF'
)
origin.searchParams.set('url', sample.pathname)
origin.searchParams.set('regression', `github-243-${Date.now()}`)
await cp(resolve(root, 'apps/viewer-demo/test/ios'), output, { recursive: true })
run(process.env.XCODEGEN_BINARY || 'xcodegen', ['generate'])
// Unsigned test bundles can otherwise remain cached when the test source changes.
run('xcrun', ['simctl', 'uninstall', udid, 'dev.flyfish.fileviewer.regressiontests.xctrunner'], {
  allowFailure: true
})
run('xcrun', ['simctl', 'openurl', udid, origin.href])
const result = run(
  'xcodebuild',
  [
    'test',
    '-project',
    'FileViewerIOSRegressions.xcodeproj',
    '-scheme',
    'PDFNavigation',
    '-destination',
    `platform=iOS Simulator,id=${udid}`,
    '-derivedDataPath',
    '.build',
    '-resultBundlePath',
    'navigation.xcresult',
    '-parallel-testing-enabled',
    'NO',
    '-test-timeouts-enabled',
    'YES',
    '-maximum-test-execution-time-allowance',
    '120'
  ],
  { allowFailure: true }
)
await writeFile(resolve(output, 'xcodebuild.log'), `${result.stdout}\n${result.stderr}`)
await writeFile(
  resolve(output, 'report.json'),
  JSON.stringify(
    {
      origin: origin.href,
      sampleSha256: hash,
      device,
      passed: result.status === 0 && !result.error,
      error: result.error?.message,
      resultBundle: 'navigation.xcresult'
    },
    null,
    2
  ) + '\n'
)
assert.ok(
  result.status === 0 && !result.error,
  `iPhone navigation regression failed; see ${output}/xcodebuild.log`
)
console.log(`[github-243] Real Safari taps 1 -> 2 -> 3 -> 2 -> 1 passed: ${output}`)
