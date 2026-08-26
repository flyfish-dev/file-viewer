<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Download,
  FileSearch,
  FolderOpen,
  Globe,
  History,
  Link2,
  MoreHorizontal,
  Moon,
  Printer,
  RotateCcw,
  Scan,
  Search,
  Settings2,
  Sparkles,
  Stamp,
  Sun,
  Upload,
  X,
  ZoomIn,
  ZoomOut
} from '@lucide/vue'
import { createDemoFileHandoff } from '@/components/utils'
import DemoFileTypeIcon from '@/components/demo/DemoFileTypeIcon.vue'
import DemoRecentFiles from '@/components/demo/DemoRecentFiles.vue'
import DemoViewerSettingsPanel from '@/components/demo/DemoViewerSettingsPanel.vue'
import { useDemoCopy } from '@/composables/useDemoCopy'
import { useDemoFileCapsuleMotion } from '@/composables/useDemoFileCapsuleMotion'
import { useDemoFileTypes } from '@/composables/useDemoFileTypes'
import { useDemoFloatingPanels } from '@/composables/useDemoFloatingPanels'
import { useDemoLocaleSwitcher } from '@/composables/useDemoLocaleSwitcher'
import { useDemoPreferences } from '@/composables/useDemoPreferences'
import { useDemoRecentFiles } from '@/composables/useDemoRecentFiles'
import {
  DEFAULT_DEMO_URL_BY_LOCALE,
  isSameSampleUrl,
  normalizeDemoUrl,
  useDemoSamples
} from '@/composables/useDemoSamples'
import {
  resolveDemoFormatSettingsSection,
  useDemoViewerSettings
} from '@/composables/useDemoViewerSettings'
import { useDemoViewerOperations } from '@/composables/useDemoViewerOperations'
import { useDemoViewerOptions } from '@/composables/useDemoViewerOptions'
import type { DemoFormatSettingsSection } from '@/composables/useDemoViewerSettings'
import type { DemoLocale } from '@/composables/useDemoCopy'
import type { DemoSourcePanelAnchor } from '@/composables/useDemoFloatingPanels'
import type { DemoRecentFile } from '@/composables/useDemoRecentFiles'
import type { DemoPresetFile } from '@/data/demoSamples'
import type {
  FileViewerFileRef as FileRef,
  FileViewerFitMode,
  FileViewerOptions,
  FileViewerPublicApi as FileViewerExpose
} from '@file-viewer/core'
import brandLogo from '@/assets/logo.png'
import githubMark from '@/assets/github-mark.svg'

/**
 * Product-demo page controller.
 *
 * Domain-heavy work lives in composables and data modules. This file is kept
 * as the composition root because it alone knows how desktop panels, mobile
 * sheets and the renderer surface coordinate. When adding a feature, prefer:
 *
 * - `data/` for static catalogs and presentation metadata;
 * - `composables/` for state machines, persistence and viewer API adapters;
 * - `components/demo/` for independently styled visual regions;
 * - this file only for cross-region orchestration and page-level accessibility.
 */
const demoFileHandoff = createDemoFileHandoff()
const { extensionOf, fileNameOf, getFileIconMeta } = useDemoFileTypes()
const {
  recentFiles,
  hasRecentFiles,
  rememberUrl,
  rememberSample,
  rememberLocalFile,
  dismissRecentFile
} = useDemoRecentFiles()

// ── Entry mode and browser-shell preferences ───────────────────────────────
//
// An explicit URL is an integration entry, not a navigation action inside the
// product demo. Keep that contract synchronous so the full demo chrome never
// flashes before the standalone viewer mounts.
const immersiveMode = ref(demoFileHandoff.isImmersiveRequest)
const filename = ref('')
const file = ref<FileRef | undefined>()
const isMobileDemoViewport = () => window.matchMedia?.('(max-width: 720px)').matches ?? false
const recentPanelOpen = ref(!isMobileDemoViewport())
const wasMobileViewport = ref(isMobileDemoViewport())
const recentLocalReselectName = ref('')
const recentLocalFiles = new Map<string, File>()
const githubRepositoryUrl = 'https://github.com/flyfish-dev/file-viewer'
// Preferences are browser-shell concerns. Keeping persistence and media-query
// subscriptions outside this component lets the page focus on UI orchestration.
const {
  locale: demoLocale,
  density: demoDensity,
  theme: demoTheme,
  resolvedTheme: resolvedDemoTheme,
  setLocale: persistDemoLocale,
  setTheme: persistDemoTheme,
  toggleTheme: toggleStoredDemoTheme
} = useDemoPreferences({
  onSystemThemeChange: () => syncDemoDocumentChrome()
})
const officialSiteUrl = computed(() => demoLocale.value === 'zh-CN' ? 'https://file-viewer.app/' : 'https://file-viewer.app/en/')
const { copy: demoCopy, getCopy: getDemoCopy } = useDemoCopy(demoLocale)
const {
  localeOptions: demoLocaleOptions, menuOpen: localeMenuOpen,
  switcherRef: localeSwitcherRef, triggerButtonRef: localeTriggerButtonRef,
  menuRef: localeMenuRef, triggerTitle: localeTriggerTitle,
  closeMenu: closeLocaleMenu, openMenu: openLocaleMenu, toggleMenu: toggleLocaleMenu,
  selectLocale: selectDemoLocale, handleMenuKeydown: handleLocaleMenuKeydown, handleFocusOut: handleLocaleSwitcherFocusOut
} = useDemoLocaleSwitcher({
  locale: demoLocale, getLanguageLabel: () => demoCopy.value.language,
  beforeOpen: () => {
    closeDesktopTransientUi('locale')
    mobileControlsOpen.value = mobileActionsOpen.value = recentPanelOpen.value = false
  },
  onSelect: setDemoLocale
})
const url = ref(demoFileHandoff.isEmbedRequest && !demoFileHandoff.initialUrl ? '' : DEFAULT_DEMO_URL_BY_LOCALE[demoLocale.value])
const preview = ref('')

// ── Page overlays and responsive controls ──────────────────────────────────
//
// Page-level overlay state stays together because Escape, outside-click and
// responsive handoff rules must close or move several surfaces atomically.
const samplePickerOpen = ref(false)
const expandedSampleGroupIndex = ref<number | null>(0)
const samplePickerRef = ref<HTMLElement | null>(null)
const controlPanelRef = ref<HTMLElement | null>(null)
const settingsButtonRef = ref<HTMLButtonElement | null>(null)
const mobileMoreButtonRef = ref<HTMLButtonElement | null>(null)
const mobileActionsPanelRef = ref<HTMLElement | null>(null)
const morePanelRef = ref<HTMLElement | null>(null)
const fileIdentityButtonRef = ref<HTMLButtonElement | null>(null)
const topCapsuleNavigationRef = ref<HTMLElement | null>(null)
const linkTriggerButtonRef = ref<HTMLButtonElement | null>(null)
const uploadTriggerButtonRef = ref<HTMLButtonElement | null>(null)
const sampleRailButtonRef = ref<HTMLButtonElement | null>(null)
const watermarkEnabled = ref(false)
const desktopActionsOpen = ref(false)
const fitMode = ref<FileViewerFitMode | 'default'>('default')
const runtimeOptions = shallowRef<FileViewerOptions>({})
const mobileControlsOpen = ref(false)
const mobileActionsOpen = ref(false)
const {
  sourcePanelOpen: desktopSourcePanelOpen,
  sourcePanelMode: desktopSourceMode,
  sourcePanelAnchor,
  sourcePanelStyle,
  openSourcePanel,
  closeSourcePanel,
  toggleSourcePanel,
  updatePosition: updateDesktopSourcePanelPosition
} = useDemoFloatingPanels({
  linkTrigger: linkTriggerButtonRef,
  uploadTrigger: uploadTriggerButtonRef,
  samplesTrigger: sampleRailButtonRef,
  fileTrigger: fileIdentityButtonRef
})
const snippetCopied = ref(false)
const snippetDialogOpen = ref(false)
const snippetCloseRef = ref<HTMLButtonElement | null>(null)
const snippetDialogRef = ref<HTMLElement | null>(null)

const fileViewerRef = ref<FileViewerExpose | null>(null)

