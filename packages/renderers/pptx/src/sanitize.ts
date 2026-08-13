import createDOMPurify from 'dompurify'
import type { DOMPurify, WindowLike } from 'dompurify'

const PPTX_CONTENT_STYLE_SCOPE = '.flyfish-pptx-content'
const GENERATED_STYLE_RULE = /\s*(\._(?:css|svg_css|tbl_cell_css)_[A-Za-z0-9_-]+)\s*\{([^{}]*)\}/y
const purifierByDocument = new WeakMap<Document, DOMPurify>()

const createSafeFallbackFragment = (documentRef: Document) => {
  const fragment = documentRef.createDocumentFragment()
  const fallback = documentRef.createElement('section')
  fallback.className = 'slide flyfish-pptx-slide-error'
  fallback.textContent = 'This slide could not be displayed safely.'
  fragment.append(fallback)
  return fragment
}

const getPurifier = (documentRef: Document) => {
  const cached = purifierByDocument.get(documentRef)
  if (cached) {
    return cached
  }
  const windowRef = documentRef.defaultView
  if (!windowRef) {
    return null
  }
  const purifier = createDOMPurify(windowRef as unknown as WindowLike)
  if (!purifier.isSupported) {
    return null
  }
  purifierByDocument.set(documentRef, purifier)
  return purifier
}

const isAllowedCssUrl = (value: string) => {
  const target = value
    .trim()
    .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2')
    .trim()
  if (/^#[A-Za-z0-9_.:-]+$/.test(target)) {
    return true
  }
  return /^data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/i.test(target)
}

const isSafeEmbeddedResourceUrl = (value: string, allowFragment: boolean) => {
  const normalized = value.trim()
  if (allowFragment && /^#[A-Za-z0-9_.:-]+$/.test(normalized)) {
    return true
  }
  if (/^blob:/i.test(normalized)) {
    return true
  }
  return /^data:image\/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/i.test(normalized)
}

const isSafeCssValue = (value: string) => {
  const normalized = value.replace(/\/\*[\s\S]*?\*\//g, '').trim()
  if (
    /(?:expression|image(?:-set)?|paint|var)\s*\(/i.test(normalized) ||
    /(?:javascript|vbscript)\s*:/i.test(normalized) ||
    /(?:^|[^-])behavior\s*:/i.test(normalized) ||
    /-moz-binding/i.test(normalized) ||
    normalized.includes('\\')
  ) {
    return false
  }

  let unsafeUrl = false
  const withoutUrls = normalized.replace(/url\(\s*([^)]*?)\s*\)/gi, (_match, target: string) => {
    if (!isAllowedCssUrl(target)) {
      unsafeUrl = true
    }
    return ''
  })
  return !unsafeUrl && !/url\s*\(/i.test(withoutUrls)
}

const sanitizeStyleDeclaration = (documentRef: Document, cssText: string) => {
  const probe = documentRef.createElement('span')
  probe.setAttribute('style', cssText)
  const style = probe.style
  const propertyNames = Array.from({ length: style.length }, (_, index) => style.item(index))
  for (const propertyName of propertyNames) {
    const value = style.getPropertyValue(propertyName)
    if (
      !propertyName ||
      propertyName.startsWith('--') ||
      propertyName === 'behavior' ||
      propertyName === '-moz-binding' ||
      (propertyName === 'position' && /^(?:fixed|sticky)$/i.test(value.trim())) ||
      !isSafeCssValue(value)
    ) {
      style.removeProperty(propertyName)
    }
  }
  return style.cssText
}

const sanitizeStyleAttributes = (documentRef: Document, root: ParentNode) => {
  root.querySelectorAll<HTMLElement | SVGElement>('[style]').forEach((element) => {
    const sanitized = sanitizeStyleDeclaration(documentRef, element.getAttribute('style') || '')
    if (sanitized) {
      element.setAttribute('style', sanitized)
    } else {
      element.removeAttribute('style')
    }
  })
}

const sanitizeEmbeddedResourceUrls = (root: ParentNode) => {
  root
    .querySelectorAll<HTMLElement | SVGElement>('[src],[srcset],[poster],[href],[xlink\\:href]')
    .forEach((element) => {
      for (const attributeName of ['src', 'srcset', 'poster', 'href', 'xlink:href']) {
        if (!element.hasAttribute(attributeName)) {
          continue
        }
        const isHtmlAnchor =
          element.namespaceURI === 'http://www.w3.org/1999/xhtml' && element.localName === 'a'
        if (isHtmlAnchor && attributeName === 'href') {
          continue
        }
        const allowFragment =
          element.namespaceURI === 'http://www.w3.org/2000/svg' &&
          (attributeName === 'href' || attributeName === 'xlink:href')
        if (!isSafeEmbeddedResourceUrl(element.getAttribute(attributeName) || '', allowFragment)) {
          element.removeAttribute(attributeName)
        }
      }
    })
}

const sanitizeSvgUrlAttributes = (root: ParentNode) => {
  root.querySelectorAll<SVGElement>('svg, svg *').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value
      if (/url\s*\(/i.test(value) && !isSafeCssValue(value)) {
        element.removeAttribute(attribute.name)
      }
    }
  })
}

export const sanitizePptxCss = (documentRef: Document, cssText: string) => {
  const rules: string[] = []
  let offset = 0
  while (offset < cssText.length) {
    if (!cssText.slice(offset).trim()) {
      break
    }
    GENERATED_STYLE_RULE.lastIndex = offset
    const match = GENERATED_STYLE_RULE.exec(cssText)
    if (!match) {
      return ''
    }
    const declarations = sanitizeStyleDeclaration(documentRef, match[2])
    if (declarations) {
      rules.push(`${PPTX_CONTENT_STYLE_SCOPE} ${match[1]}{${declarations}}`)
    }
    offset = GENERATED_STYLE_RULE.lastIndex
  }
  return rules.join('\n')
}

export const sanitizePptxMarkup = (documentRef: Document, html: string) => {
  const purifier = getPurifier(documentRef)
  if (!purifier) {
    return createSafeFallbackFragment(documentRef)
  }

  const fragment = purifier.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['srcdoc']
  })

  sanitizeStyleAttributes(documentRef, fragment)
  sanitizeEmbeddedResourceUrls(fragment)
  sanitizeSvgUrlAttributes(fragment)
  fragment.querySelectorAll<HTMLAnchorElement>('a[target]').forEach((anchor) => {
    if ((anchor.getAttribute('target') || '').trim().toLowerCase() === '_blank') {
      anchor.rel = 'noopener noreferrer'
    }
  })
  return fragment
}
