import { computed, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import type { DemoLocale } from '@/composables/useDemoCopy'

export type DemoLocaleOption = {
  value: DemoLocale
  label: string
  shortLabel: string
}

export type UseDemoLocaleSwitcherOptions = {
  locale: Readonly<Ref<DemoLocale>>
  getLanguageLabel: () => string
  beforeOpen?: () => void
  onSelect: (locale: DemoLocale) => void
}

const DEMO_LOCALE_OPTIONS: ReadonlyArray<DemoLocaleOption> = [
  { value: 'zh-CN', label: '简体中文', shortLabel: '中' },
  { value: 'en-US', label: 'English', shortLabel: 'EN' },
  { value: 'ja-JP', label: '日本語', shortLabel: '日' },
  { value: 'de-DE', label: 'Deutsch', shortLabel: 'DE' }
]

type LocaleMenuFocusTarget = 'active' | 'first' | 'last'

/**
 * Owns the locale popover's accessibility state and focus transitions.
 * Changing the active document remains the page controller's responsibility.
 */
export function useDemoLocaleSwitcher(options: UseDemoLocaleSwitcherOptions) {
  const menuOpen = ref(false)
  const switcherRef = ref<HTMLElement | null>(null)
  const triggerButtonRef = ref<HTMLButtonElement | null>(null)
  const menuRef = ref<HTMLElement | null>(null)
  const activeOption = computed(() => (
    DEMO_LOCALE_OPTIONS.find(option => option.value === options.locale.value) || DEMO_LOCALE_OPTIONS[0]
  ))
  const triggerTitle = computed(() => (
    `${options.getLanguageLabel()}: ${activeOption.value.label}`
  ))

  function closeMenu(returnFocus = false) {
    if (!menuOpen.value) return
    menuOpen.value = false
    if (returnFocus) void nextTick(() => triggerButtonRef.value?.focus())
  }

  function focusOption(target: LocaleMenuFocusTarget = 'active') {
    const buttons = Array.from(
      menuRef.value?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []
    )
    if (!buttons.length) return
    const nextButton = target === 'first'
      ? buttons[0]
      : target === 'last'
        ? buttons[buttons.length - 1]
        : buttons.find(button => button.dataset.locale === options.locale.value) || buttons[0]
    nextButton?.focus()
  }

  async function openMenu(focusTarget: LocaleMenuFocusTarget = 'active') {
    if (menuOpen.value) {
      focusOption(focusTarget)
      return
    }
    options.beforeOpen?.()
    menuOpen.value = true
    await nextTick()
    focusOption(focusTarget)
  }

  function toggleMenu() {
    if (menuOpen.value) {
      closeMenu(true)
      return
    }
    void openMenu()
  }

  function selectLocale(nextLocale: DemoLocale) {
    options.onSelect(nextLocale)
    closeMenu(true)
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    const buttons = Array.from(
      menuRef.value?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []
    )
    if (!buttons.length) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(true)
      return
    }
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % buttons.length
    if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = buttons.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    buttons[nextIndex]?.focus()
  }

  function handleFocusOut() {
    void nextTick(() => {
      const activeElement = document.activeElement
      if (activeElement instanceof Node && !switcherRef.value?.contains(activeElement)) {
        menuOpen.value = false
      }
    })
  }

  return {
    localeOptions: DEMO_LOCALE_OPTIONS,
    menuOpen,
    switcherRef,
    triggerButtonRef,
    menuRef,
    triggerTitle,
    closeMenu,
    openMenu,
    toggleMenu,
    selectLocale,
    handleMenuKeydown,
    handleFocusOut
  }
}