// ── Settings and final File Viewer options ─────────────────────────────────
//
// Settings owns draft/apply/remount behavior. The page supplies the few effects
// that belong to the surrounding shell rather than to File Viewer itself.
const {
  settingsPanelOpen,
  settingsActiveTab,
  settingsFormatSection,
  appliedViewerSettings,
  settingsDraft,
  viewerRevision,
  settingsNoticeVisible,
  settingsApplying,
  settingsApplyError,
  openSettingsPanel: openViewerSettingsPanel,
  closeSettingsPanel: closeViewerSettingsPanel,
  resetSettingsDraft,
  clearPendingViewState,
  applySettings: applyViewerSettings,
  handleViewerLoadComplete
} = useDemoViewerSettings({
  initialTheme: demoTheme,
  initialDensity: demoDensity,
  fileViewerRef,
  hasActivePreview: () => Boolean(file.value || preview.value),
  applyTheme: nextTheme => {
    persistDemoTheme(nextTheme)
    syncDemoDocumentChrome()
  },
  applyDensity: nextDensity => {
    demoDensity.value = nextDensity
  },
  applyFit: async (nextFit, context) => {
    fitMode.value = nextFit.fitMode
    if (
      context.needsRendererRefresh && context.hasActivePreview ||
      nextFit.fitMode === 'default'
    ) {
      return
    }
    await nextTick()
    await fileViewerRef.value?.fitToView({
      mode: nextFit.fitMode,
      resize: nextFit.fitResize,
      padding: nextFit.fitPadding,
      minScale: nextFit.fitMinScale,
      maxScale: nextFit.fitMaxScale
    })
  },
  applyWatermark: nextWatermark => {
    watermarkEnabled.value = nextWatermark.watermarkEnabled
  },
  beforeApply: async ({ next }) => {
    if (!next.searchEnabled && viewerSearchOpen.value) {
      await closeViewerSearch()
    }
  }
})
const {
  viewerDensity,
  externalToolbar: visibleExternalToolbar,
  viewerOptions
} = useDemoViewerOptions({
  runtimeOptions,
  locale: demoLocale,
  demoTheme,
  demoDensity,
  immersiveMode,
  settings: appliedViewerSettings,
  fitMode,
  watermarkEnabled
})

// ── Desktop file-capsule motion ────────────────────────────────────────────
//
// The merge animation depends on live DOM geometry and therefore remains a
// page concern; its timing/state machine is isolated in the composable.
const desktopFileCapsuleMotionQuery = window.matchMedia?.(
  '(min-width: 721px) and (hover: hover) and (pointer: fine)'
)
const reducedFileCapsuleMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
const resolveFileCapsuleMergeTarget = () => {
  const trigger = uploadTriggerButtonRef.value
  if (!trigger) return null
  const bounds = trigger.getBoundingClientRect()
  const configuredWidth = Number.parseFloat(
    window.getComputedStyle(trigger).getPropertyValue('--demo-file-capsule-merged-width')
  )
  const width = Number.isFinite(configuredWidth) && configuredWidth > 0
    ? configuredWidth
    : bounds.width
  // The navigation stays centered while its first slot grows. Compensating by
  // half the width delta gives the file capsule its exact resting rect before
  // the capsule morph starts, avoiding a final lateral jump.
  const left = bounds.left - (width - bounds.width) / 2
  return {
    top: bounds.top,
    right: left + width,
    bottom: bounds.bottom,
    left,
    width,
    height: bounds.height
  }
}
const {
  state: fileCapsuleState,
  motionStyle: fileCapsuleMotionStyle,
  stableMerged: fileCapsuleMerged,
  actionLocked: fileCapsuleActionLocked,
  reset: resetFileCapsuleMotion,
  handlePointerEnter: handleFileCapsulePointerEnter,
  handlePointerLeave: handleFileCapsulePointerLeave,
  handleFocusIn: handleFileCapsuleFocusIn,
  handleFocusOut: handleFileCapsuleFocusOut
} = useDemoFileCapsuleMotion({
  enabled: () => Boolean(
    desktopFileCapsuleMotionQuery?.matches &&
    !reducedFileCapsuleMotionQuery?.matches &&
    !immersiveMode.value
  ),
  canMerge: () => !(
    desktopSourcePanelOpen.value ||
    settingsPanelOpen.value ||
    desktopActionsOpen.value ||
    viewerSearchOpen.value ||
    localeMenuOpen.value ||
    mobileControlsOpen.value ||
    mobileActionsOpen.value ||
    snippetDialogOpen.value
  ),
  resolveFileBounds: () => fileIdentityButtonRef.value?.getBoundingClientRect() || null,
  resolveTriggerBounds: () => topCapsuleNavigationRef.value?.getBoundingClientRect() || null,
  resolveMergeTarget: resolveFileCapsuleMergeTarget
})

// ── Recent files and localized presentation state ──────────────────────────
//
// Date formatting is derived from locale, while recent-file persistence and
// deduplication remain owned by useDemoRecentFiles.
const recentTimeFormatter = computed(() => new Intl.DateTimeFormat(demoLocale.value, {
  hour: '2-digit',
  minute: '2-digit'
}))
const recentDisplayEntries = computed(() => (
  recentFiles.value.slice(0, 3).map(entry => ({
    ...entry,
    ...getFileIconMeta(entry.iconTarget),
    timeLabel: recentTimeFormatter.value.format(new Date(entry.timestamp)),
    timeIso: new Date(entry.timestamp).toISOString()
  }))
))
const recentFilesCopy = computed(() => ({
  title: demoCopy.value.recentOpened,
  close: demoCopy.value.closeRecent,
  open: demoCopy.value.openRecent,
  dismiss: demoCopy.value.dismissRecent
}))
const recentLocalReselectNotice = computed(() => {
  if (!recentLocalReselectName.value) {
    return ''
  }
  return demoCopy.value.reselectLocalFile.replace('{name}', recentLocalReselectName.value)
})
const demoThemeButtonTitle = computed(() => {
  return resolvedDemoTheme.value === 'dark'
    ? demoCopy.value.themeToLight
    : demoCopy.value.themeToDark
})
const githubRepositoryAriaLabel = computed(() => {
  if (demoLocale.value === 'zh-CN') return '在新标签页打开 File Viewer GitHub 开源仓库'
  if (demoLocale.value === 'ja-JP') return 'File Viewer の GitHub リポジトリを新しいタブで開く'
  return 'Open the File Viewer GitHub repository in a new tab'
})

// Sample catalog data and URL identity rules are independent of panel layout.
const {
  sampleGroups,
  allPresetFiles,
  activePreset,
  activeSampleGroupIndex,
  uploadAccept
} = useDemoSamples({ locale: demoLocale, url, preview })

// The snippet reflects the currently active input path. Local files cannot be
// represented as a URL, so that branch demonstrates the `file` prop instead.
const integrationSnippet = computed(() => {
  if (file.value) {
    return `import FileViewer from '@file-viewer/react-full'

export function Preview({ file }: { file: File }) {
  return <FileViewer file={file} locale="${demoLocale.value}" style={{ height: 720 }} />
}`
  }
  const sampleUrl = preview.value || url.value || DEFAULT_DEMO_URL_BY_LOCALE[demoLocale.value]
  return `import FileViewer from '@file-viewer/react-full'

export function Preview() {
  return <FileViewer url="${sampleUrl}" locale="${demoLocale.value}" style={{ height: 720 }} />
}`
})

const activeIconMeta = computed(() => {
  return getFileIconMeta(activePreset.value?.url || url.value)
})

// ── Active document identity ───────────────────────────────────────────────
//
// Keep one canonical target for icons and format-specific settings. A local
// File wins over remote URLs; `preview` wins over the editable URL field.
const currentFileTarget = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  return preview.value || url.value || displayName.value
})

const currentIconMeta = computed(() => getFileIconMeta(currentFileTarget.value))
const fileSamplesOpen = computed(() => (
  wasMobileViewport.value
    ? mobileControlsOpen.value && desktopSourceMode.value === 'samples'
    : desktopSourcePanelOpen.value && desktopSourceMode.value === 'samples' && sourcePanelAnchor.value === 'file'
))

const currentSettingsFormatSection = computed<Exclude<DemoFormatSettingsSection, 'current'>>(() => {
  return resolveDemoFormatSettingsSection(currentFileTarget.value)
})

const desktopSourcePanelTitle = computed(() => {
  if (desktopSourceMode.value === 'upload') {
    return demoCopy.value.uploadPanelTitle
  }
  if (desktopSourceMode.value === 'samples') {
    return demoCopy.value.samplesPanelTitle
  }
  return demoCopy.value.linkPanelTitle
})

const desktopSourcePanelHint = computed(() => {
  return desktopSourceMode.value === 'upload'
    ? demoCopy.value.uploadPanelHint
    : demoCopy.value.linkPanelHint
})

const displayName = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  if (preview.value) {
    return fileNameOf(preview.value) || preview.value
  }
  return activePreset.value?.name || demoCopy.value.unselected
})

const displayPath = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  return preview.value || url.value || ''
})

const previewType = computed(() => {
  const name = displayName.value
  const ext = extensionOf(name)
  if (!ext) {
    return demoCopy.value.auto
  }
  return ext.toUpperCase()
})

const fileIdentityAriaLabel = computed(() => (
  `${displayName.value}, ${previewType.value}, ${demoCopy.value.openSamples}`
))

// A file change invalidates the old capsule geometry even when the URL changes
// without changing the surrounding responsive breakpoint.
watch(currentFileTarget, (nextTarget, previousTarget) => {
  if (nextTarget !== previousTarget) {
    resetFileCapsuleMotion()
  }
})

