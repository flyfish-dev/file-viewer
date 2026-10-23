import { allDemoPresetFiles } from '@/data/demoSamples'
import type { DemoLocale } from '@/composables/useDemoCopy'
import { sampleUrlKey } from '@/composables/useDemoSamples'

/**
 * Shareable sample links: `?sample=dwg` or `?sample=/example/sample.dwg`.
 *
 * Unlike `?url=`, a sample link keeps the full product shell (it is a
 * navigation inside the demo, not an integration entry) and only accepts
 * files from the bundled sample catalog, so it can never point the demo at a
 * third-party origin.
 */
export const DEMO_SAMPLE_PARAM = 'sample'

type SampleAlias = { default: string; zh?: string }

// Short names used in posts and docs. English locales get the English fixture
// when one exists; Chinese keeps the canonical catalog file.
export const DEMO_SAMPLE_ALIASES: Record<string, SampleAlias> = {
  docx: { default: '/example/en/quarterly-operations-report.docx', zh: '/example/word.docx' },
  word: { default: '/example/en/quarterly-operations-report.docx', zh: '/example/word.docx' },
  xlsx: { default: '/example/en/financial-sample.xlsx', zh: '/example/excel.xlsx' },
  excel: { default: '/example/en/financial-sample.xlsx', zh: '/example/excel.xlsx' },
  pptx: { default: '/example/en/sample-presentation.pptx', zh: '/example/ppt.pptx' },
  ppt: { default: '/example/en/sample-presentation.pptx', zh: '/example/ppt.pptx' },
  pdf: { default: '/example/en/prince-sample.pdf', zh: '/example/pdf.pdf' },
  dwg: { default: '/example/sample.dwg' },
  cad: { default: '/example/sample.dwg' },
  dxf: { default: '/example/drawing.dxf' },
  step: { default: '/example/model.step' },
  fox: { default: '/example/fox.glb' },
  glb: { default: '/example/fox.glb' },
  ofd: { default: '/example/ofd.ofd' },
  psd: { default: '/example/design.psd' },
  epub: { default: '/example/book.epub' },
  zip: { default: '/example/en/archive.zip', zh: '/example/archive.zip' },
  dicom: { default: '/example/ct-small.dcm' }
}

const catalogUrls = new Set(allDemoPresetFiles.map(item => item.url))

const isCatalogPath = (value: string) => (
  value.startsWith('/example/') &&
  !value.includes('..') &&
  !value.includes('//') &&
  catalogUrls.has(value)
)

/** Resolve a `sample` query value to a bundled catalog URL, or undefined. */
export function resolveDemoSampleParam(value: string | null | undefined, locale: DemoLocale = 'en-US') {
  const raw = (value || '').trim()
  if (!raw || raw.length > 2048) return undefined
  const key = raw.toLowerCase()
  const alias = Object.hasOwn(DEMO_SAMPLE_ALIASES, key) ? DEMO_SAMPLE_ALIASES[key] : undefined
  if (alias) {
    const target = locale === 'zh-CN' ? alias.zh || alias.default : alias.default
    return isCatalogPath(target) ? target : undefined
  }
  let path = raw
  try {
    path = decodeURIComponent(raw)
  } catch {
    return undefined
  }
  if (!path.startsWith('/')) path = `/example/${path}`
  return isCatalogPath(path) ? path : undefined
}

export function readDemoSampleParam(search = typeof window === 'undefined' ? '' : window.location.search) {
  return new URLSearchParams(search).get(DEMO_SAMPLE_PARAM)
}

/** Shortest stable `sample` value for a catalog URL (alias first, then path). */
export function demoSampleParamFor(url: string, locale: DemoLocale = 'en-US') {
  const clean = sampleUrlKey(url)
  for (const [name, alias] of Object.entries(DEMO_SAMPLE_ALIASES)) {
    const target = locale === 'zh-CN' ? alias.zh || alias.default : alias.default
    if (target === clean) return name
  }
  return isCatalogPath(clean) ? clean : undefined
}

/**
 * Keep the address bar shareable without adding history entries. Passing
 * undefined removes the parameter (local files and external URLs).
 */
export function syncDemoSampleParam(sample: string | undefined, locale?: DemoLocale) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const next = new URL(window.location.href)
  if (locale) next.searchParams.set('lang', locale)
  if (sample) {
    next.searchParams.set(DEMO_SAMPLE_PARAM, sample)
  } else {
    next.searchParams.delete(DEMO_SAMPLE_PARAM)
  }
  if (next.href !== window.location.href) {
    window.history.replaceState(window.history.state, '', next.href)
  }
}

/**
 * Absolute share URL for a catalog sample on the current deployment. The
 * deployment URL comes from the running page, including a self-hosted subpath.
 * Only the sample and locale are shared, never unrelated private query values.
 */
export function demoSampleShareUrl(
  url: string,
  locale: DemoLocale = 'en-US',
  deploymentUrl = typeof window === 'undefined' ? '' : window.location.href
) {
  const sample = demoSampleParamFor(url, locale)
  if (!sample || !deploymentUrl) return undefined
  try {
    const share = new URL(deploymentUrl)
    if (!['https:', 'http:'].includes(share.protocol)) return undefined
    share.search = ''
    share.hash = ''
    share.searchParams.set(DEMO_SAMPLE_PARAM, sample)
    share.searchParams.set('lang', locale)
    return share.href
  } catch {
    return undefined
  }
}
