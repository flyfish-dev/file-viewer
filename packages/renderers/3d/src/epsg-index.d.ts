declare module 'epsg-index/all.json' {
  const catalog: Record<string, {
    code: string
    name: string
    kind: string
    unit: string
    proj4?: string
    wkt?: string
  }>
  export default catalog
}