// ── Renderer operation adapter ─────────────────────────────────────────────
//
const fitModeOptions = computed<Array<{ value: FileViewerFitMode | 'default'; label: string }>>(() => [
  { value: 'default', label: demoCopy.value.fitDefault },
  { value: 'auto', label: demoCopy.value.fitAuto },
  { value: 'contain', label: demoCopy.value.fitContain },
  { value: 'width', label: demoCopy.value.fitWidth },
  { value: 'height', label: demoCopy.value.fitHeight },
  { value: 'cover', label: demoCopy.value.fitCover },
  { value: 'actual', label: demoCopy.value.fitActual },
  { value: 'scale-down', label: demoCopy.value.fitScaleDown }
])

// The demo toolbar is only an adapter. Search, zoom, printing and page
// state stay in one composable so every renderer follows the same lifecycle.
const {
  viewerSearchOpen,
  viewerSearchQuery,
  viewerSearchInputRef,
  viewerSearchState,
  viewerAvailability,
  viewerActionDisabled,
  viewerZoomDisplayLabel,
  viewerZoomResetLabel,
  viewerSearchSummary,
  viewerPageLabel,
  fitCurrentDocument,
  printDirect,
  printWithMask,
  triggerViewerAction,
  selectFitMode,
  runViewerSearch,
  openViewerSearch,
  closeViewerSearch,
  resetViewerSearch,
  nextViewerSearch,
  previousViewerSearch,
  handleViewerAvailabilityChange,
  handleViewerLoadStart,
  handleViewerSearchChange,
  handleViewerZoomChange,
  handleViewerViewStateChange
} = useDemoViewerOperations({
  fileViewerRef,
  settings: appliedViewerSettings,
  fitMode,
  copy: demoCopy,
  previewType,
  hasActivePreview: () => Boolean(file.value || preview.value),
  isMobileViewport: isMobileDemoViewport,
  beforeOpenSearch: () => {
    closeDesktopTransientUi('search')
    mobileActionsOpen.value = false
  },
  closeActionPanels: () => {
    desktopActionsOpen.value = false
    mobileActionsOpen.value = false
  },
  hideRecentPanel: () => {
    recentPanelOpen.value = false
  }
})

// ── Overlay focus, dismissal and keyboard ownership ────────────────────────
//
const isVisibleControl = (element: HTMLElement | null): element is HTMLElement => (
  Boolean(element && element.getClientRects().length)
)

// Focus helpers are centralized here so dialogs and popovers always return to
// the control that is actually visible at the current responsive breakpoint.
function focusActionsTrigger() {
  const trigger = isVisibleControl(settingsButtonRef.value)
    ? settingsButtonRef.value
    : mobileMoreButtonRef.value
  trigger?.focus()
}

function focusSourceTrigger(anchor = sourcePanelAnchor.value) {
  const trigger = anchor === 'file'
    ? fileIdentityButtonRef.value
    : anchor === 'upload'
      ? uploadTriggerButtonRef.value
      : anchor === 'samples'
        ? sampleRailButtonRef.value
        : linkTriggerButtonRef.value
  if (isVisibleControl(trigger)) {
    trigger.focus()
  }
}

function focusSourcePanel(mode = desktopSourceMode.value) {
  const selector = mode === 'link'
    ? '#preview-url'
    : mode === 'upload'
      ? '.desktop-upload-dropzone input'
      : '.sample-card.active, .sample-group-header'
  controlPanelRef.value?.querySelector<HTMLElement>(selector)?.focus()
}

function closeDesktopSourcePanel(returnFocus = false) {
  const previousAnchor = sourcePanelAnchor.value
  closeSourcePanel()
  samplePickerOpen.value = false
  if (returnFocus) {
    void nextTick(() => focusSourceTrigger(previousAnchor))
  }
}

function closeSettingsPanel(returnFocus = false) {
  if (!settingsPanelOpen.value) {
    return
  }
  closeViewerSettingsPanel()
  if (returnFocus) {
    void nextTick(focusActionsTrigger)
  }
}

function closeDesktopTransientUi(except?: 'source' | 'settings' | 'search' | 'more' | 'locale') {
  // Desktop surfaces are mutually exclusive. `except` lets the destination
  // remain open while every competing surface closes in the same tick.
  if (except !== 'source') {
    closeDesktopSourcePanel()
  }
  if (except !== 'settings') {
    closeSettingsPanel()
  }
  if (except !== 'more') {
    desktopActionsOpen.value = false
  }
  if (except !== 'search' && viewerSearchOpen.value) {
    void closeViewerSearch()
  }
  if (except !== 'locale') {
    closeLocaleMenu()
  }
}

async function toggleSettingsPanel() {
  // Opening settings snapshots live shell state into a draft. Applying is the
  // only path that may remount the renderer and restore its view state.
  if (settingsPanelOpen.value) {
    closeSettingsPanel(true)
    return
  }
  closeDesktopTransientUi('settings')
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  recentPanelOpen.value = false
  openViewerSettingsPanel({
    theme: demoTheme.value,
    density: viewerDensity.value,
    fitMode: fitMode.value,
    watermarkEnabled: watermarkEnabled.value
  })
  await nextTick()
  controlPanelRef.value?.querySelector<HTMLElement>('.settings-tabs button')?.focus()
}

async function applySettingsAndRestoreFocus() {
  const result = await applyViewerSettings()
  if (result) {
    await nextTick()
    focusActionsTrigger()
  }
}

let copyResetTimer: number | undefined
const clipboardWriteTimeoutMs = 800

// ── Integration snippet dialog and clipboard fallback ──────────────────────
//
// Clipboard access can stall or be denied in embedded/private contexts. The
// hidden textarea fallback keeps this demo action deterministic without
// weakening browser permissions.
async function openSnippetDialog() {
  closeDesktopTransientUi()
  mobileActionsOpen.value = false
  snippetDialogOpen.value = true
  await nextTick()
  snippetCloseRef.value?.focus()
}

function closeSnippetDialog() {
  if (!snippetDialogOpen.value) {
    return
  }
  snippetDialogOpen.value = false
  void nextTick(focusActionsTrigger)
}

function copyIntegrationSnippetFallback() {
  const textarea = document.createElement('textarea')
  textarea.value = integrationSnippet.value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) {
    throw new Error('Clipboard copy was rejected')
  }
}

async function writeIntegrationSnippetToClipboard() {
  if (!navigator.clipboard?.writeText) {
    copyIntegrationSnippetFallback()
    return
  }
  let timeoutId: number | undefined
  try {
    await Promise.race([
      navigator.clipboard.writeText(integrationSnippet.value),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Clipboard write timed out')), clipboardWriteTimeoutMs)
      })
    ])
  } catch {
    copyIntegrationSnippetFallback()
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}

async function copyIntegrationSnippet() {
  snippetCopied.value = true
  if (copyResetTimer) {
    window.clearTimeout(copyResetTimer)
  }
  copyResetTimer = window.setTimeout(() => {
    snippetCopied.value = false
    copyResetTimer = undefined
  }, 1600)

  try {
    await writeIntegrationSnippetToClipboard()
  } catch {
    snippetCopied.value = false
  }
}

async function toggleDesktopActions() {
  // The More menu follows roving-menu keyboard conventions implemented below;
  // focus returns to the visible desktop/mobile trigger when it closes.
  if (!desktopActionsOpen.value) {
    closeDesktopTransientUi('more')
  }
  desktopActionsOpen.value = !desktopActionsOpen.value
  if (!desktopActionsOpen.value) {
    await nextTick()
    focusActionsTrigger()
    return
  }
  await nextTick()
  morePanelRef.value?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
}

function handleMoreMenuKeydown(event: KeyboardEvent) {
  const buttons = Array.from(morePanelRef.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || [])
  if (!buttons.length) {
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    desktopActionsOpen.value = false
    void nextTick(focusActionsTrigger)
    return
  }
  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
  let nextIndex: number | null = null
  if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % buttons.length
  if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = buttons.length - 1
  if (nextIndex === null) {
    return
  }
  event.preventDefault()
  buttons[nextIndex]?.focus()
}

async function openDesktopSourcePanel(
  mode: 'link' | 'upload' | 'samples' = 'link',
  anchor: DemoSourcePanelAnchor = mode
) {
  // Desktop source panels are anchored popovers. Sample mode additionally
  // restores the active group so a large catalog never opens at a random spot.
  if (mode === 'upload') {
    recentLocalReselectName.value = ''
  }
  closeDesktopTransientUi('source')
  mobileActionsOpen.value = false
  await openSourcePanel(mode, anchor)

  if (mode === 'samples') {
    samplePickerOpen.value = true
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
    await nextTick()
    focusSourcePanel(mode)
    return
  }

  samplePickerOpen.value = false
  await nextTick()
  focusSourcePanel(mode)
}

