const LEGACY_DOCS_HOST = 'doc.flyfish.dev'
const CANONICAL_DOCS_HOST = 'doc.file-viewer.app'

function canonicalDocsPath(pathname) {
  if (pathname === '/en' || pathname === '/en/') {
    return '/'
  }
  if (pathname.startsWith('/en/')) {
    return pathname.slice(3) || '/'
  }
  return pathname
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    const isLegacyHost = url.hostname === LEGACY_DOCS_HOST
    const canonicalPath = canonicalDocsPath(url.pathname)
    const hasLegacyEnglishPrefix = canonicalPath !== url.pathname

    if (isLegacyHost) {
      url.hostname = CANONICAL_DOCS_HOST
    }
    if (hasLegacyEnglishPrefix) {
      url.pathname = canonicalPath
    }
    if (isLegacyHost || hasLegacyEnglishPrefix) {
      return Response.redirect(url.toString(), 301)
    }

    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404) {
      return response
    }

    const headers = new Headers(response.headers)
    headers.set('X-Robots-Tag', 'noindex, follow')
    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText
    })
  }
}
