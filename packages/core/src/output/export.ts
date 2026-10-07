import type {
  FileRenderExportAdapter,
  FileRenderExportOptions,
} from '../contracts/types'

/** Lightweight export helpers that remain on the normal viewer path. */
export const triggerFileViewerBlobDownload = (blob: Blob, name: string) => {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
}

export const triggerFileViewerUrlDownload = (url: string, name: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// Copy only presentation properties. The bitmap's pixel dimensions may be
// several times larger than its CSS box, and canvas-only selectors will no
// longer match after replacing the node with an image.
const CANVAS_PRESENTATION_PROPERTIES = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'box-sizing',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
  'transform', 'transform-origin', 'vertical-align', 'float', 'clear',
  'opacity', 'visibility', 'z-index', 'align-self', 'justify-self',
  'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'grid-area',
] as const

export const replaceFileViewerCanvasWithImages = (source: HTMLElement, clone: HTMLElement) => {
  const sourceCanvases = Array.from(source.querySelectorAll('canvas'))
  const clonedCanvases = Array.from(clone.querySelectorAll('canvas'))

  clonedCanvases.forEach((canvas, index) => {
    const sourceCanvas = sourceCanvases[index]
    if (!sourceCanvas) return
    try {
      const image = canvas.ownerDocument.createElement('img')
      image.src = sourceCanvas.toDataURL('image/png')
      image.alt = sourceCanvas.getAttribute('aria-label') || 'rendered canvas'
      image.className = canvas.className
      image.id = canvas.id
      image.style.cssText = canvas.style.cssText
      const style = sourceCanvas.ownerDocument.defaultView?.getComputedStyle(sourceCanvas)
      if (style) {
        for (const property of CANVAS_PRESENTATION_PROPERTIES) {
          const value = style.getPropertyValue(property)
          if (value) image.style.setProperty(property, value, canvas.style.getPropertyPriority(property))
        }
      }
      // Detached canvases have no used style; keep their normal intrinsic size.
      if (!image.style.width || image.style.width === 'auto') image.style.width = `${sourceCanvas.width}px`
      if (!image.style.height || image.style.height === 'auto') image.style.height = `${sourceCanvas.height}px`
      canvas.replaceWith(image)
    } catch {
      // A canvas tainted by cross-origin resources cannot be exported.
    }
  })
}

export const waitForFileViewerNextPaint = (
  targetWindow?: Partial<Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame' | 'setTimeout' | 'clearTimeout'>>
) => {
  return new Promise<void>(resolve => {
    const currentWindow = targetWindow || globalThis.window
    const schedule = currentWindow?.setTimeout?.bind(currentWindow) || globalThis.setTimeout.bind(globalThis)
    const cancel = currentWindow?.clearTimeout?.bind(currentWindow) || globalThis.clearTimeout.bind(globalThis)
    let frame: number | undefined
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      cancel(timeout)
      if (frame !== undefined) currentWindow?.cancelAnimationFrame?.(frame)
      resolve()
    }
    // Background tabs and hidden print hosts may never run animation frames.
    const timeout = schedule(finish, currentWindow?.requestAnimationFrame ? 250 : 0)
    if (!currentWindow?.requestAnimationFrame) return
    try {
      frame = currentWindow.requestAnimationFrame(() => {
        if (!finished) {
          try { frame = currentWindow.requestAnimationFrame!(finish) } catch { finish() }
        }
      })
    } catch {
      finish()
    }
  })
}

const waitForImage = (image: HTMLImageElement, timeoutMs: number) => {
  if (image.complete) return Promise.resolve()
  return new Promise<void>(resolve => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      image.removeEventListener('load', finish)
      image.removeEventListener('error', finish)
      resolve()
    }
    // Start the timeout before decode(): a stalled decode must not bypass it.
    const timeout = setTimeout(finish, timeoutMs)
    image.addEventListener('load', finish, { once: true })
    image.addEventListener('error', finish, { once: true })
    if (image.complete) finish()
    else if (typeof image.decode === 'function') {
      try {
        image.decode().then(finish, () => {
          // An error/load event may already have fired before decode rejects.
          if (image.complete) finish()
        })
      } catch {
        if (image.complete) finish()
      }
    }
  })
}

