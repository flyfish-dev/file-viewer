export const runtime = 'browser-module'

const rendererLoaders = {
  pdf: () => import('/src/package/vendors/pdf'),
  ofd: () => import('/src/package/vendors/ofd'),
  dxf: () => import('/src/package/vendors/cad'),
  json: () => import('/src/package/vendors/text')
}

export function getExtension(url) {
  return new URL(url, window.location.href)
    .pathname
    .split('.')
    .pop()
    .toLowerCase()
}

export async function loadRenderer(url) {
  const extension = getExtension(url)
  const loader = rendererLoaders[extension] || rendererLoaders.json
  const startedAt = performance.now()
  const module = await loader()

  return {
    extension,
    module,
    elapsed: Math.round(performance.now() - startedAt)
  }
}

export async function preview(url, target) {
  const { extension, module, elapsed } = await loadRenderer(url)
  target.dataset.extension = extension
  target.dataset.loadedIn = `${elapsed}ms`
  return module.default
}
