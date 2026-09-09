import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createHtmlPreviewDocument } from '../packages/renderers/text/src/html'

describe('HTML static preview boundary', () => {
  it('preserves document styling and embedded images without granting active capabilities', () => {
    const dom = new JSDOM('')
    const html = createHtmlPreviewDocument(
      dom.window.document,
      `<!doctype html><html><head><style>h1{color:red}</style><meta http-equiv="refresh" content="0;url=https://example.test/leak"><base href="https://example.test/"></head><body class="report" onload="alert(1)"><h1 style="font-size:24px">Report</h1><script>fetch('/leak')</script><a href="https://example.test/" ping="/leak">External</a><a href="#section">Local</a><img src="data:image/png;base64,AA=="><img src="//example.test/image" srcset="https://example.test/2x 2x"><iframe srcdoc="<script>alert(1)</script>"></iframe><form action="/leak"><input></form></body></html>`
    )
    const preview = new JSDOM(html)
    const document = preview.window.document
    expect(document.head.firstElementChild?.getAttribute('http-equiv')).toBe(
      'Content-Security-Policy'
    )
    expect(document.head.firstElementChild?.getAttribute('content')).toContain("default-src 'none'")
    expect(document.querySelector('style')?.textContent).toBe('h1{color:red}')
    expect(document.querySelector('h1')?.getAttribute('style')).toBe('font-size:24px')
    expect(document.body.className).toBe('report')
    expect(document.querySelector('script,iframe,form,base,meta[http-equiv="refresh"]')).toBeNull()
    expect(document.querySelector('[onload],[ping],[srcset]')).toBeNull()
    expect(document.querySelector('a')?.hasAttribute('href')).toBe(false)
    expect(document.querySelector('a[href="#section"]')).not.toBeNull()
    expect(
      [...document.querySelectorAll('img[src]')].map((image) => image.getAttribute('src'))
    ).toEqual(['data:image/png;base64,AA=='])
    dom.window.close()
    preview.window.close()
  })

  it('does not turn encoded or malformed script markup into executable content', () => {
    const dom = new JSDOM('')
    for (const source of [
      '<svg><foreignObject><iframe srcdoc="bad"></iframe></foreignObject></svg>',
      '<a href="java&#x73;cript:alert(1)">x</a>',
      '<img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(1)">'
    ]) {
      const result = new JSDOM(createHtmlPreviewDocument(dom.window.document, source))
      expect(
        result.window.document.querySelector('script,iframe,svg,[onerror],[href],[src]')
      ).toBeNull()
      result.window.close()
    }
    dom.window.close()
  })
})
