import { demoLanguage } from './locale'
import fileViewer from '@file-viewer/svelte-full/action'
import { getDemoSource } from './demoSource'
import './styles.css'

const host = document.getElementById('svelte-viewer')
const demoSource = getDemoSource()

if (!host) {
  throw new Error('Missing #svelte-viewer host element.')
}

const action = fileViewer(host, {
  url: demoSource.url,
  filename: demoSource.filename,
  options: {
    locale: demoLanguage.locale,
    theme: 'light',
    toolbar: {
      position: 'bottom-right'
    }
  }
})

document.body.setAttribute('data-component', 'svelte-action')

demoLanguage.subscribe(() => { action.update({ options: { theme: 'light', toolbar: { position: 'bottom-right' }, locale: demoLanguage.locale } }) })
