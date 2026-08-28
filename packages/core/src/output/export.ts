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

export const replaceFileViewerCanvasWithImages = (source: HTMLElement, clone: HTMLElement) => {
  const sourceCanvases = Array.from(source.querySelectorAll('canvas'))
  const clonedCanvases = Array.from(clone.querySelectorAll('canvas'))

  clonedCanvases.forEach((canvas, index) => {
    const sourceCanvas = sourceCanvases[index]
    if (!sourceCanvas) {
      return
    }
    try {
      const image = source.ownerDocument.createElement('img')
      image.src = sourceCanvas.toDataURL('image/png')
      image.alt = 'rendered canvas'
      image.style.maxWidth = '100%'
      image.style.display = 'block'
      image.style.margin = '0 auto'
      canvas.replaceWith(image)
    } catch {
      // A canvas tainted by cross-origin resources cannot be exported.
    }
  })
}

export const waitForFileViewerNextPaint = (
  targetWindow?: Partial<Pick<Window, 'requestAnimationFrame' | 'setTimeout'>>
) => {
  return new Promise<void>(resolve => {
    const currentWindow = targetWindow || globalThis.window
    if (!currentWindow || typeof currentWindow.requestAnimationFrame !== 'function') {
      const schedule = currentWindow?.setTimeout
        ? currentWindow.setTimeout.bind(currentWindow)
        : globalThis.setTimeout.bind(globalThis)
      schedule(() => resolve(), 0)
      return
    }

    const requestAnimationFrame = currentWindow.requestAnimationFrame.bind(currentWindow)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export const waitForFileViewerImages = async (root: ParentNode | null | undefined) => {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return
  }
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(async image => {
    if (image.complete) {
      return
    }
    if ('decode' in image) {
      try {
        await image.decode()
        return
      } catch {
        // Fall back to load/error events so one bad image cannot block export.
      }
    }
    await new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
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
      printWindow.addEventListener('load', () => resolve(), { once: true })
      printWindow.setTimeout(() => resolve(), 1200)
    })
  }

  await Promise.all(Array.from(printDocument.images).map(async image => {
    if (image.complete) {
      return
    }
    if ('decode' in image) {
      try {
        await image.decode()
        return
      } catch {
        // Image decode failures do not block the browser's print attempt.
      }
    }
    await new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
      printWindow.setTimeout(() => resolve(), 1500)
    })
  }))

  await new Promise<void>(resolve => {
    let settled = false
    let timeoutId: number | undefined
    const finish = () => {
      if (settled) return
      settled = true
      if (timeoutId !== undefined) printWindow.clearTimeout(timeoutId)
      resolve()
    }
    timeoutId = printWindow.setTimeout(finish, 250)
    try {
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(finish)
      })
    } catch {
      finish()
    }
  })
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
  await waitForFileViewerNextPaint(source.ownerDocument.defaultView || undefined)
  await waitForFileViewerImages(source)
}
