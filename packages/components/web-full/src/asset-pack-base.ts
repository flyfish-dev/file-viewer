/** Resolve asset packs only for a script explicitly loaded from a supported npm CDN. */
export function resolveFullAssetPackBaseUrl(
  assetBaseUrl: string,
  packageName: '@file-viewer/assets-cad' | '@file-viewer/assets-drawing',
  packageVersion: string | undefined
) {
  if (!packageVersion || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(packageVersion))
    return assetBaseUrl
  let url: URL
  try { url = new URL(assetBaseUrl) } catch { return assetBaseUrl }
  if (url.protocol !== 'https:') return assetBaseUrl
  if (url.hostname === 'cdn.jsdelivr.net' && /^\/npm\/@file-viewer\/web-full(?:@[^/]+)?\/dist\/$/.test(url.pathname))
    return `${url.origin}/npm/${packageName}@${packageVersion}/viewer/`
  if (url.hostname === 'unpkg.com' && /^\/@file-viewer\/web-full(?:@[^/]+)?\/dist\/$/.test(url.pathname))
    return `${url.origin}/${packageName}@${packageVersion}/viewer/`
  return assetBaseUrl
}
