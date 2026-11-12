import { applyDemoBootstrapCopy } from './bootstrapCopy'

applyDemoBootstrapCopy()

async function bootstrap() {
  // Keep the component shell out of the initial entry. The HTML boot screen is
  // immediately visible while the standard Vue component loads on demand.
  const [vue, { default: App }, { default: FileViewer }] = await Promise.all([
    import('vue'),
    import('./App.vue'),
    import('@file-viewer/vue3')
  ])
  const { createApp } = vue
  createApp(App).use(FileViewer)
    .mount('#app')
}

function reportBootstrapFailure(error: unknown) {
  console.error('[file-viewer] Failed to start the demo.', error)

  const bootScreen = document.querySelector<HTMLElement>('.app-boot-screen')
  bootScreen?.classList.add('app-boot-screen--error')
  applyDemoBootstrapCopy(true)
}

void bootstrap().catch(reportBootstrapFailure)
