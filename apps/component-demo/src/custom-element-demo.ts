import { demoLanguage } from './locale'
import {
  defineFileViewerElement,
  type FileViewerElement,
  type ViewerEvent,
} from '@file-viewer/web-full'
import { getDemoSource } from './demoSource'
import './styles.css'

defineFileViewerElement()

const viewer = document.getElementById('custom-element-viewer') as FileViewerElement | null
const demoSource = getDemoSource()

if (!viewer) {
  throw new Error('Missing <flyfish-file-viewer> demo element.')
}

viewer.src = demoSource.url
viewer.filename = demoSource.filename
viewer.options = {
  locale: demoLanguage.locale,
  theme: 'light',
  toolbar: {
    position: 'bottom-right'
  },
  search: true
}

viewer.addEventListener('viewer-event', event => {
  const detail = (event as CustomEvent<ViewerEvent>).detail
  if (detail.type === 'load-start' || detail.type === 'load-complete') {
    document.body.setAttribute('data-viewer-status', detail.type)
  }
})

viewer.addEventListener('viewer-ready', () => {
  document.body.setAttribute('data-component', 'custom-element')
})

demoLanguage.subscribe(() => { viewer.options = { ...viewer.options, locale: demoLanguage.locale } })
