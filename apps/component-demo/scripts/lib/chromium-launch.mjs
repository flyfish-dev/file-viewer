import { launchBrowserForTest } from '../../../../packages/build-support/browser-test-launch.mjs'

export function launchChromium(chromium, context = {}) {
  return launchBrowserForTest(chromium, 'chromium', {}, context)
}
