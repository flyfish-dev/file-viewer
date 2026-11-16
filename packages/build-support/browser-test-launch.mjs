export function browserTestLaunchOptions(browserName, { env = process.env, platform = process.platform } = {}) {
  const headed = (env.FILE_VIEWER_HEADFUL_BROWSERS || '').split(',').map(name => name.trim()).filter(Boolean)
  if (headed.some(name => !['chromium', 'firefox', 'webkit'].includes(name))) {
    throw new Error('FILE_VIEWER_HEADFUL_BROWSERS contains an unknown browser')
  }
  const headless = !headed.includes(browserName)
  if (!headless && platform === 'linux' && !env.DISPLAY?.trim()) {
    throw new Error(`Headed ${browserName} requires DISPLAY; run the browser check inside xvfb-run`)
  }
  return { headless }
}

/** Preserve the requested engine; only Chromium can use the installed Chrome fallback. */
export async function launchBrowserForTest(browserType, browserName, options = {}, { env = process.env, platform = process.platform } = {}) {
  if (!['chromium', 'firefox', 'webkit'].includes(browserName)) throw new Error(`Unknown browser: ${browserName}`)
  if (typeof browserType.name === 'function' && browserType.name() !== browserName) {
    throw new Error(`Browser type does not match requested engine: ${browserName}`)
  }
  const policy = browserTestLaunchOptions(browserName, { env, platform })
  const launchOptions = { ...options, headless: options.headless === false ? false : policy.headless }
  if (!launchOptions.headless && platform === 'linux' && !env.DISPLAY?.trim()) {
    throw new Error(`Headed ${browserName} requires DISPLAY; run the browser check inside xvfb-run`)
  }
  if (browserName !== 'chromium') return browserType.launch(launchOptions)

  const executablePath = (env.CHROME_PATH || '').trim()
  if (executablePath) {
    const { channel: _channel, ...configured } = launchOptions
    return browserType.launch({ ...configured, executablePath })
  }
  // A caller-selected executable/channel is also explicit and must fail visibly.
  if (launchOptions.executablePath || launchOptions.channel) return browserType.launch(launchOptions)
  try {
    return await browserType.launch(launchOptions)
  } catch (error) {
    try {
      return await browserType.launch({ ...launchOptions, channel: 'chrome' })
    } catch {
      throw error
    }
  }
}
