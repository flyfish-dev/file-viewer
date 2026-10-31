import assert from 'node:assert/strict'
import test from 'node:test'
import { browserTestLaunchOptions } from './browser-test-launch.mjs'

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
