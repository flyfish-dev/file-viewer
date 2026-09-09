<script setup lang="ts">
import {
  onMounted,
  ref,
  shallowRef,
  useAttrs,
} from 'vue'
import {
  createEmptyFileViewerSearchState,
  createFileViewerZoomState,
  DEFAULT_OPERATION_AVAILABILITY,
  normalizeFileViewerFitOptions,
  normalizeFileViewerStyleIsolation,
} from '@file-viewer/core'
import type {
  FileViewerComponentEmits as FileViewerEmits,
  FileViewerComponentProps as FileViewerProps,
  FileViewerPublicApi as FileViewerExpose,
} from '@file-viewer/core'
import componentStyleHref from '../../style.css?url'
import type { FileViewerToolbarSlotProps } from '../../common/type'
import FileViewerContent from './FileViewer.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<FileViewerProps>()
const emit = defineEmits<FileViewerEmits>()
const slots = defineSlots<{
  'toolbar-start'?: (props: FileViewerToolbarSlotProps) => unknown
  'toolbar-end'?: (props: FileViewerToolbarSlotProps) => unknown
}>()
const attrs = useAttrs()

const contentViewer = ref<FileViewerExpose | null>(null)
const shadowHost = ref<HTMLDivElement | null>(null)
const shadowMount = shallowRef<HTMLDivElement | null>(null)
const initialStyleIsolation = normalizeFileViewerStyleIsolation(props.options?.styleIsolation)
const shadowEnabled = ref(
  initialStyleIsolation === 'auto' || initialStyleIsolation === 'shadow'
)

const ensureLightDomComponentStyles = (root?: Document | ShadowRoot) => {
  if (typeof document === 'undefined') return
  const styleRoot = root || document
  if (styleRoot.querySelector('link[data-file-viewer-style="true"]')) return

  const documentRoot = styleRoot.nodeType === 9 ? styleRoot as Document : styleRoot.ownerDocument
  if (!documentRoot) return
  const styleTarget = styleRoot.nodeType === 9 ? documentRoot.head : styleRoot

  const link = documentRoot.createElement('link')
  link.rel = 'stylesheet'
  link.href = componentStyleHref
  link.dataset.fileViewerStyle = 'true'
  styleTarget.appendChild(link)
  if (styleRoot.nodeType !== 9) {
    appendBundledComponentStyles(styleRoot as ShadowRoot)
  }
}

const vLightDomStyle = {
  mounted(element: HTMLElement) {
    const root = element.getRootNode()
    if (root instanceof Document || root instanceof ShadowRoot) {
      ensureLightDomComponentStyles(root)
    }
  },
}

if (!shadowEnabled.value) {
  ensureLightDomComponentStyles()
}

const publicApi: FileViewerExpose = {
  destroy: () => contentViewer.value?.destroy(),
  downloadOriginalFile: () => contentViewer.value?.downloadOriginalFile() || Promise.resolve(),
  printRenderedHtml: options => contentViewer.value?.printRenderedHtml(options) || Promise.resolve(),
  printWithMask: options => contentViewer.value?.printWithMask(options) || Promise.resolve(),
  exportRenderedHtml: () => contentViewer.value?.exportRenderedHtml() || Promise.resolve(),
  zoomIn: () => contentViewer.value?.zoomIn() || Promise.resolve(createFileViewerZoomState()),
  zoomOut: () => contentViewer.value?.zoomOut() || Promise.resolve(createFileViewerZoomState()),
  resetZoom: () => contentViewer.value?.resetZoom() || Promise.resolve(createFileViewerZoomState()),
  fitToView: fit => {
    if (contentViewer.value) {
      return contentViewer.value.fitToView(fit)
    }
    const normalized = normalizeFileViewerFitOptions(fit) || normalizeFileViewerFitOptions('auto')!
    return Promise.resolve({
      applied: false,
      mode: normalized.mode,
      resize: normalized.resize,
      provider: 'none',
      reason: 'not-mounted',
    })
  },
  getZoomState: () => contentViewer.value?.getZoomState() || createFileViewerZoomState(),
  getViewState: () => contentViewer.value?.getViewState() || null,
  applyViewState: (state, options) => contentViewer.value?.applyViewState(state, options) || Promise.resolve(null),
  getOperationAvailability: () => contentViewer.value?.getOperationAvailability() || {
    ...DEFAULT_OPERATION_AVAILABILITY,
  },
  getScrollContainer: () => contentViewer.value?.getScrollContainer() || null,
  searchDocument: query => contentViewer.value?.searchDocument(query) || Promise.resolve(
    createEmptyFileViewerSearchState(query)
  ),
  clearDocumentSearch: () => contentViewer.value?.clearDocumentSearch() || Promise.resolve(
    createEmptyFileViewerSearchState()
  ),
  nextSearchResult: () => contentViewer.value?.nextSearchResult() || Promise.resolve(
    createEmptyFileViewerSearchState()
  ),
  previousSearchResult: () => contentViewer.value?.previousSearchResult() || Promise.resolve(
    createEmptyFileViewerSearchState()
  ),
  getSearchState: () => contentViewer.value?.getSearchState() || createEmptyFileViewerSearchState(),
  collectDocumentAnchors: () => contentViewer.value?.collectDocumentAnchors() || Promise.resolve([]),
  scrollToAnchor: anchor => contentViewer.value?.scrollToAnchor(anchor) || Promise.resolve(false),
  scrollToLine: line => contentViewer.value?.scrollToLine(line) || Promise.resolve(false),
  getDocumentTextChunks: () => contentViewer.value?.getDocumentTextChunks() || [],
}

