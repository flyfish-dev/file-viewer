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
