import assert from 'node:assert/strict'
import test from 'node:test'
import { browserTestLaunchOptions, launchBrowserForTest } from './browser-test-launch.mjs'

test('browser checks remain headless unless explicitly selected', () => {
  for (const name of ['chromium', 'firefox', 'webkit']) {
    assert.deepEqual(browserTestLaunchOptions(name, { env: { DISPLAY: ':99' }, platform: 'linux' }), { headless: true })
  }
})

test('an explicit software-display run changes only the selected browser', () => {
  const options = { env: { FILE_VIEWER_HEADFUL_BROWSERS: ' firefox ', DISPLAY: ':99' }, platform: 'linux' }
  assert.deepEqual(browserTestLaunchOptions('firefox', options), { headless: false })
  assert.deepEqual(browserTestLaunchOptions('chromium', options), { headless: true })
  assert.deepEqual(browserTestLaunchOptions('webkit', options), { headless: true })
})

test('invalid browser selectors and missing Linux displays fail before launch', () => {
  assert.throws(() => browserTestLaunchOptions('firefox', {
    env: { FILE_VIEWER_HEADFUL_BROWSERS: 'firefox' }, platform: 'linux'
  }), /requires DISPLAY/)
  assert.throws(() => browserTestLaunchOptions('firefox', {
    env: { FILE_VIEWER_HEADFUL_BROWSERS: 'firefoxx', DISPLAY: ':99' }, platform: 'linux'
  }), /unknown browser/)
})

test('launch preserves the BrowserType receiver and caller options without mutating them', async () => {
  const options = { timeout: 321, args: ['--disable-dev-shm-usage'] }
  const browser = {}
  const type = {
    name: () => 'chromium',
    async launch(actual) {
      assert.equal(this, type)
      assert.deepEqual(actual, { ...options, headless: true })
      return browser
    }
  }
  assert.equal(await launchBrowserForTest(type, 'chromium', options, { env: {} }), browser)
  assert.deepEqual(options, { timeout: 321, args: ['--disable-dev-shm-usage'] })
})

test('Chromium fallback retains options and the explicit headed display policy', async () => {
  const calls = [], browser = {}
  const type = {
    async launch(options) {
      assert.equal(this, type)
      calls.push(options)
      if (calls.length === 1) throw new Error('Bundled Chromium unavailable')
      return browser
    }
  }
  const context = { env: { FILE_VIEWER_HEADFUL_BROWSERS: 'chromium', DISPLAY: ':99' }, platform: 'linux' }
  assert.equal(await launchBrowserForTest(type, 'chromium', { timeout: 321, headless: true }, context), browser)
  assert.deepEqual(calls, [{ timeout: 321, headless: false }, { timeout: 321, headless: false, channel: 'chrome' }])
})

test('CHROME_PATH wins over caller selectors and its failure is returned without fallback', async () => {
  const original = new Error('Explicit Chrome failed'), calls = []
  const type = { async launch(options) { calls.push(options); throw original } }
  await assert.rejects(launchBrowserForTest(type, 'chromium', { channel: 'other', executablePath: '/other', timeout: 321 }, {
    env: { CHROME_PATH: ' /configured/chrome ' }
  }), error => error === original)
  assert.deepEqual(calls, [{ executablePath: '/configured/chrome', timeout: 321, headless: true }])
})

test('two Chromium launch failures retain the original bundled-engine error', async () => {
  const original = new Error('Original bundled-engine diagnostic'), calls = []
  const type = { async launch(options) { calls.push(options); throw calls.length === 1 ? original : new Error('Chrome failed') } }
  await assert.rejects(launchBrowserForTest(type, 'chromium', {}, { env: {} }), error => error === original)
  assert.deepEqual(calls, [{ headless: true }, { headless: true, channel: 'chrome' }])
})

test('Firefox and WebKit never select Chrome even when CHROME_PATH is configured', async () => {
  for (const name of ['firefox', 'webkit']) {
    const original = new Error(`${name} failed`), calls = []
    const type = { name: () => name, async launch(options) { calls.push(options); throw original } }
    await assert.rejects(launchBrowserForTest(type, name, { timeout: 321 }, {
      env: { CHROME_PATH: '/configured/chrome' }
    }), error => error === original)
    assert.deepEqual(calls, [{ timeout: 321, headless: true }])
  }
})

test('caller-requested headed launches also require a Linux display before any attempt', async () => {
  let calls = 0
  const type = { async launch() { calls++ } }
  await assert.rejects(launchBrowserForTest(type, 'chromium', { headless: false }, {
    env: {}, platform: 'linux'
  }), /requires DISPLAY/)
  await assert.rejects(launchBrowserForTest(type, 'webkit', {}, {
    env: { FILE_VIEWER_HEADFUL_BROWSERS: 'webkit' }, platform: 'linux'
  }), /requires DISPLAY/)
  assert.equal(calls, 0)
})

test('invalid policy and mismatched browser types fail before any launch', async () => {
  let calls = 0
  const type = { name: () => 'firefox', async launch() { calls++ } }
  await assert.rejects(launchBrowserForTest(type, 'chromium'), /does not match/)
  await assert.rejects(launchBrowserForTest(type, 'other'), /Unknown browser/)
  await assert.rejects(launchBrowserForTest(type, 'firefox', {}, {
    env: { FILE_VIEWER_HEADFUL_BROWSERS: 'firefoxx' }
  }), /unknown browser/)
  assert.equal(calls, 0)
})

test('an explicit caller executable or channel is not silently replaced on failure', async () => {
  for (const options of [{ executablePath: '/selected/chrome' }, { channel: 'chrome-beta' }]) {
    const original = new Error('Selected engine failed'), calls = []
    const type = { async launch(actual) { calls.push(actual); throw original } }
    await assert.rejects(launchBrowserForTest(type, 'chromium', options, { env: {} }), error => error === original)
    assert.deepEqual(calls, [{ ...options, headless: true }])
  }
})
