const LEGACY_DOCS_HOST = 'doc.flyfish.dev'
const CANONICAL_DOCS_HOST = 'doc.file-viewer.app'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.hostname === LEGACY_DOCS_HOST) {
      url.hostname = CANONICAL_DOCS_HOST
      return Response.redirect(url.toString(), 301)
    }

    return env.ASSETS.fetch(request)
  }
}
