import {
  createFileViewerI18n,
  FILE_VIEWER_LOCALE_OPTIONS,
  type FileViewerResolvedLocale
} from '@file-viewer/core'

const storageKey = 'file-viewer-component-demo-locale'
const readPreference = () => {
  try {
    return localStorage.getItem(storageKey)
  } catch {
    return null
  }
}
const query = new URLSearchParams(location.search)
export const demoLanguage = createFileViewerI18n({
  locale: query.get('locale') || query.get('lang') || readPreference() || 'auto'
})

const rows = {
  emailTitle: [
    'React 邮件附件生命周期',
    'React email attachment lifecycle',
    'React メール添付のライフサイクル',
    'React 郵件附件生命週期',
    'React 郵件附件生命週期',
    'Lebenszyklus von React-E-Mail-Anhängen',
    'Жизненный цикл вложений почты в React'
  ],
  emailDescription: [
    '四种 React 接入使用同一个固定的构造邮件样例。',
    'Four React integrations use the same fixed synthetic email fixture.',
    '4 種類の React 組み込みで同じ固定の生成メールサンプルを使用します。',
    '四種 React 接入使用同一個固定的合成郵件範例。',
    '四種 React 接入使用同一個固定的合成郵件範例。',
    'Vier React-Integrationen verwenden dieselbe feste synthetische E-Mail-Datei.',
    'Четыре интеграции React используют один фиксированный синтетический пример письма.'
  ],
  switchFixture: [
    '切换样例',
    'Switch sample',
    'サンプルを切り替える',
    '切換範例',
    '切換範例',
    'Beispiel wechseln',
    'Сменить пример'
  ],
  unmountViewers: [
    '卸载预览器',
    'Unmount viewers',
    'ビューアーを破棄',
    '卸載預覽器',
    '卸載預覽器',
    'Viewer entfernen',
    'Размонтировать просмотрщики'
  ],
  mountViewers: [
    '挂载预览器',
    'Mount viewers',
    'ビューアーを表示',
    '掛載預覽器',
    '掛載預覽器',
    'Viewer einbinden',
    'Смонтировать просмотрщики'
  ],
  unmounted: [
    '预览器已卸载。',
    'Viewers unmounted.',
    'ビューアーを破棄しました。',
    '預覽器已卸載。',
    '預覽器已卸載。',
    'Viewer entfernt.',
    'Просмотрщики размонтированы.'
  ],
  loadingFixture: [
    '正在加载邮件样例…',
    'Loading email sample…',
    'メールサンプルを読み込み中…',
    '正在載入郵件範例…',
    '正在載入郵件範例…',
    'E-Mail-Beispiel wird geladen…',
    'Загрузка примера письма…'
  ],
  language: ['语言', 'Language', '言語', '語言', '語言', 'Sprache', 'Язык'],
  description: [
    '原生组件示例，完整运行时支持离线使用。',
    'Native component examples with the full offline runtime.',
    '完全なオフラインランタイムを備えたネイティブコンポーネントの例。',
    '原生元件範例，完整執行階段支援離線使用。',
    '原生元件範例，完整執行環境支援離線使用。',
    'Native Komponentenbeispiele mit vollständiger Offline-Laufzeit.',
    'Примеры нативных компонентов с полной автономной средой выполнения.'
  ],
  links: [
    '演示链接',
    'Demo links',
    'デモリンク',
    '示範連結',
    '示範連結',
    'Demo-Links',
    'Ссылки на примеры'
  ],
  preview: [
    '组件预览',
    'Component preview',
    'コンポーネントのプレビュー',
    '元件預覽',
    '元件預覽',
    'Komponentenvorschau',
    'Предпросмотр компонента'
  ],
  componentDemo: [
    '组件演示',
    'Component demo',
    'コンポーネントデモ',
    '元件示範',
    '元件示範',
    'Komponentendemo',
    'Примеры компонентов'
  ],
  manual: [
    '原生 JS',
    'Vanilla JS',
    'ネイティブ JS',
    '原生 JS',
    '原生 JS',
    'Vanilla JS',
    'Обычный JS'
  ],
  element: [
    'Web Component',
    'Web Component',
    'Web Component',
    'Web Component',
    'Web Component',
    'Web Component',
    'Web Component'
  ],
  script: [
    '脚本标签',
    'Script tag',
    'script タグ',
    '指令碼標籤',
    '指令碼標籤',
    'Script-Tag',
    'Тег script'
  ],
  sample: ['示例', 'Sample', 'サンプル', '範例', '範例', 'Beispiel', 'Пример']
} as const

// Dictionary order is explicit; the selector itself always comes from core.
const languages: FileViewerResolvedLocale[] = [
  'zh-CN',
  'en-US',
  'ja-JP',
  'zh-TW',
  'zh-HK',
  'de-DE',
  'ru-RU'
]
export const demoText = (key: keyof typeof rows) =>
  rows[key][languages.indexOf(demoLanguage.locale)]

export function installDemoLanguageSelector() {
  const header = document.querySelector('header')
  if (!header || header.querySelector('[data-demo-language]')) return
  const label = document.createElement('label')
  label.className = 'demo-language'
  const caption = document.createElement('span')
  const select = document.createElement('select')
  select.dataset.demoLanguage = ''
  for (const locale of FILE_VIEWER_LOCALE_OPTIONS) {
    const option = document.createElement('option')
    option.value = locale.value
    option.textContent = locale.label
    select.append(option)
  }
  label.append(caption, select)
  header.append(label)
  select.addEventListener('change', () => {
    demoLanguage.update({ locale: select.value })
    try {
      localStorage.setItem(storageKey, select.value)
    } catch {
      /* Optional preference. */
    }
    const url = new URL(location.href)
    url.searchParams.set('locale', select.value)
    history.replaceState(null, '', url)
  })
  const refresh = () => {
    document.documentElement.lang = demoLanguage.locale
    document.documentElement.dataset.demoLocale = demoLanguage.locale
    caption.textContent = demoText('language')
    select.setAttribute('aria-label', demoText('language'))
    select.value = demoLanguage.locale
    document.querySelectorAll<HTMLElement>('[data-demo-copy]').forEach((node) => {
      const key = node.dataset.demoCopy as keyof typeof rows
      if (rows[key]) node.textContent = demoText(key)
    })
    document.querySelectorAll<HTMLElement>('[data-demo-label]').forEach((node) => {
      const key = node.dataset.demoLabel as keyof typeof rows
      if (rows[key]) node.setAttribute('aria-label', demoText(key))
    })
    document.querySelectorAll<HTMLAnchorElement>('.topbar-actions a').forEach((link) => {
      const url = new URL(link.href)
      if (url.origin === location.origin) {
        url.searchParams.set('locale', demoLanguage.locale)
        link.href = url.href
      }
    })
    window.dispatchEvent(
      new CustomEvent('file-viewer-demo-language', { detail: demoLanguage.locale })
    )
  }
  demoLanguage.subscribe(refresh)
  const status = document.getElementById('status')
  const refreshStatus = () => {
    if (!status) return
    const phase = document.body.dataset.viewerStatus
    status.textContent = demoLanguage.t(
      phase === 'load-complete'
        ? 'state.ready.title'
        : phase === 'error'
          ? 'state.error.title'
          : 'preview.reading'
    )
  }
  demoLanguage.subscribe(refreshStatus)
  const observer = new MutationObserver(refreshStatus)
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-viewer-status'] })
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true })
  window.addEventListener('pagehide', () => demoLanguage.destroy(), { once: true })
  refresh()
  refreshStatus()
}

queueMicrotask(installDemoLanguageSelector)
