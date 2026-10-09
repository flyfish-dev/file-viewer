import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { assertFileViewerMermaidSourceHasNoExternalResources } from '../packages/core/src/security/svgResources'
import { sanitizeMermaidSvg } from '../packages/renderers/text/src/markdown'
import { sanitizeDrawingSvg, sanitizeGeneratedMermaidSvg } from '../packages/renderers/drawing/src/sanitize'

describe('generated Mermaid mathematics', () => {
  it('retains MathML and removes executable and remote label content', () => {
    const document = new JSDOM('<!doctype html>').window.document
    const input = [
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100" height="40">',
      '<div xmlns="http://www.w3.org/1999/xhtml" onclick="alert(1)">',
      '<span class="katex"><math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup></math></span>',
      '<img src="https://network.invalid/math.png" onerror="alert(2)"><iframe srcdoc="bad"></iframe>',
      '<script>alert(3)</script><style>.label{background:url(https://network.invalid/math.css)}</style>',
      '</div></foreignObject></svg>',
    ].join('')
    for (const svg of [sanitizeMermaidSvg(document, input, true), sanitizeGeneratedMermaidSvg(document, input, 'Invalid math SVG', true)]) {
      expect(svg.querySelector('math msup')?.textContent).toBe('x2')
      expect(svg.querySelectorAll('script,iframe,[srcdoc],[onclick],[onerror]')).toHaveLength(0)
      expect(svg.querySelector('img')?.hasAttribute('src')).toBe(false)
      expect(svg.querySelector('style')?.textContent).not.toContain('network.invalid')
    }
    expect(sanitizeDrawingSvg(document, input).querySelector('foreignObject')).toBeNull()
    expect(sanitizeMermaidSvg(document, input).querySelector('foreignObject')).toBeNull()
  })

  it('rejects loading tags before Mermaid creates any HTML math label', () => {
    for (const source of [
      'flowchart LR\nA["$$x^2$$ <img src=&#104;ttps://network.invalid/math.png>"]',
      'flowchart LR\nA["$$x^2$$ <img src=relative.png>"]',
      'flowchart LR\nA@{shape:image,img:"relative.png"}',
    ]) expect(() => assertFileViewerMermaidSourceHasNoExternalResources(source)).toThrow(/external image resources/i)
    expect(() => assertFileViewerMermaidSourceHasNoExternalResources('flowchart LR\nA["$$x^2$$"] --> B["$$\\sqrt{x}$$"]')).not.toThrow()
  })
})
