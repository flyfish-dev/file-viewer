import { demoLanguage } from './locale'
import { createApp, h, ref } from 'vue'
import FileViewerPlugin, {
  FileViewer,
  type FileViewerToolbarSlotProps,
  type ViewerOptions
} from '@file-viewer/vue3-full'
import '@file-viewer/vue3/dist/file-viewer3.css'
import { getDemoSource } from './demoSource'
import './styles.css'

const host = document.getElementById('vue3-viewer')
const params = new URLSearchParams(window.location.search)
const toolbarSmoke = params.get('smoke')
const zoomSmoke = toolbarSmoke?.startsWith('zoom-') ?? false
const defaultUrl =
  toolbarSmoke === 'toolbar-slots'
    ? '/example/markdown.md'
    : toolbarSmoke === 'search-boundary'
      ? '/example/pic.png'
      : '/example/word.docx'
const demoSource = getDemoSource(defaultUrl)

if (!host) {
  throw new Error('Missing #vue3-viewer host element.')
}

const searchOnlyToolbar = {
  download: false,
  print: false,
  exportHtml: false,
  zoom: false,
  search: true,
  theme: false
} as const

const locale = ref(demoLanguage.locale)
demoLanguage.subscribe(() => { locale.value = demoLanguage.locale })

const options: ViewerOptions = {
  theme: 'light',
  toolbar: zoomSmoke
    ? {
        ...searchOnlyToolbar,
        zoom: true,
        items: toolbarSmoke === 'zoom-reset-hidden' ? { 'zoom-reset': false } : undefined,
        permissions: toolbarSmoke === 'zoom-in-denied' ? { 'zoom-in': false } : undefined
      }
    : toolbarSmoke
      ? searchOnlyToolbar
      : { position: 'bottom-right' },
  pdf: toolbarSmoke === 'zoom-pdf-hidden' ? { zoomToolbar: false } : undefined
}

const toolbarSlots =
  toolbarSmoke === 'toolbar-slots'
    ? {
        'toolbar-start': (slotProps: FileViewerToolbarSlotProps) =>
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'vue3-toolbar-start',
              'data-api-search': String(typeof slotProps.api.searchDocument === 'function'),
              'data-download-available': String(slotProps.availability.download),
              'data-zoom-scale': String(slotProps.zoomState.scale),
              'data-search-total': String(slotProps.searchState.total),
              onClick: () => slotProps.api.searchDocument('Markdown')
            },
            'Search from start slot'
          ),
        'toolbar-end': (slotProps: FileViewerToolbarSlotProps) =>
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'vue3-toolbar-end',
              'data-api-search': String(typeof slotProps.api.searchDocument === 'function'),
              'data-search-total': String(slotProps.searchState.total),
              onClick: () => {
                document.body.dataset.vue3ToolbarEndClicked = 'true'
              }
            },
            'End slot'
          )
      }
    : undefined

createApp({
  render() {
    return h(
      FileViewer,
      {
        url: demoSource.url,
        filename: demoSource.filename,
        options: { ...options, locale: locale.value }
      },
      toolbarSlots
    )
  }
})
  .use(FileViewerPlugin)
  .mount(host)

document.body.setAttribute('data-component', 'vue3')
