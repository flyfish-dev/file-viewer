import { computed, type Ref } from 'vue'
import { safeDecodeURIComponent } from '@/composables/useDemoFileTypes'
import {
  allDemoPresetFiles,
  sampleGroupsEn,
  sampleGroupsJa,
  sampleGroupsZh
} from '@/data/demoSamples'
import type { DemoLocale } from '@/composables/useDemoCopy'
import type { DemoSampleGroup } from '@/data/demoSamples'

/**
 * Default documents are localized because the first render is part of the
 * product experience. They are also used when generating integration code.
 */
export const DEFAULT_DEMO_URL_BY_LOCALE: Record<DemoLocale, string> = {
  'zh-CN': '/example/word.docx',
  'en-US': '/example/en/calibre-demo.docx',
  'ja-JP': '/example/en/calibre-demo.docx',
  'de-DE': '/example/en/calibre-demo.docx'
}

const extraUploadExtensions = [
  'docm', 'dot', 'dotx', 'dotm', 'rtf', 'odt',
  'xlt', 'xltx', 'xltm',
  'ppt', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm', 'odp',
  'avif', 'jxl', 'heic', 'heif', 'webm', 'm3u8', 'mpeg', 'wav', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba', 'midi',
  'glb', 'fbx', 'dae', '3ds', '3mf', 'amf', 'usd', 'usda', 'usdc', 'usdz', 'kmz',
  'step', 'stp', 'iges', 'igs', 'ifc', '3dm', 'pcd', 'wrl', 'vrml', 'xyz', 'vtk', 'vtp', 'shp',
  'zip', 'zipx', '7z', 'rar', 'tar', 'gz', 'gzip', 'tgz', 'bz2', 'bzip2', 'tbz', 'tbz2',
  'xz', 'txz', 'lzma', 'zst', 'tzst', 'cab', 'ar', 'cpio', 'iso', 'xar', 'lha', 'lzh',
  'jar', 'war', 'ear', 'apk', 'cbz', 'cbr', 'eml', 'msg', 'mbox', 'olb', 'dra', 'gds', 'oas', 'oasis', 'xmind', 'typst',
  'mermaid', 'mmd', 'plantuml', 'puml', 'patch', 'bundle', 'bdl',
  'ttf', 'otf', 'woff', 'woff2', 'psd', 'ai', 'eps', 'parquet', 'avro', 'webarchive'
]

// The file picker covers both visible samples and supported formats that do not
// need a permanent demo fixture. Set removes overlaps between those sources.
export const demoUploadAccept = Array.from(new Set([
  ...allDemoPresetFiles.map(item => {
    const extension = item.url.split('.').pop()
    return extension ? `.${extension}` : ''
  }),
  ...extraUploadExtensions.map(extension => `.${extension}`)
]))
  .filter(Boolean)
  .join(',')

const localUrlBase = () => {
  // A browser origin makes relative and absolute same-origin sample URLs
  // comparable. The file fallback keeps pure Node tests deterministic.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'file:///'
}

/**
 * Produce a stable key for local, absolute and encoded URLs.
 *
 * Sample selection compares identity rather than raw strings because customer
 * integrations often add query strings, hashes or percent-encoded filenames.
 */
export const sampleUrlKey = (target: string) => {
  const clean = target.split(/[?#]/)[0] || target
  try {
    const base = localUrlBase()
    const parsed = new URL(clean, base)
    const isLocal = parsed.origin === new URL(base).origin
    const originKey = isLocal ? '' : parsed.origin.toLowerCase()
    return `${originKey}${safeDecodeURIComponent(parsed.pathname)}`
  } catch {
    const path = clean.startsWith('/') ? clean : `/${clean}`
    return safeDecodeURIComponent(path)
  }
}

const legacyDemoUrlMap: Record<string, string> = {
  '/example/calibre-demo.docx': '/example/en/calibre-demo.docx'
}

/**
 * Keep old shared demo links working without rewriting third-party origins.
 */
export const normalizeDemoUrl = (target: string) => {
  const normalizedPath = legacyDemoUrlMap[sampleUrlKey(target)]
  if (!normalizedPath) {
    return target
  }
  try {
    const parsed = new URL(target, localUrlBase())
    const isRelative = !/^[a-z][a-z\d+\-.]*:/i.test(target)
    const isLocalOrigin = typeof window === 'undefined' || parsed.origin === window.location.origin
    if (!isRelative && !isLocalOrigin) {
      return target
    }
    return `${normalizedPath}${parsed.search}${parsed.hash}`
  } catch {
    return normalizedPath
  }
}

export const isSameSampleUrl = (left: string, right: string) => (
  sampleUrlKey(left) === sampleUrlKey(right)
)

export type UseDemoSamplesOptions = {
  locale: Readonly<Ref<DemoLocale>>
  url: Readonly<Ref<string>>
  preview: Readonly<Ref<string>>
}

/**
 * Owns sample selection state derived from locale and the active remote URL.
 * Opening panels and mutating the active preview remain page-controller work.
 */
export function useDemoSamples(options: UseDemoSamplesOptions) {
  // Both locale catalogs share structure and URLs where possible, so switching
  // language does not reset the selected group or active format.
  const sampleGroupsByLocale = {
    'zh-CN': sampleGroupsZh,
    'en-US': sampleGroupsEn,
    'ja-JP': sampleGroupsJa,
    'de-DE': sampleGroupsEn
  } satisfies Record<DemoLocale, DemoSampleGroup[]>
  const sampleGroups = computed(() => sampleGroupsByLocale[options.locale.value])
  const presetFiles = computed(() => sampleGroups.value.flatMap(group => group.items))
  const activePreset = computed(() => (
    presetFiles.value.find(item => isSameSampleUrl(item.url, options.url.value))
  ))
  const activeSampleGroupIndex = computed(() => {
    // Prefer the selected preset, then fall back to the editable/current URL.
    // `-1` is meaningful: the page opens the first group for external URLs.
    const target = activePreset.value?.url || options.url.value || options.preview.value
    return sampleGroups.value.findIndex(group => (
      group.items.some(item => isSameSampleUrl(item.url, target))
    ))
  })

  return {
    sampleGroups,
    allPresetFiles: allDemoPresetFiles,
    activePreset,
    activeSampleGroupIndex,
    uploadAccept: demoUploadAccept
  }
}
