import { PptxViewer } from '@file-viewer/pptx'
import { renderFileViewerPresentation } from '@file-viewer/renderer-presentation'
import type { FileViewerRenderedInstance } from '@file-viewer/core'

type ViewerName = 'default' | 'windowed' | 'shadow'
type RendererName = 'rendererA' | 'rendererB'

interface SlideshowTestApi {
  slideCount: (name: ViewerName) => number
  enter: (name: ViewerName, slide?: number) => Promise<void>
  exit: (name: ViewerName) => void
  presenting: (name: ViewerName) => boolean
  activeNumber: (name: ViewerName) => number
  activeSlideHasContent: (name: ViewerName) => boolean
  counter: (name: ViewerName) => string
  transform: (name: ViewerName) => string
  overlayCount: () => number
  scrollTop: () => number
  scrollTo: (y: number) => void
  focusExitButton: (name: ViewerName) => void
  destroy: (name: ViewerName) => void
  unmountRenderer: (name: RendererName) => void
  renderFailure: () => Promise<{ rejected: boolean; childCount: number }>
  exitFullscreen: () => Promise<void>
  fullscreenElementClass: () => string
}

declare global {
  interface Window {
    __slideshowTest?: SlideshowTestApi
  }
}

const viewers = new Map<ViewerName, PptxViewer>()
const renderers = new Map<RendererName, FileViewerRenderedInstance>()

const destroyRenderedInstance = (instance: FileViewerRenderedInstance) => {
  if ('unmount' in instance) {
    void instance.unmount()
  } else if ('$destroy' in instance) {
    void instance.$destroy()
  } else {
    void instance.destroy()
  }
}

const deepAll = (selector: string, root: ParentNode = document): Element[] => {
  const out: Element[] = []
  const walk = (node: ParentNode) => {
    out.push(...Array.from(node.querySelectorAll(selector)))
    for (const el of Array.from(node.querySelectorAll('*'))) {
      if (el.shadowRoot) {
        walk(el.shadowRoot)
      }
    }
  }
  walk(root)
  return out
}

const fetchSample = async () => {
  const response = await fetch('/example/ppt.pptx')
  if (!response.ok) {
    throw new Error(`sample fetch failed: ${response.status}`)
  }
  return response.arrayBuffer()
}

// The raw PptxViewer resolves its worker with `new URL('./worker/pptx.worker.js',
// import.meta.url)`, which the demo build does not rewrite for this entry chunk.
// Point it at the vendored worker copy the demo already ships instead.
const PPTX_WORKER_URL = '/vendor/pptx/pptx.worker.js'

const mountShadowTarget = () => {
  const host = document.getElementById('viewer-shadow-host')!
  const shadow = host.attachShadow({ mode: 'open' })
  const target = document.createElement('div')
  shadow.appendChild(target)
  return target
}

const overlayFor = (name: ViewerName) => {
  const viewer = viewers.get(name)
  if (!viewer) {
    return null
  }
  return deepAll('.flyfish-pptx-presentation').find(overlay => overlay.contains(viewer.content)) || null
}