defineExpose(publicApi)

const createShadowResetStyle = (documentRef: Document) => {
  const style = documentRef.createElement('style')
  style.dataset.fileViewerVue3ShadowStyle = 'reset'
  style.textContent = `
:host {
  display: block;
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  color: var(--file-viewer-text, #172033);
  font: var(--file-viewer-font, 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  letter-spacing: 0;
}
.file-viewer-vue3-shadow-mount {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
`
  return style
}

const appendComponentStyleLink = (root: ShadowRoot) => {
  const link = root.ownerDocument.createElement('link')
  link.rel = 'stylesheet'
  link.href = componentStyleHref
  link.dataset.fileViewerVue3ShadowStyle = 'component'
  root.appendChild(link)
}

function appendBundledComponentStyles(root: ShadowRoot) {
  const scopeId = (FileViewerContent as unknown as { __scopeId?: string }).__scopeId
  if (!scopeId) return

  const marker = `[${scopeId}]`
  const scopeToken = scopeId.replace(/^data-v-/, '')
  const rules = new Set<string>()
  Array.from(root.ownerDocument.styleSheets).forEach(sheet => {
    try {
      Array.from(sheet.cssRules).forEach(rule => {
        const cssText = rule.cssText
        if (cssText.includes(marker) || cssText.includes(scopeToken)) {
          rules.add(cssText)
        }
      })
    } catch {
      // Cross-origin host stylesheets are intentionally ignored. Component
      // styles emitted by the consumer's bundler are always same-origin.
    }
  })
  if (!rules.size) return

  const style = root.ownerDocument.createElement('style')
  style.dataset.fileViewerVue3ShadowStyle = 'bundled-component'
  style.textContent = Array.from(rules).join('\n')
  root.appendChild(style)
}

const mountShadowShell = () => {
  const host = shadowHost.value
  if (!host || typeof host.attachShadow !== 'function') {
    shadowEnabled.value = false
    return
  }

  const root = host.shadowRoot || host.attachShadow({ mode: 'open' })
  root.replaceChildren()
  root.appendChild(createShadowResetStyle(host.ownerDocument))
  appendComponentStyleLink(root)
  appendBundledComponentStyles(root)

  const mount = host.ownerDocument.createElement('div')
  mount.className = 'file-viewer-vue3-shadow-mount'
  root.appendChild(mount)
  shadowMount.value = mount
}

onMounted(() => {
  if (shadowEnabled.value) {
    mountShadowShell()
  }
})
</script>

<template>
  <div
    v-if="shadowEnabled"
    ref="shadowHost"
    v-bind="attrs"
    class="file-viewer file-viewer-vue3-shadow-host"
  >
    <Teleport v-if="shadowMount" :to="shadowMount">
      <FileViewerContent
        ref="contentViewer"
        v-bind="props"
        @load-start="context => emit('load-start', context)"
        @load-complete="context => emit('load-complete', context)"
        @unload-start="context => emit('unload-start', context)"
        @unload-complete="context => emit('unload-complete', context)"
        @operation-before="context => emit('operation-before', context)"
        @operation-cancel="context => emit('operation-cancel', context)"
        @operation-availability-change="availability => emit('operation-availability-change', availability)"
        @search-change="state => emit('search-change', state)"
        @location-change="anchor => emit('location-change', anchor)"
        @zoom-change="state => emit('zoom-change', state)"
        @view-state-change="change => emit('view-state-change', change)"
        @fit-change="result => emit('fit-change', result)"
        @theme-change="theme => emit('theme-change', theme)"
      >
        <template v-if="slots['toolbar-start']" #toolbar-start="slotProps">
          <slot name="toolbar-start" v-bind="slotProps" />
        </template>
        <template v-if="slots['toolbar-end']" #toolbar-end="slotProps">
          <slot name="toolbar-end" v-bind="slotProps" />
        </template>
      </FileViewerContent>
    </Teleport>
  </div>
  <FileViewerContent
    v-else
    v-light-dom-style
    ref="contentViewer"
    v-bind="{ ...props, ...attrs }"
    @load-start="context => emit('load-start', context)"
    @load-complete="context => emit('load-complete', context)"
    @unload-start="context => emit('unload-start', context)"
    @unload-complete="context => emit('unload-complete', context)"
    @operation-before="context => emit('operation-before', context)"
    @operation-cancel="context => emit('operation-cancel', context)"
    @operation-availability-change="availability => emit('operation-availability-change', availability)"
    @search-change="state => emit('search-change', state)"
    @location-change="anchor => emit('location-change', anchor)"
    @zoom-change="state => emit('zoom-change', state)"
    @view-state-change="change => emit('view-state-change', change)"
    @fit-change="result => emit('fit-change', result)"
    @theme-change="theme => emit('theme-change', theme)"
  >
    <template v-if="slots['toolbar-start']" #toolbar-start="slotProps">
      <slot name="toolbar-start" v-bind="slotProps" />
    </template>
    <template v-if="slots['toolbar-end']" #toolbar-end="slotProps">
      <slot name="toolbar-end" v-bind="slotProps" />
    </template>
  </FileViewerContent>
</template>
