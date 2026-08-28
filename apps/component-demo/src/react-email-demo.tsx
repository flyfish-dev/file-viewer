import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as ReactDom from 'react-dom'
import { FileViewer as ReactViewer, type ViewerEvent, type ViewerOptions } from '@file-viewer/react'
import { FileViewer as ReactFullViewer } from '@file-viewer/react-full'
import { FileViewerLegacy } from '@file-viewer/react-legacy'
import { FileViewerLegacy as ReactLegacyFullViewer } from '@file-viewer/react-legacy-full'
import { fileViewerPresetStandard, mergeFullAssetOptions } from '@file-viewer/preset-standard'
import './react-email-demo.css'

const maliciousFilename = 'evil"><img src=x onerror=globalThis.__reactEmailInjected=1>.txt'
const initialFixtureUrl = '/example/react-attachments.eml'
const replacementFixtureUrl = '/example/react-attachments-replacement.eml'

type DemoStatus = 'loading' | 'ready' | 'switching' | 'unmounted' | 'error'

interface ReactEmailDemoApi {
  errors: string[]
  events: string[]
  fixture: 'initial' | 'replacement'
  maliciousFilename: string
  objectUrls: Set<string>
  status: DemoStatus
  workers: Set<Worker>
  mount(): void
  snapshot(): {
    activeObjectUrls: number
    activeWorkers: number
    errors: string[]
    events: string[]
    fixture: 'initial' | 'replacement'
    status: DemoStatus
  }
  switchFixture(): Promise<void>
  unmount(): void
}

declare global {
  interface Window {
    __FILE_VIEWER_REACT_EMAIL_DEMO__?: ReactEmailDemoApi
    __reactEmailInjected?: number
  }
}

const api: ReactEmailDemoApi = {
  errors: [],
  events: [],
  fixture: 'initial',
  maliciousFilename,
  objectUrls: new Set(),
  status: 'loading',
  workers: new Set(),
  mount() {},
  async switchFixture() {},
  unmount() {},
  snapshot() {
    return {
      activeObjectUrls: api.objectUrls.size,
      activeWorkers: api.workers.size,
      errors: [...api.errors],
      events: [...api.events],
      fixture: api.fixture,
      status: api.status
    }
  }
}
window.__FILE_VIEWER_REACT_EMAIL_DEMO__ = api

const nativeCreateObjectUrl = URL.createObjectURL.bind(URL)
const nativeRevokeObjectUrl = URL.revokeObjectURL.bind(URL)
URL.createObjectURL = (blob) => {
  const url = nativeCreateObjectUrl(blob)
  api.objectUrls.add(url)
  return url
}
URL.revokeObjectURL = (url) => {
  api.objectUrls.delete(url)
  nativeRevokeObjectUrl(url)
}

const NativeWorker = window.Worker
if (NativeWorker) {
  const TrackedWorker = new Proxy(NativeWorker, {
    construct(Target, argumentsList) {
      const worker = Reflect.construct(Target, argumentsList, Target)
      api.workers.add(worker)
      const terminate = worker.terminate.bind(worker)
      worker.terminate = () => {
        api.workers.delete(worker)
        terminate()
      }
      return worker
    }
  })
  Object.defineProperty(window, 'Worker', { configurable: true, value: TrackedWorker })
}

window.addEventListener('error', (event) => {
  api.errors.push(String(event.error?.stack || event.message))
})
window.addEventListener('unhandledrejection', (event) => {
  api.errors.push(String(event.reason?.stack || event.reason))
})

const standardOptions: ViewerOptions = mergeFullAssetOptions(
  {
    autoRenderers: false,
    preset: fileViewerPresetStandard,
    rendererMode: 'replace',
    theme: 'light'
  },
  '/file-viewer/'
)
const fullOptions: ViewerOptions = { theme: 'light' }

const cases = [
  {
    id: 'react-standard',
    label: 'React · standard preset',
    Viewer: ReactViewer,
    options: standardOptions
  },
  {
    id: 'react-full',
    label: 'React Full · compatibility preset',
    Viewer: ReactFullViewer,
    options: fullOptions
  },
  {
    id: 'react-legacy-standard',
    label: 'React Legacy · standard preset',
    Viewer: FileViewerLegacy,
    options: standardOptions
  },
  {
    id: 'react-legacy-full',
    label: 'React Legacy Full · compatibility preset',
    Viewer: ReactLegacyFullViewer,
    options: fullOptions
  }
] as const