async function toggleDesktopSourcePanel(
  mode: 'link' | 'upload' | 'samples',
  anchor: DemoSourcePanelAnchor = mode
) {
  if (mode === 'upload') {
    recentLocalReselectName.value = ''
  }
  closeDesktopTransientUi('source')
  mobileActionsOpen.value = false
  const opened = await toggleSourcePanel(mode, anchor)
  samplePickerOpen.value = opened && mode === 'samples'
  if (samplePickerOpen.value) {
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
    await nextTick()
    focusSourcePanel(mode)
  } else if (opened) {
    await nextTick()
    focusSourcePanel(mode)
  } else {
    focusSourceTrigger(anchor)
  }
}

// ── Mobile source sheet and single More menu ───────────────────────────────
//
async function openMobileControls(
  mode: 'link' | 'upload' | 'samples' = 'link',
  anchor: DemoSourcePanelAnchor = mode
) {
  // Mobile reuses source-panel content but clears desktop positioning. Only
  // the document viewport keeps scrolling while this bottom sheet is open.
  if (mode === 'upload') {
    recentLocalReselectName.value = ''
  }
  closeDesktopTransientUi()
  desktopSourceMode.value = mode
  sourcePanelAnchor.value = anchor
  sourcePanelStyle.value = {}
  mobileControlsOpen.value = true
  mobileActionsOpen.value = false
  recentPanelOpen.value = false
  if (mode === 'samples') {
    samplePickerOpen.value = true
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
    await nextTick()
    focusSourcePanel(mode)
    return
  }
  samplePickerOpen.value = false
  await nextTick()
  focusSourcePanel(mode)
}

function closeMobileControls() {
  mobileControlsOpen.value = false
  samplePickerOpen.value = false
}

async function toggleMobileActions() {
  mobileActionsOpen.value = !mobileActionsOpen.value
  if (mobileActionsOpen.value) {
    mobileControlsOpen.value = false
    recentPanelOpen.value = false
    await nextTick()
    mobileActionsPanelRef.value?.querySelector<HTMLElement>(
      '.mobile-action-source-grid button:not([disabled]), select'
    )?.focus()
  } else {
    await nextTick()
    mobileMoreButtonRef.value?.focus()
  }
}

async function toggleFileSamples() {
  // The filename capsule is the shared sample entry: anchored popover on
  // desktop, bottom sheet on mobile.
  if (isMobileDemoViewport()) {
    if (mobileControlsOpen.value && desktopSourceMode.value === 'samples') {
      closeMobileControls()
      return
    }
    await openMobileControls('samples', 'file')
    return
  }
  await toggleDesktopSourcePanel('samples', 'file')
}

function toggleWatermark() {
  watermarkEnabled.value = !watermarkEnabled.value
  appliedViewerSettings.value = {
    ...appliedViewerSettings.value,
    watermarkEnabled: watermarkEnabled.value
  }
  desktopActionsOpen.value = false
  mobileActionsOpen.value = false
}

// ── External handoff and component lifecycle ───────────────────────────────
//
// Component integrations can hand off a File, URL and runtime options without
// reloading the page. Receiving a handoff always switches to immersive mode.
const stopDemoFileHandoff = demoFileHandoff.listen((body, target, options) => {
  immersiveMode.value = true
  runtimeOptions.value = options || {}
  samplePickerOpen.value = false
  settingsPanelOpen.value = false
  if (body || target) {
    clearPendingViewState()
  }
  if (body) {
    filename.value = fileNameOf(body.name) || body.name || ''
    file.value = body
  }
  if (target) {
    const normalizedTarget = normalizeDemoUrl(target)
    url.value = normalizedTarget
    preview.value = normalizedTarget
  }
})

// Document chrome is deliberately synchronized in one place. Renderer theme
// options are composed separately by useDemoViewerOptions.
function syncDemoDocumentChrome(nextLocale = demoLocale.value) {
  document.documentElement.lang = nextLocale
  document.documentElement.dataset.demoTheme = resolvedDemoTheme.value
  document.title = getDemoCopy(nextLocale).pageTitle
}

onMounted(() => {
  // Global listeners exist only for page-level coordination. Renderer event
  // listeners are declared directly on <file-viewer> in the template.
  syncDemoDocumentChrome()
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  window.addEventListener('resize', handleWindowResize)
  desktopFileCapsuleMotionQuery?.addEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  reducedFileCapsuleMotionQuery?.addEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  if (url.value || !immersiveMode.value) {
    openUrlPreview(url.value)
  }
})

onBeforeUnmount(() => {
  // Mirror every global subscription and discard memory-only File handles.
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('resize', handleWindowResize)
  desktopFileCapsuleMotionQuery?.removeEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  reducedFileCapsuleMotionQuery?.removeEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  stopDemoFileHandoff()
  if (copyResetTimer) {
    window.clearTimeout(copyResetTimer)
  }
  recentLocalFiles.clear()
})

type DemoRemoteRecentSource = 'auto' | 'url' | 'sample'

// ── Remote URL, local File and recent-history flows ────────────────────────
//
// Recent entries are product-shell history, not part of immersive integrations.
// Local File objects remain memory-only because browser storage cannot safely
// persist their permissions or contents.
function rememberRemotePreview(normalizedUrl: string, source: DemoRemoteRecentSource) {
  if (immersiveMode.value || !normalizedUrl) {
    return
  }
  const matchedSample = allPresetFiles.find(item => isSameSampleUrl(item.url, normalizedUrl))
  const input = {
    name: fileNameOf(normalizedUrl) || normalizedUrl,
    url: normalizedUrl,
    type: extensionOf(normalizedUrl),
    iconTarget: normalizedUrl
  }
  if (source === 'sample' || (source === 'auto' && matchedSample)) {
    rememberSample(input)
    return
  }
  rememberUrl(input)
}

function openUrlPreview(nextUrl = url.value, recentSource: DemoRemoteRecentSource = 'auto') {
  // One transition resets renderer view/search state and closes all source
  // surfaces before the new URL becomes observable by <file-viewer>.
  const normalizedUrl = normalizeDemoUrl(nextUrl)
  clearPendingViewState()
  file.value = undefined
  recentLocalReselectName.value = ''
  resetViewerSearch()
  url.value = normalizedUrl
  preview.value = normalizedUrl
  samplePickerOpen.value = false
  desktopSourcePanelOpen.value = false
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  rememberRemotePreview(normalizedUrl, recentSource)
}

function setDemoLocale(nextLocale: DemoLocale) {
  // Locale changes preserve the chosen document. Only the locale-specific
  // default sample is exchanged for its counterpart.
  if (demoLocale.value === nextLocale) {
    return
  }
  const previousDefaultUrl = DEFAULT_DEMO_URL_BY_LOCALE[demoLocale.value]
  persistDemoLocale(nextLocale)
  syncDemoDocumentChrome(nextLocale)
  if (!file.value && isSameSampleUrl(url.value || preview.value, previousDefaultUrl)) {
    const nextDefaultUrl = DEFAULT_DEMO_URL_BY_LOCALE[nextLocale]
    url.value = nextDefaultUrl
    openUrlPreview(nextDefaultUrl)
  }
}

function handleFileCapsuleMotionPreferenceChange() {
  resetFileCapsuleMotion()
}

function toggleDemoTheme() {
  // Shell and renderer settings are updated together so no light/dark frame
  // can appear between the surrounding UI and the document surface.
  const nextTheme = toggleStoredDemoTheme()
  appliedViewerSettings.value = {
    ...appliedViewerSettings.value,
    theme: nextTheme
  }
  syncDemoDocumentChrome()
}

function activateLocalFile(value: File) {
  // File objects are assigned directly to the viewer and cached only for this
  // page lifetime; recent-file metadata remains serializable.
  clearPendingViewState()
  samplePickerOpen.value = false
  desktopSourcePanelOpen.value = false
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  recentLocalReselectName.value = ''
  resetViewerSearch()
  filename.value = fileNameOf(value.name) || value.name
  file.value = value
  const recent = rememberLocalFile(value, { iconTarget: value.name })
  if (recent) {
    recentLocalFiles.set(recent.id, value)
  }
  pruneRecentLocalFiles()
}

function pruneRecentLocalFiles() {
  const retainedIds = new Set(recentFiles.value.filter(entry => entry.source === 'local').map(entry => entry.id))
  for (const id of recentLocalFiles.keys()) {
    if (!retainedIds.has(id)) {
      recentLocalFiles.delete(id)
    }
  }
}

async function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  const value = target.files?.item(0)
  if (!value) {
    return
  }
  activateLocalFile(value)
  target.value = ''
}

