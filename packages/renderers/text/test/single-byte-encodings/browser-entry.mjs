import { findFileViewerSearchProvider } from '@file-viewer/core'
import { html as diffHtml } from 'diff2html'
import { renderFileViewerCode, renderFileViewerMarkdown, registerFileViewerDiffToHtml } from '../../src/index.ts'
import { enableFileViewerXmlProfiles } from '../../src/xml-profiles.ts'
import renderPatch from '../../src/patch.ts'

registerFileViewerDiffToHtml(diffHtml)
enableFileViewerXmlProfiles()

const target = document.querySelector('#target')
let instance
let original
let input

window.encodingHarness = {
  async mount({ path, bytes, text = {} }) {
    await instance?.unmount()
    target.replaceChildren()
    input = new Uint8Array(bytes)
    original = [...input]
    const context = { options: {
      locale: 'en-US',
      text: {
        virtualizeAboveBytes: path === 'largeText' ? 0 : Number.MAX_SAFE_INTEGER,
        maxRenderedLineBytes: 1024,
        ...text
      },
      ...(path === 'xml' ? { xml: { profiles: [] } } : {})
    } }
    instance = path === 'markdown'
      ? await renderFileViewerMarkdown(input.buffer, target, 'md', context)
      : path === 'patch'
        ? await renderPatch(input.buffer, target, 'patch', context)
        : await renderFileViewerCode(input.buffer, target, ['html', 'xml', 'lrc'].includes(path) ? path : 'txt', context)
    return this.snapshot()
  },
  snapshot() {
    return {
      source: target.querySelector('code')?.textContent ?? null,
      markdown: target.querySelector('.markdown-body p')?.textContent ?? null,
      patch: Array.from(target.querySelectorAll('.d2h-code-line-ctn'), element => element.textContent),
      lyrics: Array.from(target.querySelectorAll('.lrc-phrase'), element => element.textContent),
      virtual: !!target.querySelector('.code-viewer--virtual'),
      encoding: target.querySelector('[data-text-encoding]')?.dataset.textEncoding ?? null,
      rows: Array.from(target.querySelectorAll('.code-virtual-content'), element => element.textContent),
      diagnostics: instance?.xml?.diagnostics.map(value => value.code) ?? [],
      unchanged: original.every((byte, index) => input[index] === byte)
    }
  },
  provider() {
    const provider = findFileViewerSearchProvider(target)
    if (!provider) throw new Error('Large-text search provider was not registered')
    return provider
  },
  active() {
    const row = target.querySelector('.code-virtual-line--match')
    const viewport = target.querySelector('.code-virtual-scroll')
    const rowRect = row?.getBoundingClientRect()
    const viewportRect = viewport?.getBoundingClientRect()
    return {
      line: Number(row?.dataset.line),
      text: row?.querySelector('.code-virtual-content')?.textContent,
      segment: row?.querySelector('.code-line-segments > span')?.textContent,
      marked: Array.from(row?.querySelectorAll('mark') ?? [], element => element.textContent),
      visible: !!rowRect && !!viewportRect && rowRect.bottom > viewportRect.top && rowRect.top < viewportRect.bottom
    }
  },
  async unmount() {
    await instance?.unmount()
    return { children: target.childElementCount, search: !!findFileViewerSearchProvider(target) }
  }
}