interface MatrixViewerProps {
  buffer: ArrayBuffer
  className: string
  filename: string
  onEvent(event: ViewerEvent): void
  options: ViewerOptions
}

const loadFixture = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`EML fixture returned HTTP ${response.status}: ${url}`)
  return response.arrayBuffer()
}

function App() {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [mounted, setMounted] = useState(true)
  const [fixture, setFixture] = useState<'initial' | 'replacement'>('initial')

  const setStatus = useCallback((status: DemoStatus) => {
    api.status = status
    document.body.dataset.reactEmailStatus = status
  }, [])

  useEffect(() => {
    void loadFixture(initialFixtureUrl)
      .then((value) => {
        setBuffer(value)
        setStatus('ready')
      })
      .catch((error) => {
        api.errors.push(error instanceof Error ? error.stack || error.message : String(error))
        setStatus('error')
      })
  }, [setStatus])

  const switchFixture = useCallback(async () => {
    setStatus('switching')
    const next = fixture === 'initial' ? 'replacement' : 'initial'
    const value = await loadFixture(next === 'initial' ? initialFixtureUrl : replacementFixtureUrl)
    api.fixture = next
    setFixture(next)
    setBuffer(value)
    setStatus('ready')
  }, [fixture, setStatus])

  const unmount = useCallback(() => {
    setMounted(false)
    setStatus('unmounted')
  }, [setStatus])

  const mount = useCallback(() => {
    setMounted(true)
    setStatus('ready')
  }, [setStatus])

  useEffect(() => {
    api.switchFixture = switchFixture
    api.unmount = unmount
    api.mount = mount
  }, [mount, switchFixture, unmount])

  const source = useMemo(
    () => (buffer ? { buffer, filename: `react-email-${fixture}.eml` } : null),
    [buffer, fixture]
  )
  const onEvent = useCallback((id: string, event: ViewerEvent) => {
    api.events.push(`${id}:${event.type}`)
  }, [])

  return (
    <main className="react-email-shell">
      <header className="react-email-toolbar">
        <div>
          <h1>React EML attachment lifecycle</h1>
          <p>Standard, Full, Legacy standard, and Legacy Full use one fixed synthetic fixture.</p>
        </div>
        <div className="react-email-actions">
          <button id="switch-fixture" type="button" onClick={() => void switchFixture()}>
            Switch fixture
          </button>
          <button id="unmount-viewers" type="button" onClick={unmount}>
            Unmount viewers
          </button>
          <button id="mount-viewers" type="button" onClick={mount}>
            Mount viewers
          </button>
          <a href="/">Component examples</a>
        </div>
      </header>
      {mounted && source ? (
        <section className="react-email-grid" aria-label="React package EML matrix">
          {cases.map(({ id, label, Viewer, options }) => {
            // The legacy packages intentionally publish against an older React type surface.
            // Runtime props are shared; normalize only this cross-version verification matrix.
            const ViewerComponent = Viewer as unknown as React.ComponentType<MatrixViewerProps>
            return (
              <article className="react-email-case" id={id} key={id}>
                <h2>{label}</h2>
                <ViewerComponent
                  className="react-email-viewer"
                  buffer={source.buffer}
                  filename={source.filename}
                  options={options}
                  onEvent={(event) => onEvent(id, event)}
                />
              </article>
            )
          })}
        </section>
      ) : (
        <section className="react-email-empty" data-testid="react-email-empty">
          {source ? 'All viewers are unmounted.' : 'Loading fixed EML fixture…'}
        </section>
      )}
    </main>
  )
}

const root = document.getElementById('root')!
const reactDom17 = ReactDom as unknown as {
  render(element: React.ReactElement, container: Element): void
  unmountComponentAtNode(container: Element): boolean
}
reactDom17.render(<App />, root)
window.addEventListener('pagehide', () => reactDom17.unmountComponentAtNode(root), { once: true })