async function openRecentFile(entry: DemoRecentFile) {
  // Remote history can reopen immediately. A local entry needs the in-memory
  // File handle or asks the user to reselect it after a reload.
  if (entry.source !== 'local') {
    if (entry.url) {
      openUrlPreview(entry.url, entry.source)
    }
    return
  }

  const runtimeFile = recentLocalFiles.get(entry.id)
  if (runtimeFile) {
    activateLocalFile(runtimeFile)
    return
  }

  recentPanelOpen.value = false
  if (isMobileDemoViewport()) {
    await openMobileControls('upload')
  } else {
    await openDesktopSourcePanel('upload', 'upload')
  }
  recentLocalReselectName.value = entry.name
}

function dismissRecentFileEntry(id: string) {
  dismissRecentFile(id)
  pruneRecentLocalFiles()
}

async function toggleSamplePicker() {
  samplePickerOpen.value = !samplePickerOpen.value
  if (samplePickerOpen.value) {
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
  }
}

// ── Sample catalog interaction ─────────────────────────────────────────────
//
function toggleSampleGroup(index: number) {
  expandedSampleGroupIndex.value = expandedSampleGroupIndex.value === index ? null : index
}

function selectPreset(nextUrl: string) {
  // Selecting a sample is the same preview transition as entering a URL, with
  // the additional source tag used for recent-history presentation.
  const normalizedUrl = normalizeDemoUrl(nextUrl)
  const nextGroupIndex = sampleGroups.value.findIndex(group => group.items.some(item => isSameSampleUrl(item.url, normalizedUrl)))
  url.value = normalizedUrl
  expandedSampleGroupIndex.value = nextGroupIndex >= 0 ? nextGroupIndex : expandedSampleGroupIndex.value
  samplePickerOpen.value = false
  desktopSourcePanelOpen.value = false
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  openUrlPreview(normalizedUrl, 'sample')
}

function isActivePreset(item: DemoPresetFile) {
  return !file.value && isSameSampleUrl(url.value, item.url)
}

function handleDocumentPointerDown(event: PointerEvent) {
  // Ignore clicks owned by active controls/dialogs. Everything else acts as an
  // outside click and closes transient surfaces without touching the viewer.
  if (
    !samplePickerOpen.value &&
    !desktopSourcePanelOpen.value &&
    !settingsPanelOpen.value &&
    !desktopActionsOpen.value &&
    !viewerSearchOpen.value &&
    !localeMenuOpen.value &&
    !mobileActionsOpen.value
  ) {
    return
  }
  const target = event.target
  if (
    target instanceof Element &&
    target.closest('.viewer-file-identity, .viewer-locale-switch, .immersive-more-menu, .viewer-search-popover, .mobile-action-dock')
  ) {
    return
  }
  if (
    target instanceof Node &&
    controlPanelRef.value?.contains(target)
  ) {
    return
  }
  if (target instanceof Node && samplePickerRef.value?.contains(target)) {
    return
  }
  closeDesktopSourcePanel()
  closeSettingsPanel()
  desktopActionsOpen.value = false
  localeMenuOpen.value = false
  mobileActionsOpen.value = false
  if (viewerSearchOpen.value) {
    void closeViewerSearch()
  }
}

// Global keyboard handling is intentionally limited to cross-panel behavior.
// Renderer-specific shortcuts stay inside core/renderers.
function handleDocumentKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (snippetDialogOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSnippetDialog()
      return
    }
    if (event.key === 'Tab') {
      const focusable = Array.from(snippetDialogRef.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || [])
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault()
        first.focus()
      }
    }
    return
  }
  if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'f') {
    event.preventDefault()
    event.stopPropagation()
    if (viewerSearchOpen.value) {
      void closeViewerSearch()
      return
    }
    void openViewerSearch()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    if (localeMenuOpen.value) {
      closeLocaleMenu(true)
      return
    }
    if (settingsPanelOpen.value) {
      closeSettingsPanel(true)
      return
    }
    if (desktopActionsOpen.value) {
      desktopActionsOpen.value = false
      void nextTick(focusActionsTrigger)
      return
    }
    if (desktopSourcePanelOpen.value) {
      closeDesktopSourcePanel(true)
      return
    }
    if (mobileControlsOpen.value) {
      closeMobileControls()
      return
    }
    if (mobileActionsOpen.value) {
      mobileActionsOpen.value = false
      void nextTick(focusActionsTrigger)
      return
    }
    if (viewerSearchOpen.value) {
      void closeViewerSearch()
    }
  }
}

function handleWindowResize() {
  // When crossing the mobile breakpoint, migrate the active source surface
  // instead of discarding the user's current link/upload/sample context.
  const mobile = isMobileDemoViewport()
  resetFileCapsuleMotion()
  if (mobile !== wasMobileViewport.value) {
    const sourceMode = desktopSourceMode.value
    const sourceAnchor = sourcePanelAnchor.value
    if (mobile && desktopSourcePanelOpen.value) {
      closeDesktopSourcePanel()
      void openMobileControls(sourceMode, sourceAnchor)
    } else if (!mobile && mobileControlsOpen.value) {
      closeMobileControls()
      void openDesktopSourcePanel(sourceMode, sourceAnchor)
    }
    if (mobile) {
      recentPanelOpen.value = false
    }
    wasMobileViewport.value = mobile
  }
  if (desktopSourcePanelOpen.value) {
    void updateDesktopSourcePanelPosition()
  }
}

</script>

