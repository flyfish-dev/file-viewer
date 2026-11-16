import assert from 'node:assert/strict'
import test from 'node:test'
import { launchChromium } from './chromium-launch.mjs'

test('uses bundled Chromium when it launches without trying another engine', async () => {
  const browser = {}
  const calls = []
  const result = await launchChromium({
    async launch(options) {
      calls.push(options)
      return browser
    }
  }, { env: {} })
  assert.equal(result, browser)
  assert.deepEqual(calls, [{ headless: true }])
})

test('uses installed Chrome when bundled Chromium is unavailable', async () => {
  const browser = {}
  const calls = []
  const result = await launchChromium({
    async launch(options) {
      calls.push(options)
      if (calls.length === 1) throw new Error('Bundled Chromium is not installed')
      return browser
    }
  }, { env: {} })
  assert.equal(result, browser)
  assert.deepEqual(calls, [{ headless: true }, { channel: 'chrome', headless: true }])
})

test('preserves the original failure if installed Chrome also cannot launch', async () => {
  const original = new Error('Bundled Chromium is not installed')
  const calls = []
  await assert.rejects(launchChromium({
    async launch(options) {
      calls.push(options)
      throw calls.length === 1 ? original : new Error('Installed Chrome cannot launch')
    }
  }, { env: {} }), error => error === original)
  assert.deepEqual(calls, [{ headless: true }, { channel: 'chrome', headless: true }])
})

test('uses an explicit CHROME_PATH without selecting another executable', async () => {
  const browser = {}
  const calls = []
  const result = await launchChromium({
    async launch(options) {
      calls.push(options)
      return browser
    }
  }, { env: { CHROME_PATH: ' /Applications/Google Chrome.app/Contents/MacOS/Google Chrome ' } })
  assert.equal(result, browser)
  assert.deepEqual(calls, [{
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }])
})

test('does not hide an explicit CHROME_PATH failure with a fallback engine', async () => {
  const original = new Error('Configured Chrome executable does not exist')
  const calls = []
  await assert.rejects(launchChromium({
    async launch(options) {
      calls.push(options)
      throw original
    }
  }, { env: { CHROME_PATH: '/missing/chrome' } }), error => error === original)
  assert.deepEqual(calls, [{ headless: true, executablePath: '/missing/chrome' }])
})

test('ignores a blank CHROME_PATH and retains normal engine selection', async () => {
  const calls = []
  await launchChromium({
    async launch(options) {
      calls.push(options)
      return {}
    }
  }, { env: { CHROME_PATH: ' \t ' } })
  assert.deepEqual(calls, [{ headless: true }])
})
