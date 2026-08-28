import { mountViewer, type ViewerController } from '@file-viewer/web'
import type { FileViewerOptions } from '@file-viewer/core'
import { createOptInFixture, type OptInRendererId } from './opt-in-fixtures'
import './opt-in.css'

declare global {
  interface Window {
    __FILE_VIEWER_OPT_IN_DEMO__?: {
      destroy(): void
      fixtureSha256: string
      fixtureVerified: boolean
      renderer: OptInRendererId
      status: 'loading' | 'ready' | 'error' | 'destroyed'
    }
  }
}

const supportedRenderers = new Set<OptInRendererId>(['dicom', 'signature'])
const requestedRenderer = new URLSearchParams(location.search).get('renderer')
const renderer = supportedRenderers.has(requestedRenderer as OptInRendererId)
  ? (requestedRenderer as OptInRendererId)
  : 'dicom'

const title = document.querySelector<HTMLElement>('#opt-in-title')
const description = document.querySelector<HTMLElement>('#opt-in-description')
const target = document.querySelector<HTMLElement>('#opt-in-viewer')
const errorTarget = document.querySelector<HTMLElement>('#opt-in-error')

if (!target) throw new Error('Missing opt-in viewer mount target.')

const copy =
  renderer === 'dicom'
    ? {
        title: 'DICOM · explicit opt-in',
        description:
          'A deterministic, anonymized DICOM Part 10 fixture rendered with bounded local decoding.'
      }
    : {
        title: 'Digital signature · explicit opt-in',
        description:
          'A deterministic synthetic JWS fixture inspected locally without remote key or certificate access.'
      }

if (title) title.textContent = copy.title
if (description) description.textContent = copy.description
document.body.dataset.optInRenderer = renderer
document.body.dataset.optInStatus = 'loading'

const fixture = createOptInFixture(renderer)
let controller: ViewerController | undefined
const state: NonNullable<Window['__FILE_VIEWER_OPT_IN_DEMO__']> =
  (window.__FILE_VIEWER_OPT_IN_DEMO__ = {
    renderer,
    fixtureSha256: fixture.sha256,
    fixtureVerified: false,
    status: 'loading',
    destroy() {
      controller?.destroy()
      controller = undefined
      state.status = 'destroyed'
      document.body.dataset.optInStatus = 'destroyed'
    }
  })

const loadRenderer = async () => {
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', fixture.buffer))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  if (digest !== fixture.sha256) {
    throw new Error(`Synthetic ${renderer} fixture checksum mismatch.`)
  }
  state.fixtureVerified = true
  const plugin =
    renderer === 'dicom'
      ? (await import('@file-viewer/renderer-dicom')).dicomRenderer
      : (await import('@file-viewer/renderer-signature')).signatureRenderer

  controller = mountViewer(target, {
    buffer: fixture.buffer,
    filename: fixture.filename,
    options: {
      autoRenderers: false,
      preset: plugin as FileViewerOptions['preset'],
      rendererMode: 'replace',
      theme: 'light',
      toolbar: {
        download: false,
        exportHtml: false,
        print: false,
        search: false,
        theme: false,
        zoom: true
      }
    },
    onEvent(event) {
      if (event.type === 'load-complete') {
        state.status = 'ready'
        document.body.dataset.optInStatus = 'ready'
      }
    },
    onStateChange(nextState) {
      if (!nextState.error) return
      state.status = 'error'
      document.body.dataset.optInStatus = 'error'
    }
  })
}

void loadRenderer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  state.status = 'error'
  document.body.dataset.optInStatus = 'error'
  if (errorTarget) {
    errorTarget.hidden = false
    errorTarget.textContent = message
  }
  console.error('[file-viewer] Opt-in renderer demo failed.', error)
})

window.addEventListener('pagehide', () => state.destroy(), { once: true })