<template>
  <div
    class='demo-shell'
    :data-demo-density='viewerDensity'
    :data-demo-theme='resolvedDemoTheme'
    :data-demo-mode='immersiveMode ? "immersive" : "product"'
    :data-file-family='currentIconMeta.family'
    :data-file-capsule-state='fileCapsuleState'
    :style='fileCapsuleMotionStyle'
    :class="{
      hidden: immersiveMode,
      'mobile-controls-open': mobileControlsOpen,
      'mobile-actions-open': mobileActionsOpen,
      'sample-picker-open': samplePickerOpen
    }"
  >
    <main class='workspace'>
      <!-- Full product shell: source controls, settings, viewer and responsive actions. -->
      <div v-if='!immersiveMode' class='layout-shell'>
        <!--
          Desktop top cluster. The navigation and file capsule are separate in
          the expanded state and share geometry during the merge animation.
        -->
        <div class='top-capsule-cluster'>
          <nav
            ref='topCapsuleNavigationRef'
            class='rail-navigation'
            :aria-label='demoCopy.previewActions'
            @pointerenter='handleFileCapsulePointerEnter'
            @pointerleave='handleFileCapsulePointerLeave'
            @focusin='handleFileCapsuleFocusIn'
            @focusout='handleFileCapsuleFocusOut'
          >
            <button
              ref='linkTriggerButtonRef'
              type='button'
              class='rail-nav-button rail-nav-button--link'
              :class='{ active: desktopSourcePanelOpen && desktopSourceMode === "link" }'
              :aria-label='demoCopy.openFromLink'
              :aria-pressed='desktopSourcePanelOpen && desktopSourceMode === "link"'
              @click='toggleDesktopSourcePanel("link")'
            >
              <Link2 :size='21' :stroke-width='2.15' />
              <span>{{ demoCopy.pasteLink }}</span>
            </button>
            <button
              ref='uploadTriggerButtonRef'
              type='button'
              class='rail-nav-button rail-nav-button--upload'
              :class='{ active: desktopSourcePanelOpen && desktopSourceMode === "upload" }'
              :aria-hidden='fileCapsuleMerged || fileCapsuleActionLocked ? "true" : undefined'
              :aria-label='demoCopy.openFromDevice'
              :aria-pressed='desktopSourcePanelOpen && desktopSourceMode === "upload"'
              :tabindex='fileCapsuleMerged || fileCapsuleActionLocked ? -1 : undefined'
              @click='toggleDesktopSourcePanel("upload")'
            >
              <FolderOpen :size='21' :stroke-width='2.15' />
              <span>{{ demoCopy.openFile }}</span>
            </button>
            <button
              ref='sampleRailButtonRef'
              type='button'
              class='rail-nav-button rail-nav-button--samples'
              :class='{ active: desktopSourcePanelOpen && desktopSourceMode === "samples" }'
              :aria-label='demoCopy.openSamples'
              :aria-pressed='desktopSourcePanelOpen && desktopSourceMode === "samples"'
              @click='toggleDesktopSourcePanel("samples", "samples")'
            >
              <Sparkles :size='21' :stroke-width='2.15' />
              <span>{{ demoCopy.samples }}</span>
            </button>
          </nav>

          <div class='viewer-toolbar'>
            <div
              class='viewer-file-identity'
              @pointerenter='handleFileCapsulePointerEnter'
              @pointerleave='handleFileCapsulePointerLeave'
              @focusin='handleFileCapsuleFocusIn'
              @focusout='handleFileCapsuleFocusOut'
            >
              <button
                ref='fileIdentityButtonRef'
                type='button'
                class='viewer-copy'
                :class='{ active: fileSamplesOpen }'
                aria-haspopup='dialog'
                :aria-expanded='fileSamplesOpen'
                :aria-label='fileIdentityAriaLabel'
                :tabindex='fileCapsuleActionLocked ? -1 : undefined'
                @click='toggleFileSamples'
              >
                <DemoFileTypeIcon class='viewer-current-file-icon' :meta='currentIconMeta' :size='32' />
                <span class='viewer-file-copy'>
                  <strong :title='displayName'>{{ displayName }}</strong>
                </span>
                <span class='viewer-type'>{{ previewType }}</span>
                <ChevronUp
                  v-if='fileSamplesOpen'
                  class='viewer-file-chevron'
                  :size='17'
                  :stroke-width='2.25'
                  aria-hidden='true'
                />
                <ChevronDown v-else class='viewer-file-chevron' :size='17' :stroke-width='2.25' aria-hidden='true' />
              </button>
            </div>
            <div class='viewer-path'>{{ displayPath }}</div>
          </div>
          </div>

        <!--
          Shared source/settings rail. CSS presents it as an anchored desktop
          popover or a mobile bottom sheet without duplicating its form state.
        -->
        <aside
          ref='controlPanelRef'
          class='control-panel'
          :class='{ "desktop-source-open": desktopSourcePanelOpen, "settings-open": settingsPanelOpen }'
          :data-source-mode='desktopSourceMode'
        >
          <a
            class='rail-brand'
            :href='officialSiteUrl'
            target='_blank'
            rel='noreferrer'
            :aria-label='demoLocale === "zh-CN" ? "打开 File Viewer 官网" : "Open the File Viewer official website"'
          >
            <span class='brand-mark'>
              <img :src='brandLogo' alt='' />
            </span>
            <h1>File Viewer Demo</h1>
          </a>

          <button type='button' class='mobile-sheet-close' :aria-label='demoCopy.closePanel' @click='closeMobileControls'>
            <X :size='18' :stroke-width='2.5' />
          </button>

          <div
            v-if='desktopSourcePanelOpen || mobileControlsOpen'
            class='panel-body'
            role='dialog'
            :aria-label='desktopSourcePanelTitle'
            :data-source-anchor='sourcePanelAnchor'
            :style='sourcePanelStyle'
          >
            <header class='source-panel-header'>
              <span>
                <strong>{{ desktopSourcePanelTitle }}</strong>
                <small v-if='desktopSourceMode !== "samples"'>{{ desktopSourcePanelHint }}</small>
              </span>
              <button
                type='button'
                :aria-label='demoCopy.closePanel'
                @click='mobileControlsOpen ? closeMobileControls() : closeDesktopSourcePanel(true)'
              >
                <X :size='17' :stroke-width='2.4' />
              </button>
            </header>

            <!-- Remote URL mode: editable address plus the resolved path context. -->
            <template v-if='desktopSourceMode === "link"'>
              <section class='source-command source-command--focused'>
                <label class='field-label' for='preview-url'>{{ demoCopy.address }}</label>
                <div class='source-command-row'>
                  <input
                    id='preview-url'
                    v-model='url'
                    class='compact-field'
                    type='url'
                    inputmode='url'
                    autocomplete='url'
                    :placeholder='demoCopy.addressPlaceholder'
                    @keyup.enter='openUrlPreview()'
                  />
                  <button type='button' class='primary-button' @click='openUrlPreview()'>
                    {{ demoCopy.preview }}
                  </button>
                </div>
              </section>
              <div class='source-context-row'>
                <Link2 :size='17' :stroke-width='2.2' />
                <span>
                  <small>{{ demoCopy.filePath }}</small>
                  <strong>{{ displayPath }}</strong>
                </span>
              </div>
            </template>

            <!-- Local mode: the File object is passed directly and never uploaded. -->
            <template v-else-if='desktopSourceMode === "upload"'>
              <label class='desktop-upload-dropzone'>
                <input type='file' :accept='uploadAccept' @change='handleChange' />
                <span class='desktop-upload-icon'>
                  <Upload :size='23' :stroke-width='2.1' />
                </span>
                <strong>{{ demoCopy.chooseFile }}</strong>
                <small role='status'>{{ recentLocalReselectNotice || demoCopy.uploadPanelHint }}</small>
                <em>{{ filename || demoCopy.openLocal }}</em>
              </label>
            </template>

            <!-- Sample mode: one expanded group keeps the large catalog compact. -->
            <template v-else>
              <div ref='samplePickerRef' class='sample-picker' :class='{ open: samplePickerOpen }'>
                <button
                  type='button'
                  class='sample-trigger'
                  aria-controls='sample-menu'
                  :aria-expanded="samplePickerOpen ? 'true' : 'false'"
                  @click='toggleSamplePicker'
                >
                  <DemoFileTypeIcon :meta='activeIconMeta' :size='44' />
                  <span class='sample-trigger-copy'>
                    <span>{{ demoCopy.sampleFile }}</span>
                    <strong>{{ activePreset?.name || fileNameOf(url) }}</strong>
                    <em>{{ activePreset ? fileNameOf(activePreset.url) : url }}</em>
                  </span>
                  <span class='sample-trigger-action'>{{ samplePickerOpen ? demoCopy.collapse : demoCopy.open }}</span>
                </button>

                <div
                  v-if='samplePickerOpen'
                  id='sample-menu'
                  class='sample-menu'
                >
                  <section
                    v-for='(group, groupIndex) in sampleGroups'
                    :key='group.title'
                    class='sample-group'
                    :class="{ 'sample-group--open': expandedSampleGroupIndex === groupIndex }"
                    :data-family='group.family'
                  >
                    <button
                      type='button'
                      class='sample-group-header'
                      :aria-expanded="expandedSampleGroupIndex === groupIndex ? 'true' : 'false'"
                      :aria-controls='`sample-group-panel-${groupIndex}`'
                      @click='toggleSampleGroup(groupIndex)'
                    >
                      <span class='sample-group-title'>{{ group.title }}</span>
                      <em>{{ group.description }}</em>
                      <strong>{{ group.items.length }}</strong>
                      <i aria-hidden='true' />
                    </button>
                    <div
                      v-if='expandedSampleGroupIndex === groupIndex'
                      :id='`sample-group-panel-${groupIndex}`'
                      class='sample-group-grid'
                    >
                      <button
                        v-for='item in group.items'
                        :key='item.url'
                        type='button'
                        class='sample-card'
                        :class='{ active: isActivePreset(item) }'
                        @click='selectPreset(item.url)'
                      >
                        <DemoFileTypeIcon :meta='getFileIconMeta(item.url)' :size='36' />
                        <span class='sample-card-copy'>
                          <strong>{{ item.name }}</strong>
                          <span>{{ fileNameOf(item.url) }}</span>
                        </span>
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </template>
          </div>

          <!-- Settings are draft-based; renderer-affecting changes apply atomically. -->
          <DemoViewerSettingsPanel
            v-if='settingsPanelOpen'
            v-model:settings='settingsDraft'
            v-model:active-tab='settingsActiveTab'
            v-model:format-section='settingsFormatSection'
            :copy='demoCopy'
            :preview-type='previewType'
            :current-format-section='currentSettingsFormatSection'
            :fit-mode-options='fitModeOptions'
            :applying='settingsApplying'
            :error='settingsApplyError'
            @close='closeSettingsPanel(true)'
            @reset='resetSettingsDraft()'
            @apply='applySettingsAndRestoreFocus'
          />
        </aside>

        <!-- Main document surface and the demo-owned external toolbar. -->
        <section class='viewer-panel'>
          <!-- Repository and locale are global shell actions, not renderer actions. -->
          <div class='viewer-global-actions'>
            <a
              class='viewer-github-link'
              :href='githubRepositoryUrl'
              target='_blank'
              rel='noreferrer'
              :aria-label='githubRepositoryAriaLabel'
            >
              <img :src='githubMark' alt='' />
            </a>
            <div
              ref='localeSwitcherRef'
              class='viewer-locale-switch'
              :class='{ open: localeMenuOpen }'
              @focusout='handleLocaleSwitcherFocusOut'
            >
              <button
                ref='localeTriggerButtonRef'
                type='button'
                class='viewer-locale-trigger'
                :title='localeTriggerTitle'
                :aria-label='localeTriggerTitle'
                aria-haspopup='menu'
                aria-controls='viewer-locale-menu'
                :aria-expanded='localeMenuOpen'
                @click='toggleLocaleMenu'
                @keydown.down.prevent='openLocaleMenu("first")'
                @keydown.up.prevent='openLocaleMenu("last")'
              >
                <Globe :size='21' :stroke-width='2.05' aria-hidden='true' />
              </button>
              <Transition name='viewer-locale-menu'>
                <div
                  v-if='localeMenuOpen'
                  id='viewer-locale-menu'
                  ref='localeMenuRef'
                  class='viewer-locale-menu'
                  role='menu'
                  :aria-label='demoCopy.language'
                  @keydown='handleLocaleMenuKeydown'
                >
                  <button
                    v-for='option in demoLocaleOptions'
                    :key='option.value'
                    type='button'
                    role='menuitemradio'
                    class='viewer-locale-option'
                    :class='{ active: demoLocale === option.value }'
                    :data-locale='option.value'
                    :aria-checked='demoLocale === option.value'
                    @click='selectDemoLocale(option.value)'
                  >
                    <span class='viewer-locale-option-short' aria-hidden='true'>{{ option.shortLabel }}</span>
                    <span class='viewer-locale-option-name'>{{ option.label }}</span>
                    <Check
                      class='viewer-locale-option-check'
                      :class='{ visible: demoLocale === option.value }'
                      :size='16'
                      :stroke-width='2.4'
                      aria-hidden='true'
                    />
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Each action reflects public API availability from the active renderer. -->
          <nav class='immersive-right-toolbar' :aria-label='demoCopy.previewActions'>
            <button
              v-if='appliedViewerSettings.toolbarSearch && appliedViewerSettings.searchEnabled'
              type='button'
              :class='{ active: viewerSearchOpen }'
              :data-tooltip='demoCopy.search'
              :aria-label='demoCopy.searchDocument'
              @click='openViewerSearch'
            >
              <Search :size='21' :stroke-width='2.1' />
            </button>
            <button
              type='button'
              :data-tooltip='demoCopy.theme'
              :aria-label='demoThemeButtonTitle'
              :aria-pressed='resolvedDemoTheme === "dark"'
              @click='toggleDemoTheme'
            >
              <Sun v-if='resolvedDemoTheme === "dark"' :size='21' :stroke-width='2.05' />
              <Moon v-else :size='21' :stroke-width='2.05' />
            </button>
            <button
              v-if='visibleExternalToolbar.download'
              type='button'
              :disabled='viewerActionDisabled || !viewerAvailability.download'
              :data-tooltip='demoCopy.download'
              :aria-label='demoCopy.downloadTitle'
              @click='triggerViewerAction("download")'
            >
              <Download :size='21' :stroke-width='2.05' />
            </button>
            <div class='immersive-more-menu' :data-open='desktopActionsOpen ? "true" : "false"'>
              <button
                ref='settingsButtonRef'
                type='button'
                data-viewer-action='more'
                :class='{ active: desktopActionsOpen }'
                :data-tooltip='demoCopy.more'
                :aria-label='demoCopy.openMoreActions'
                aria-haspopup='menu'
                :aria-expanded='desktopActionsOpen'
                @click='toggleDesktopActions'
              >
                <MoreHorizontal :size='22' :stroke-width='2.15' />
              </button>
              <div
                v-if='desktopActionsOpen'
                ref='morePanelRef'
                class='immersive-more-panel'
                role='menu'
                @keydown='handleMoreMenuKeydown'
              >
                <button v-if='visibleExternalToolbar.print' type='button' role='menuitem' :disabled='!viewerAvailability.print' @click='printDirect'>
                  <Printer :size='17' /><span>{{ demoCopy.printDirect }}</span>
                </button>
                <button v-if='visibleExternalToolbar.print' type='button' role='menuitem' :disabled='!viewerAvailability.print' @click='printWithMask'>
                  <Stamp :size='17' /><span>{{ demoCopy.printMask }}</span>
                </button>
                <button v-if='visibleExternalToolbar.exportHtml' type='button' role='menuitem' :disabled='!viewerAvailability.exportHtml' @click='triggerViewerAction("exportHtml")'>
                  <Code2 :size='17' /><span>{{ demoCopy.exportHtml }}</span>
                </button>
                <button type='button' role='menuitem' :class='{ active: watermarkEnabled }' @click='toggleWatermark'>
                  <Stamp :size='17' /><span>{{ demoCopy.watermark }}</span>
                </button>
                <button type='button' role='menuitem' :disabled='!viewerAvailability.zoomReset' @click='triggerViewerAction("resetZoom")'>
                  <RotateCcw :size='17' /><span>{{ demoCopy.resetZoom }}</span>
                </button>
                <button type='button' role='menuitem' @click='openSnippetDialog'>
                  <Code2 :size='17' /><span>{{ demoCopy.integration }}</span>
                </button>
                <button type='button' role='menuitem' data-viewer-action='settings' @click='toggleSettingsPanel'>
                  <Settings2 :size='17' /><span>{{ demoCopy.settings }}</span>
                </button>
              </div>
            </div>
          </nav>

          <Transition name='settings-notice'>
            <div v-if='settingsNoticeVisible' class='settings-notice' role='status'>
              <Check :size='16' :stroke-width='2.5' />
              <span>{{ demoCopy.settingsApplied }}</span>
            </div>
          </Transition>

          <!-- Search state is renderer-backed and shared with the Cmd/Ctrl+F shortcut. -->
          <div v-if='viewerSearchOpen' class='viewer-search-popover' role='search' :aria-label='demoCopy.searchDocument'>
            <input
              ref='viewerSearchInputRef'
              v-model.trim='viewerSearchQuery'
              type='search'
              :placeholder='demoCopy.searchPlaceholder'
              @keyup.enter='runViewerSearch'
            />
            <span class='viewer-search-summary'>{{ viewerSearchSummary }}</span>
            <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.previousResult' :aria-label='demoCopy.previousResult' @click='previousViewerSearch'>
              <ChevronUp class='viewer-search-icon' aria-hidden='true' />
            </button>
            <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.nextResult' :aria-label='demoCopy.nextResult' @click='nextViewerSearch'>
              <ChevronDown class='viewer-search-icon' aria-hidden='true' />
            </button>
            <button type='button' class='viewer-search-close' :title='demoCopy.closeSearch' @click='closeViewerSearch'>
              <X class='viewer-search-icon' aria-hidden='true' />
            </button>
          </div>

          <!--
            This is the only scrolling content region. The surrounding shell,
            source controls and action docks remain fixed for immersion.
          -->
          <div class='viewport'>
            <file-viewer
              :key='viewerRevision'
              ref='fileViewerRef'
              :file='file'
              :url='preview'
              :options='viewerOptions'
              @load-start='handleViewerLoadStart'
              @operation-availability-change='handleViewerAvailabilityChange'
              @load-complete='handleViewerLoadComplete'
              @search-change='handleViewerSearchChange'
              @view-state-change='handleViewerViewStateChange'
              @zoom-change='handleViewerZoomChange'
            />
          </div>
          <!-- Stable page/zoom feedback remains outside renderer-specific toolbars. -->
          <div class='viewer-status-dock' :aria-label='demoCopy.previewActions'>
            <span class='viewer-status-context'>{{ viewerPageLabel }}</span>
            <i v-if='visibleExternalToolbar.zoom' class='viewer-status-divider' aria-hidden='true' />
            <div
              v-if='visibleExternalToolbar.zoom'
              class='viewer-zoom-controls'
              role='group'
              :aria-label='demoCopy.zoomControls'
            >
              <button
                type='button'
                class='viewer-zoom-button'
                data-demo-zoom-action='out'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomOut'
                :title='demoCopy.zoomOut'
                :aria-label='demoCopy.zoomOut'
                @click='triggerViewerAction("zoomOut")'
              >
                <ZoomOut :size='17' :stroke-width='2.25' aria-hidden='true' />
              </button>
              <button
                type='button'
                class='viewer-zoom-meter'
                data-demo-zoom-action='reset'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomReset'
                :title='viewerZoomResetLabel'
                :aria-label='viewerZoomResetLabel'
                @click='triggerViewerAction("resetZoom")'
              >
                <span aria-live='polite' aria-atomic='true'>{{ viewerZoomDisplayLabel }}</span>
              </button>
              <button
                type='button'
                class='viewer-zoom-button'
                data-demo-zoom-action='in'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomIn'
                :title='demoCopy.zoomIn'
                :aria-label='demoCopy.zoomIn'
                @click='triggerViewerAction("zoomIn")'
              >
                <ZoomIn :size='17' :stroke-width='2.25' aria-hidden='true' />
              </button>
              <button
                type='button'
                class='viewer-zoom-button viewer-zoom-fit'
                data-demo-zoom-action='fit'
                :disabled='viewerActionDisabled || !viewerAvailability.zoom'
                :title='demoCopy.fitMode'
                :aria-label='demoCopy.fitMode'
                @click='fitCurrentDocument'
              >
                <Scan :size='17' :stroke-width='2.2' aria-hidden='true' />
              </button>
            </div>
          </div>
        </section>

        <!-- Recent history is product-mode UI and never appears in URL/embed mode. -->
        <DemoRecentFiles
          v-if='recentPanelOpen && recentDisplayEntries.length'
          :entries='recentDisplayEntries'
          :copy='recentFilesCopy'
          @open='openRecentFile'
          @dismiss='dismissRecentFileEntry'
          @close='recentPanelOpen = false'
        />
        <button
          v-else-if='hasRecentFiles'
          type='button'
          class='recent-history-fab'
          :title='demoCopy.showRecent'
          :aria-label='demoCopy.showRecent'
          @click='recentPanelOpen = true'
        >
          <History :size='20' :stroke-width='2.15' aria-hidden='true' />
        </button>

        <button
          v-if='mobileControlsOpen'
          type='button'
          class='mobile-control-backdrop'
          :aria-label='demoCopy.closeMobileControls'
          @click='closeMobileControls'
        />

        <!--
          Mobile exposes one More entry. It contains source selection, viewer
          operations, theme, integration help and the complete settings panel.
        -->
        <nav class='mobile-action-dock' :aria-label='demoCopy.previewActions'>
          <div
            v-if='mobileActionsOpen'
            ref='mobileActionsPanelRef'
            class='mobile-action-panel'
            role='dialog'
            :aria-label='demoCopy.openMoreActions'
          >
            <header class='mobile-action-header'>
              <span>
                <MoreHorizontal :size='19' :stroke-width='2.5' aria-hidden='true' />
                <strong>{{ demoCopy.more }}</strong>
                <small>{{ demoCopy.previewActions }}</small>
              </span>
              <button type='button' :aria-label='demoCopy.closeMobileControls' @click='toggleMobileActions'>
                <X :size='17' :stroke-width='2.5' aria-hidden='true' />
              </button>
            </header>

            <div class='mobile-action-source-grid'>
              <button type='button' :aria-label='demoCopy.openLinkSettings' @click='openMobileControls("link")'>
                <Link2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.link }}</span>
              </button>
              <button type='button' :aria-label='demoCopy.uploadLocalFile' @click='openMobileControls("upload")'>
                <Upload :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.upload }}</span>
              </button>
              <button type='button' :aria-label='demoCopy.openSamples' @click='openMobileControls("samples", "samples")'>
                <FileSearch :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.samples }}</span>
              </button>
              <button
                v-if='appliedViewerSettings.toolbarSearch && appliedViewerSettings.searchEnabled'
                type='button'
                :aria-label='demoCopy.searchCurrentDocument'
                @click='openViewerSearch'
              >
                <Search :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.search }}</span>
              </button>
            </div>

            <label class='mobile-fit-control'>
              <span>{{ demoCopy.fitMode }}</span>
              <select :value='fitMode' :aria-label='demoCopy.fitMode' @change='selectFitMode'>
                <option
                  v-for='option in fitModeOptions'
                  :key='option.value'
                  :value='option.value'
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <div class='mobile-action-tool-grid'>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomOut'
                :aria-label='demoCopy.zoomOut'
                @click='triggerViewerAction("zoomOut")'
              >
                <ZoomOut :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.zoomOut }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomReset'
                :title='viewerZoomResetLabel'
                :aria-label='viewerZoomResetLabel'
                @click='triggerViewerAction("resetZoom")'
              >
                <RotateCcw :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ viewerZoomDisplayLabel }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomIn'
                :aria-label='demoCopy.zoomIn'
                @click='triggerViewerAction("zoomIn")'
              >
                <ZoomIn :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.zoomIn }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoom'
                :aria-label='demoCopy.fitMode'
                @click='fitCurrentDocument'
              >
                <Scan :size='18' :stroke-width='2.2' aria-hidden='true' />
                <span>{{ demoCopy.fitMode }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.download'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.download'
                @click='triggerViewerAction("download")'
              >
                <Download :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.download }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.print'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.print'
                @click='printDirect'
              >
                <Printer :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.printDirect }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.print'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.print'
                @click='printWithMask'
              >
                <Stamp :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.printMask }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.exportHtml'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.exportHtml'
                @click='triggerViewerAction("exportHtml")'
              >
                <Code2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>HTML</span>
              </button>
              <button type='button' :class='{ active: watermarkEnabled }' @click='toggleWatermark'>
                <Stamp :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.watermark }}</span>
              </button>
            </div>

            <footer class='mobile-action-settings-grid'>
              <button type='button' @click='toggleDemoTheme'>
                <Sun v-if='resolvedDemoTheme === "dark"' :size='18' :stroke-width='2.25' aria-hidden='true' />
                <Moon v-else :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.theme }}</span>
              </button>
              <button type='button' @click='openSnippetDialog'>
                <Code2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.integration }}</span>
              </button>
              <button type='button' @click='toggleSettingsPanel'>
                <Settings2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.fullSettings }}</span>
              </button>
            </footer>
          </div>

          <button
            ref='mobileMoreButtonRef'
            type='button'
            class='mobile-more-trigger'
            :class='{ active: mobileActionsOpen }'
            :aria-label='mobileActionsOpen ? demoCopy.closeMobileControls : demoCopy.openMoreActions'
            aria-haspopup='dialog'
            :aria-expanded="mobileActionsOpen ? 'true' : 'false'"
            @click='toggleMobileActions'
          >
            <X v-if='mobileActionsOpen' :size='20' :stroke-width='2.6' aria-hidden='true' />
            <MoreHorizontal v-else :size='21' :stroke-width='2.6' aria-hidden='true' />
            <span>{{ demoCopy.more }}</span>
          </button>
        </nav>
      </div>

      <!-- Explicit URL/embed entry: keep the caller's renderer toolbar and omit demo chrome. -->
      <section v-else class='viewer-panel standalone'>
        <!-- Search is the only demo overlay retained for the standalone surface. -->
        <div v-if='viewerSearchOpen' class='viewer-search-popover viewer-search-popover--standalone' role='search' :aria-label='demoCopy.searchDocument'>
          <input
            ref='viewerSearchInputRef'
            v-model.trim='viewerSearchQuery'
            type='search'
            :placeholder='demoCopy.searchPlaceholder'
            @keyup.enter='runViewerSearch'
          />
          <span class='viewer-search-summary'>{{ viewerSearchSummary }}</span>
          <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.previousResult' :aria-label='demoCopy.previousResult' @click='previousViewerSearch'>
            <ChevronUp class='viewer-search-icon' aria-hidden='true' />
          </button>
          <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.nextResult' :aria-label='demoCopy.nextResult' @click='nextViewerSearch'>
            <ChevronDown class='viewer-search-icon' aria-hidden='true' />
          </button>
          <button type='button' class='viewer-search-close' :title='demoCopy.closeSearch' @click='closeViewerSearch'>
            <X class='viewer-search-icon' aria-hidden='true' />
          </button>
        </div>
        <div class='viewport'>
          <file-viewer
            :key='viewerRevision'
            ref='fileViewerRef'
            :file='file'
            :url='preview'
            :options='viewerOptions'
            @load-start='handleViewerLoadStart'
            @operation-availability-change='handleViewerAvailabilityChange'
            @load-complete='handleViewerLoadComplete'
            @search-change='handleViewerSearchChange'
            @view-state-change='handleViewerViewStateChange'
            @zoom-change='handleViewerZoomChange'
          />
        </div>
      </section>
    </main>

    <!-- Teleport prevents transformed viewer ancestors from clipping the modal. -->
    <Teleport to='body'>
      <Transition name='snippet-dialog'>
        <div
          v-if='snippetDialogOpen'
          class='snippet-dialog-backdrop'
          :data-demo-theme='resolvedDemoTheme'
          @click.self='closeSnippetDialog'
        >
          <section
            ref='snippetDialogRef'
            id='integration-snippet-dialog'
            class='snippet-dialog-panel'
            role='dialog'
            aria-modal='true'
            aria-labelledby='integration-snippet-title'
            aria-describedby='integration-snippet-description'
          >
            <header class='snippet-dialog-header'>
              <span class='snippet-dialog-icon'>
                <Code2 :size='21' :stroke-width='2.3' />
              </span>
              <span class='snippet-dialog-title'>
                <strong id='integration-snippet-title'>{{ demoCopy.integrationSnippet }}</strong>
                <em id='integration-snippet-description'>{{ demoCopy.integrationSnippetDescription }}</em>
              </span>
              <button
                ref='snippetCloseRef'
                type='button'
                class='snippet-dialog-close'
                :aria-label='demoCopy.closeIntegrationSnippet'
                @click='closeSnippetDialog'
              >
                <X :size='18' :stroke-width='2.5' />
              </button>
            </header>

            <pre class='snippet-dialog-code'><code>{{ integrationSnippet }}</code></pre>

            <footer class='snippet-dialog-footer'>
              <span>{{ demoCopy.integrationSnippetHint }}</span>
              <button
                type='button'
                class='snippet-dialog-copy'
                :class='{ copied: snippetCopied }'
                :title='snippetCopied ? demoCopy.copiedSnippet : demoCopy.copySnippet'
                @click='copyIntegrationSnippet'
              >
                <Check v-if='snippetCopied' :size='16' :stroke-width='2.5' />
                <Copy v-else :size='16' :stroke-width='2.5' />
                <strong>{{ snippetCopied ? demoCopy.copiedSnippet : demoCopy.copySnippet }}</strong>
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped src='../assets/demo-shell-base.css'></style>

<style scoped src='../assets/demo-shell-immersive.css'></style>
