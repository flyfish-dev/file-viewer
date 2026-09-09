import { createRequire } from 'node:module'
import { parseHTML } from 'linkedom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  getDocRoots,
  parseSingleDoc,
  unzipOfd
} from '../packages/renderers/ofd/vendor/dltech/ofd/ofd_parser.js'
import { renderOfd } from '../packages/renderers/ofd/vendor/dltech/ofd/ofd.js'
import {
  createResourcePathFixture,
  pixelPng,
  resourcePathCases
} from '../packages/renderers/ofd/test/fixtures/resource-path-fixture.mjs'

// Linkedom does not resolve XML namespace URIs; use the renderer's XML test dependency.
const { DOMParser } = createRequire(
  new URL('../packages/renderers/ofd/package.json', import.meta.url)
)('@xmldom/xmldom')

describe('constructed OFD resource path and missing-resource regressions', () => {
  beforeEach(() => {
    const { document, window } = parseHTML('<html><body></body></html>')
    vi.stubGlobal('DOMParser', DOMParser)
    vi.stubGlobal('document', document)
    vi.stubGlobal('HTMLElement', window.HTMLElement)
  })
  afterEach(() => vi.unstubAllGlobals())
  const parse = async (bytes: Uint8Array) =>
    parseSingleDoc(await getDocRoots(await unzipOfd(bytes)))

  it.each(resourcePathCases)(
    'renders %s with the declared asset, not a guessed basename',
    async (_name, options) => {
      const docs = await parse(await createResourcePathFixture(options))
      expect(docs).toHaveLength(1)
      const doc = docs[0]
      const pages = renderOfd(800, doc)
      expect(pages).toHaveLength(1)
      expect(pages[0].textContent).toContain('Invoice resource reference')
      if (options.missingImage || options.missingResource) {
        expect(doc.multiMediaResObj['20']).toBeUndefined()
        expect(pages[0].querySelector('img')).toBeNull()
      } else {
        expect(doc.multiMediaResObj['20']?.img).toBe(
          `data:image/png;base64,${pixelPng.toString('base64')}`
        )
        expect(pages[0].querySelector('img')?.getAttribute('src')).toBe(
          doc.multiMediaResObj['20'].img
        )
      }
    }
  )

  it('rejects a missing required page with its resource path instead of an async TypeError', async () => {
    await expect(parse(await createResourcePathFixture({ missingPage: true }))).rejects.toThrow(
      'OFD XML resource not found: Doc_0/Pages/Page_0/Content.xml'
    )
  })

  it('settles a malformed XML parse failure instead of leaving the document pending', async () => {
    await expect(parse(await createResourcePathFixture({ malformedPage: true }))).rejects.toThrow(
      'OFD XML parse failed (Doc_0/Pages/Page_0/Content.xml)'
    )
  })

  it('settles a corrupt JBIG2 decode instead of leaving the document pending', async () => {
    await expect(
      parse(
        await createResourcePathFixture({ media: 'broken.jb2', imageBytes: Uint8Array.of(0, 1, 2) })
      )
    ).rejects.toThrow()
  })
})
