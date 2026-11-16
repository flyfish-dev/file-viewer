import {
  matchFileViewerLocale,
  type FileViewerResolvedLocale
} from '../../../packages/core/src/i18n/locales'

// Keep the boot screen small while the viewer and document engines load.
const copy: Record<FileViewerResolvedLocale, readonly [string, string, string, string]> = {
  'zh-CN': [
    '正在加载 File Viewer',
    '正在准备文件预览环境…',
    'File Viewer 启动失败',
    '无法启动预览，请重新加载页面。'
  ],
  'en-US': [
    'Loading File Viewer',
    'Preparing the file preview environment…',
    'File Viewer failed to start',
    'The preview could not start. Reload the page to try again.'
  ],
  'ja-JP': [
    'File Viewer を読み込み中',
    'ファイルのプレビュー環境を準備中…',
    'File Viewer を起動できませんでした',
    'プレビューを開始できません。ページを再読み込みしてください。'
  ],
  'zh-TW': [
    '正在載入 File Viewer',
    '正在準備檔案預覽環境…',
    'File Viewer 啟動失敗',
    '無法啟動預覽，請重新載入頁面。'
  ],
  'zh-HK': [
    '正在載入 File Viewer',
    '正在準備檔案預覽環境…',
    'File Viewer 啟動失敗',
    '無法啟動預覽，請重新載入頁面。'
  ],
  'de-DE': [
    'File Viewer wird geladen',
    'Die Dateivorschau wird vorbereitet…',
    'File Viewer konnte nicht starten',
    'Die Vorschau konnte nicht starten. Laden Sie die Seite erneut.'
  ],
  'ru-RU': [
    'Загрузка File Viewer',
    'Подготовка среды предпросмотра файлов…',
    'Не удалось запустить File Viewer',
    'Не удалось открыть предпросмотр. Перезагрузите страницу.'
  ]
}

export function applyDemoBootstrapCopy(failed = false) {
  const query = new URLSearchParams(location.search)
  let requested = query.get('locale') || query.get('lang')
  if (!requested) {
    try {
      requested = localStorage.getItem('file-viewer-demo-locale')
    } catch {
      /* Optional preference. */
    }
  }
  const locale =
    requested && requested !== 'auto'
      ? matchFileViewerLocale(requested) || 'en-US'
      : [...navigator.languages, navigator.language].map(matchFileViewerLocale).find(Boolean) ||
        'en-US'
  const messages = copy[locale]
  document.documentElement.lang = locale
  document.querySelector('.app-boot-screen')?.setAttribute('aria-label', messages[failed ? 2 : 0])
  const status = document.querySelector('.app-boot-status')
  if (status) status.textContent = messages[failed ? 3 : 1]
}