const waitForReady = async () => {
  const deadline = Date.now() + 60_000
  const allReady = () => {
    const rawReady = (['default', 'windowed', 'shadow'] as ViewerName[]).every(
      name => (viewers.get(name)?.slideCount ?? 0) === 20
    )
    const rendererReady = (['renderer-a', 'renderer-b'] as const).every(id => {
      const element = document.getElementById(id)
      return Boolean(element?.querySelector('.pptx-slideshow-button:not([hidden])'))
    })
    return rawReady && rendererReady
  }
  while (!allReady()) {
    if (Date.now() > deadline) {
      throw new Error('timed out waiting for the harness viewers to render')
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const init = async () => {
  const buffer = await fetchSample()

  // The default and windowed viewers are driven through evaluate, not a user
  // gesture, so native fullscreen is disabled and the overlay stays fixed.
  viewers.set('default', await PptxViewer.open(buffer, document.getElementById('viewer-default')!, {
    workerUrl: PPTX_WORKER_URL,
    presentationFullscreen: false,
  }))
  viewers.set('windowed', await PptxViewer.open(buffer, document.getElementById('viewer-windowed')!, {
    workerUrl: PPTX_WORKER_URL,
    presentationFullscreen: false,
    lazySlides: true,
    listOptions: { windowed: true, initialSlides: 3, batchSize: 4, overscanViewport: 1.5 },
  }))
  viewers.set('shadow', await PptxViewer.open(buffer, mountShadowTarget(), {
    workerUrl: PPTX_WORKER_URL,
  }))

  renderers.set('rendererA', await renderFileViewerPresentation(
    buffer,
    document.getElementById('renderer-a') as HTMLDivElement,
    'pptx',
    {}
  ))
  renderers.set('rendererB', await renderFileViewerPresentation(
    buffer,
    document.getElementById('renderer-b') as HTMLDivElement,
    'pptx',
    {}
  ))

  await waitForReady()

  // Real user gestures so requestFullscreen is allowed in the browser.
  document.getElementById('enter-shadow')!.addEventListener('click', () => {
    void viewers.get('shadow')?.enterPresentation()
  })
  document.getElementById('enter-default')!.addEventListener('click', () => {
    void viewers.get('default')?.enterPresentation()
  })
  document.getElementById('enter-windowed')!.addEventListener('click', () => {
    void viewers.get('windowed')?.enterPresentation()
  })

  window.__slideshowTest = {
    slideCount: name => viewers.get(name)?.slideCount ?? 0,
    enter: async (name, slide) => {
      await viewers.get(name)?.enterPresentation(slide)
    },
    exit: name => viewers.get(name)?.exitPresentation(),
    presenting: name => Boolean(viewers.get(name)?.presenting),
    activeNumber: name => viewers.get(name)?.presentationSlideNumber ?? 0,
    activeSlideHasContent: name => {
      const viewer = viewers.get(name)
      if (!viewer) {
        return false
      }
      const containers = Array.from(
        viewer.content.querySelectorAll<HTMLElement>(':scope > .flyfish-pptx-slide-slot, :scope > .slide')
      )
      const active = containers.find(container => container.classList.contains('is-active-slide'))
      if (!active) {
        return false
      }
      const slide = active.classList.contains('flyfish-pptx-slide-slot')
        ? active.firstElementChild
        : active
      return Boolean(slide && slide.classList.contains('slide') && slide.textContent?.trim())
    },
    counter: name => overlayFor(name)?.querySelector('.flyfish-pptx-presentation-counter')?.textContent ?? '',
    transform: name => viewers.get(name)?.content.style.transform ?? '',
    overlayCount: () => deepAll('.flyfish-pptx-presentation').length,
    scrollTop: () => document.scrollingElement?.scrollTop ?? 0,
    scrollTo: y => window.scrollTo(0, y),
    focusExitButton: name => {
      const button = overlayFor(name)?.querySelector<HTMLButtonElement>('.flyfish-pptx-presentation-exit')
      button?.focus()
    },
    destroy: name => {
      viewers.get(name)?.destroy()
      viewers.delete(name)
    },
    unmountRenderer: name => {
      const instance = renderers.get(name)
      if (instance) {
        destroyRenderedInstance(instance)
      }
      renderers.delete(name)
    },
    renderFailure: async () => {
      const target = document.getElementById('renderer-failure') as HTMLDivElement
      let rejected = false
      try {
        await renderFileViewerPresentation(buffer, target, 'pptx', {
          options: { presentation: { workerUrl: '/missing-pptx-worker.js' } },
        })
      } catch {
        rejected = true
      }
      return { rejected, childCount: target.childElementCount }
    },
    exitFullscreen: () => document.exitFullscreen(),
    fullscreenElementClass: () => {
      const element = document.fullscreenElement
      return element ? element.className || element.tagName : ''
    },
  }

  document.documentElement.dataset.slideshowTestReady = 'true'
}

init().catch(error => {
  console.error('slideshow test harness failed to init:', error)
  document.documentElement.dataset.slideshowTestReady = 'error'
})
