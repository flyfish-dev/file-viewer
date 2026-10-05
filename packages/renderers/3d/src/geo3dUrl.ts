/** Normalize a dataset URL before using it as the base for tiles or textures. */
export function resolveGeo3dDatasetUrl(value: string | undefined, documentBaseUrl: string): string | undefined {
  if (!value) return undefined
  // Match browser fetch resolution, including <base href> and nested deployments.
  // Passing a root-relative URL directly as new URL()'s base throws TypeError.
  return new URL(value, documentBaseUrl).href
}
