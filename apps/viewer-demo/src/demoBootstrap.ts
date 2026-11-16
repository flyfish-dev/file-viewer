type BootstrapCopyModule = typeof import('./bootstrapCopy')

export function startDemoBootstrap(
  bootstrap: () => Promise<void>,
  loadCopy: () => Promise<BootstrapCopyModule> = () => import('./bootstrapCopy')
) {
  let failed = false
  let applyCopy: BootstrapCopyModule['applyDemoBootstrapCopy'] | undefined

  function applyEnglishCopy() {
    document.documentElement.lang = 'en-US'
    document.querySelector('.app-boot-screen')?.setAttribute(
      'aria-label', failed ? 'File Viewer failed to start' : 'Loading File Viewer'
    )
    const status = document.querySelector('.app-boot-status')
    if (status) status.textContent = failed
      ? 'The preview could not start. Reload the page to try again.'
      : 'Preparing the file preview environment…'
  }

  function renderCopy() {
    // The mounted app owns its language after it replaces the boot shell.
    if (!document.querySelector('.app-boot-screen')) return
    try {
      if (applyCopy) applyCopy(failed)
      else applyEnglishCopy()
    } catch (error) {
      console.error('[file-viewer] Failed to apply the demo language.', error)
      applyCopy = undefined
      applyEnglishCopy()
    }
  }

  const copyReady = Promise.resolve().then(loadCopy).then(module => {
    applyCopy = module.applyDemoBootstrapCopy
    renderCopy()
  }, error => {
    console.error('[file-viewer] Failed to load the demo language.', error)
    renderCopy()
  })

  const appReady = Promise.resolve().then(bootstrap).catch(error => {
    failed = true
    console.error('[file-viewer] Failed to start the demo.', error)
    document.querySelector('.app-boot-screen')?.classList.add('app-boot-screen--error')
    // Present a failure immediately, even while the language chunk is pending.
    // Its eventual callback reads the current state instead of restoring loading.
    renderCopy()
  })

  return { copyReady, appReady }
}
