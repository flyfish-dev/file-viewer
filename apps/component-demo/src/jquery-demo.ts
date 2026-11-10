import { demoLanguage } from './locale'
import jquery from 'jquery'
import { installJQueryFileViewer } from '@file-viewer/jquery-full'
import { getDemoSource } from './demoSource'
import './styles.css'

const demoSource = getDemoSource()
const host = document.getElementById('jquery-viewer')

if (!host) {
  throw new Error('Missing #jquery-viewer host element.')
}

const $ = jquery
installJQueryFileViewer($)

$(host).fileViewer({
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

document.body.setAttribute('data-component', 'jquery')

demoLanguage.subscribe(() => { $(host).fileViewer('update', { options: { theme: 'light', toolbar: { position: 'bottom-right' }, locale: demoLanguage.locale } }) })
