import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  normalizeFileViewerLocale,
  resolveFileViewerColorScheme,
  toggleFileViewerColorScheme
} from '@file-viewer/core'
import type {
  FileViewerThemeMode,
  FileViewerUiDensity
} from '@file-viewer/core'
import type { DemoLocale } from '@/composables/useDemoCopy'

const LOCALE_STORAGE_KEY = 'file-viewer-demo-locale'
const THEME_STORAGE_KEY = 'file-viewer-demo-theme'

// Storage is an enhancement, not a boot requirement. Enterprise privacy
// policies and embedded contexts may reject either call.
const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Storage can be unavailable in private or policy-restricted contexts.
    return null
  }
}

const writeStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // The reactive state remains authoritative for the current session.
  }
}

export const normalizeDemoLocale = (value?: string | null): DemoLocale => (
  normalizeFileViewerLocale(value || 'auto')
)

export const normalizeDemoDensity = (value?: string | null): FileViewerUiDensity => (
  value === 'compact' ? 'compact' : 'comfortable'
)

export const normalizeDemoTheme = (value?: string | null): FileViewerThemeMode => (
  value === 'light' || value === 'dark' ? value : 'system'
)

const queryValue = (...keys: string[]) => {
  const query = new URLSearchParams(window.location.search)
  for (const key of keys) {
    const value = query.get(key)
    if (value) return value
  }
  return null
}

// Preference precedence is intentional:
// explicit query parameter > remembered choice > browser/OS default.
// This makes shared demo URLs deterministic without erasing personal defaults.
const resolveInitialLocale = () => {
  const explicitLocale = queryValue('locale', 'lang')
  if (explicitLocale) return normalizeDemoLocale(explicitLocale)
  const storedLocale = readStorage(LOCALE_STORAGE_KEY)
  if (storedLocale) return normalizeDemoLocale(storedLocale)
  return normalizeDemoLocale('auto')
}

const resolveInitialDensity = () => (
  normalizeDemoDensity(queryValue('density', 'uiDensity'))
)

const resolveInitialTheme = () => {
  const explicitTheme = queryValue('theme', 'viewerTheme')
  return explicitTheme
    ? normalizeDemoTheme(explicitTheme)
    : normalizeDemoTheme(readStorage(THEME_STORAGE_KEY))
}

export type UseDemoPreferencesOptions = {
  onSystemThemeChange?: () => void
}

/**
 * Owns URL/storage-backed shell preferences and the operating-system theme
 * subscription. It deliberately does not update the document title or viewer
 * options; those are separate presentation and renderer responsibilities.
 */
export function useDemoPreferences(options: UseDemoPreferencesOptions = {}) {
  const requestedLocale = queryValue('locale', 'lang') || readStorage(LOCALE_STORAGE_KEY)
  let automaticLocale = !requestedLocale || requestedLocale === 'auto'
  const locale = ref<DemoLocale>(resolveInitialLocale())
  const density = ref<FileViewerUiDensity>(resolveInitialDensity())
  const theme = ref<FileViewerThemeMode>(resolveInitialTheme())
  const systemThemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
  const systemPrefersDark = ref(systemThemeQuery?.matches ?? false)
  const resolvedTheme = computed(() => (
    resolveFileViewerColorScheme(theme.value, systemPrefersDark.value)
  ))

  // The OS listener matters only while theme is `system`. Explicit light/dark
  // choices remain stable even if the operating-system preference changes.
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches
    if (theme.value === 'system') {
      options.onSystemThemeChange?.()
    }
  }
  const handleLanguageChange = () => {
    if (automaticLocale) {
      locale.value = normalizeDemoLocale('auto')
    }
  }

  onMounted(() => {
    systemThemeQuery?.addEventListener?.('change', handleSystemThemeChange)
    window.addEventListener('languagechange', handleLanguageChange)
  })

  onBeforeUnmount(() => {
    systemThemeQuery?.removeEventListener?.('change', handleSystemThemeChange)
    window.removeEventListener('languagechange', handleLanguageChange)
  })

  const setLocale = (nextLocale: DemoLocale) => {
    // Locale persistence is separate from document switching; the page decides
    // whether its locale-specific default sample should also change.
    automaticLocale = false
    locale.value = nextLocale
    writeStorage(LOCALE_STORAGE_KEY, nextLocale)
  }

  const setTheme = (nextTheme: FileViewerThemeMode) => {
    theme.value = nextTheme
    writeStorage(THEME_STORAGE_KEY, nextTheme)
  }

  const toggleTheme = () => {
    // Core owns the system/light/dark transition rule so demo behavior matches
    // every framework component.
    const nextTheme = toggleFileViewerColorScheme(theme.value, systemPrefersDark.value)
    setTheme(nextTheme)
    return nextTheme
  }

  return {
    locale,
    density,
    theme,
    systemPrefersDark,
    resolvedTheme,
    setLocale,
    setTheme,
    toggleTheme
  }
}