const waitForFonts = async (documentRef: Document | undefined, timeoutMs: number) => {
  if (!documentRef?.fonts) return
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      documentRef.fonts.ready,
      new Promise<void>(resolve => { timeout = setTimeout(resolve, timeoutMs) }),
    ])
  } catch {
    // A failed optional font should not prevent the browser's fallback print.
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

export const waitForFileViewerImages = async (root: ParentNode | null | undefined) => {
  if (!root || typeof root.querySelectorAll !== 'function') return
  await Promise.all(Array.from(root.querySelectorAll('img'), image => waitForImage(image, 5000)))
}

const bytesToDataUrl = (bytes: ArrayBuffer, mimeType: string) => {
  const type = mimeType || 'application/octet-stream'
  const nodeBuffer = (globalThis as { Buffer?: { from(data: ArrayBuffer): { toString(encoding: string): string } } }).Buffer
  if (nodeBuffer) {
    return `data:${type};base64,${nodeBuffer.from(bytes).toString('base64')}`
  }
  let binary = ''
  const view = new Uint8Array(bytes)
  for (let index = 0; index < view.length; index += 1) {
    binary += String.fromCharCode(view[index]!)
  }
  return `data:${type};base64,${btoa(binary)}`
}

const blobToDataUrl = async (blob: Blob) => {
  if (typeof FileReader === 'function') {
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error || new Error('Failed to read blob'))
        reader.readAsDataURL(blob)
      })
    } catch {
      // Fall through to ArrayBuffer encoding for Node / incomplete FileReader shims.
    }
  }
  return bytesToDataUrl(await blob.arrayBuffer(), blob.type || 'application/octet-stream')
}

const collectBlobUrls = (html: string) => {
  const matches = html.match(/blob:[^\s"'<>)\\]+/g) || []
  return Array.from(new Set(matches))
}

/** Rewrite ephemeral blob URLs into portable data URLs for export and print. */
export const inlineFileViewerBlobUrlsInHtml = async (html: string) => {
  if (!html.includes('blob:') || typeof fetch !== 'function') {
    return html
  }

  const urls = collectBlobUrls(html)
  if (!urls.length) {
    return html
  }

  const replacements = await Promise.all(urls.map(async url => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return null
      }
      const blob = await response.blob()
      const dataUrl = await blobToDataUrl(blob)
      return dataUrl ? ([url, dataUrl] as const) : null
    } catch {
      return null
    }
  }))

  let next = html
  for (const pair of replacements) {
    if (!pair) {
      continue
    }
    const [from, to] = pair
    next = next.split(from).join(to)
  }
  return next
}

export const waitForFileViewerPrintWindowReady = async (printWindow: Window) => {
  const { document: printDocument } = printWindow
  if (printDocument.readyState !== 'complete') {
    await new Promise<void>(resolve => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        printWindow.clearTimeout(timeout)
        printWindow.removeEventListener('load', finish)
        resolve()
      }
      const timeout = printWindow.setTimeout(finish, 1200)
      printWindow.addEventListener('load', finish, { once: true })
      if (printDocument.readyState === 'complete') finish()
    })
  }

  await Promise.all([
    ...Array.from(printDocument.images, image => waitForImage(image, 1500)),
    waitForFonts(printDocument, 1500),
  ])

  await waitForFileViewerNextPaint(printWindow)
}

export const resolveFileViewerPrintStyle = async (
  adapter: FileRenderExportAdapter | null,
  options: FileRenderExportOptions
) => {
  if (options.mode !== 'print' || !adapter?.printStyle) {
    return ''
  }

  if (typeof adapter.printStyle === 'function') {
    return await adapter.printStyle(options)
  }

  return adapter.printStyle
}

export const prepareFileViewerRenderedContentForSnapshot = async (
  source: HTMLElement,
  adapter?: FileRenderExportAdapter | null
) => {
  await adapter?.beforeSnapshot?.()
  await Promise.all([
    waitForFileViewerImages(source),
    waitForFonts(source.ownerDocument, 5000),
  ])
  await waitForFileViewerNextPaint(source.ownerDocument.defaultView || undefined)
}
