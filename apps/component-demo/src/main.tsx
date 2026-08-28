import React, { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import FileViewer from '@file-viewer/react-full'
import { mountViewer, type ViewerController } from '@file-viewer/web-full'
import { getDemoSource } from './demoSource'
import './styles.css'

const demoSource = getDemoSource()
const viewerOptions = {
  theme: 'light' as const,
  toolbar: {
    position: 'bottom-right' as const,
    search: false,
    download: true,
    print: false,
    exportHtml: false,
    theme: true,
    zoom: true
  },
  ui: { density: 'compact' as const }
}

function WebViewerPanel() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const controller: ViewerController = mountViewer(containerRef.current, {
      url: demoSource.url,
      filename: demoSource.filename,
      options: viewerOptions
    })

    return () => {
      controller.destroy()
    }
  }, [])

  return <div ref={containerRef} className="viewer-host" data-testid="web-viewer-host" />
}

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img src="/logo.png" alt="" />
          <div>
            <h1>File Viewer</h1>
            <p>Native component examples with the full offline runtime</p>
          </div>
        </div>
        <nav className="topbar-actions" aria-label="Demo links">
          <a href="/manual-js.html" target="_blank" rel="noreferrer">
            Manual JS
          </a>
          <a href="/custom-element.html" target="_blank" rel="noreferrer">
            Custom element
          </a>
          <a href="/manual-iife.html" target="_blank" rel="noreferrer">
            Script tag
          </a>
          <a href="/jquery.html" target="_blank" rel="noreferrer">
            jQuery
          </a>
          <a href="/vue3.html" target="_blank" rel="noreferrer">
            Vue 3
          </a>
          <a href="/svelte-action.html" target="_blank" rel="noreferrer">
            Svelte
          </a>
          <a href="/react-email.html" target="_blank" rel="noreferrer">
            React EML
          </a>
        </nav>
      </header>

      <section className="viewer-grid" aria-label="Component preview">
        <article className="viewer-panel">
          <h2>Vanilla JS / Web Full</h2>
          <div className="viewer-frame">
            <WebViewerPanel />
          </div>
        </article>

        <article className="viewer-panel">
          <h2>React Full</h2>
          <div className="viewer-frame">
            <FileViewer
              url={demoSource.url}
              filename={demoSource.filename}
              options={viewerOptions}
              data-testid="react-viewer"
            />
          </div>
        </article>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
