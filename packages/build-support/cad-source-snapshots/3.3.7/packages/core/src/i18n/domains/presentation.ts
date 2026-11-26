import type { FileViewerResolvedLocale } from '../locales'

export const FILE_VIEWER_PRESENTATION_MESSAGE_ROWS = {
  'presentation.diagnostic.reason.PPTX_FILE_EMPTY': {
    'zh-CN': '文件为空或过小，无法读取。',
    'en-US': 'The file is empty or too small to read.',
    'ja-JP': 'ファイルが空であるか小さすぎるため、読み込めません。',
    'de-DE': 'Die Datei ist leer oder zu klein zum Lesen.',
    'ru-RU': 'Файл пуст или слишком мал для чтения.',
    'zh-TW': '檔案為空或過小，無法讀取。',
    'zh-HK': '檔案為空或過小，無法讀取。'
  },
  'presentation.diagnostic.reason.PPTX_FILE_TOO_LARGE': {
    'zh-CN': '文件超过浏览器安全预览体积限制。',
    'en-US': 'The file is larger than the browser-safe preview limit.',
    'ja-JP': 'ファイルがブラウザーで安全にプレビューできるサイズ上限を超えています。',
    'de-DE': 'Die Datei überschreitet die sichere Vorschaugröße des Browsers.',
    'ru-RU': 'Размер файла превышает безопасный предел предпросмотра в браузере.',
    'zh-TW': '檔案超過瀏覽器安全預覽體積限制。',
    'zh-HK': '檔案超過瀏覽器安全預覽體積限制。'
  },
  'presentation.diagnostic.reason.PPTX_INVALID_ZIP': {
    'zh-CN': '文件不是有效的 PowerPoint OpenXML 压缩包。',
    'en-US': 'The file is not a valid PowerPoint OpenXML package.',
    'ja-JP': '有効な PowerPoint OpenXML パッケージではありません。',
    'de-DE': 'Die Datei ist kein gültiges PowerPoint-OpenXML-Paket.',
    'ru-RU': 'Файл не является допустимым пакетом PowerPoint OpenXML.',
    'zh-TW': '檔案不是有效的 PowerPoint OpenXML 壓縮包。',
    'zh-HK': '檔案不是有效的 PowerPoint OpenXML 壓縮包。'
  },
  'presentation.diagnostic.reason.PPTX_MISSING_CONTENT_TYPES': {
    'zh-CN': '文件缺少 [Content_Types].xml，无法识别内部结构。',
    'en-US': 'The package is missing [Content_Types].xml, so its structure cannot be identified.',
    'ja-JP': '[Content_Types].xml がないため、内部構造を識別できません。',
    'de-DE': '[Content_Types].xml fehlt; die Paketstruktur kann nicht erkannt werden.',
    'ru-RU': 'В пакете отсутствует [Content_Types].xml. Невозможно определить структуру.',
    'zh-TW': '檔案缺少 [Content_Types].xml，無法識別內部結構。',
    'zh-HK': '檔案缺少 [Content_Types].xml，無法識別內部結構。'
  },
  'presentation.diagnostic.reason.PPTX_MISSING_PRESENTATION': {
    'zh-CN': '文件缺少 ppt/presentation.xml，无法读取幻灯片列表。',
    'en-US': 'The package is missing ppt/presentation.xml, so the slide list cannot be read.',
    'ja-JP': 'ppt/presentation.xml がないため、スライド一覧を読み込めません。',
    'de-DE': 'ppt/presentation.xml fehlt; die Folienliste kann nicht gelesen werden.',
    'ru-RU': 'В пакете отсутствует ppt/presentation.xml. Невозможно прочитать список слайдов.',
    'zh-TW': '檔案缺少 ppt/presentation.xml，無法讀取幻燈片列表。',
    'zh-HK': '檔案缺少 ppt/presentation.xml，無法讀取幻燈片列表。'
  },
  'presentation.diagnostic.reason.PPTX_NO_SLIDES': {
    'zh-CN': '文件中没有找到可预览的幻灯片。',
    'en-US': 'No previewable slides were found in the file.',
    'ja-JP': 'プレビュー可能なスライドが見つかりませんでした。',
    'de-DE': 'Es wurden keine Folien für die Vorschau gefunden.',
    'ru-RU': 'В файле нет слайдов для предпросмотра.',
    'zh-TW': '檔案中沒有找到可預覽的幻燈片。',
    'zh-HK': '檔案中沒有找到可預覽的幻燈片。'
  },
  'presentation.diagnostic.reason.PPTX_MISSING_SLIDE': {
    'zh-CN': '文件缺少某一页幻灯片内容。',
    'en-US': 'The package is missing one of the slide parts.',
    'ja-JP': 'スライド部品の一部がありません。',
    'de-DE': 'Ein Folienbestandteil fehlt im Paket.',
    'ru-RU': 'В пакете отсутствует часть одного из слайдов.',
    'zh-TW': '檔案缺少某一頁幻燈片內容。',
    'zh-HK': '檔案缺少某一頁幻燈片內容。'
  },
  'presentation.diagnostic.reason.PPTX_SLIDE_RENDER_FAILED': {
    'zh-CN': '某一页幻灯片解析失败。',
    'en-US': 'One slide failed to parse.',
    'ja-JP': 'スライドの解析に失敗しました。',
    'de-DE': 'Eine Folie konnte nicht verarbeitet werden.',
    'ru-RU': 'Не удалось обработать один из слайдов.',
    'zh-TW': '某一頁幻燈片解析失敗。',
    'zh-HK': '某一頁幻燈片解析失敗。'
  },
  'presentation.diagnostic.reason.PPTX_WORKER_FAILED': {
    'zh-CN': 'PPTX Worker 启动或运行失败。',
    'en-US': 'The PPTX Worker failed to start or run.',
    'ja-JP': 'PPTX Worker の起動または実行に失敗しました。',
    'de-DE': 'Der PPTX-Worker konnte nicht gestartet oder ausgeführt werden.',
    'ru-RU': 'Не удалось запустить или выполнить PPTX Worker.',
    'zh-TW': 'PPTX Worker 啓動或運行失敗。',
    'zh-HK': 'PPTX Worker 啓動或運行失敗。'
  },
  'presentation.diagnostic.reason.PPTX_PARSE_FAILED': {
    'zh-CN': 'PPTX 文件解析失败。',
    'en-US': 'The PPTX file could not be parsed.',
    'ja-JP':
      'PPTX ファイルを解析できませんでした。ファイルを再保存するか、入力元を確認してください。',
    'de-DE': 'Die PPTX-Datei konnte nicht verarbeitet werden.',
    'ru-RU': 'Не удалось обработать файл PPTX.',
    'zh-TW': 'PPTX 檔案解析失敗。',
    'zh-HK': 'PPTX 檔案解析失敗。'
  },
  'presentation.diagnostic.hint.PPTX_INVALID_ZIP': {
    'zh-CN':
      '请确认接口返回的是原始 .pptx 二进制文件，而不是登录页、HTML/JSON 错误响应或被截断的内容。',
    'en-US':
      'Confirm that the response is the original .pptx binary, not a login page, HTML/JSON error response, or truncated download.',
    'ja-JP':
      'レスポンスがログインページや HTML/JSON エラー、途中で切れたデータではなく、元の .pptx バイナリであることを確認してください。',
    'de-DE':
      'Prüfen Sie, ob die Antwort die ursprüngliche .pptx-Datei und keine Anmeldeseite, HTML/JSON-Fehlerantwort oder unvollständige Datei enthält.',
    'ru-RU':
      'Убедитесь, что ответ содержит исходный двоичный .pptx, а не страницу входа, ошибку HTML/JSON или неполную загрузку.',
    'zh-TW':
      '請確認接口返回的是原始 .pptx 二進制檔案，而不是登錄頁、HTML/JSON 錯誤響應或被截斷的內容。',
    'zh-HK':
      '請確認接口返回的是原始 .pptx 二進制檔案，而不是登錄頁、HTML/JSON 錯誤響應或被截斷的內容。'
  },
  'presentation.diagnostic.hint.PPTX_WORKER_FAILED': {
    'zh-CN': '请检查 presentation.workerUrl、Worker 文件路径、MIME 类型、CSP 和跨域策略。',
    'en-US':
      'Check presentation.workerUrl, the Worker file path, MIME type, CSP, and cross-origin policy.',
    'ja-JP':
      'presentation.workerUrl、Worker のパス、MIME type、CSP、cross-origin policy を確認してください。',
    'de-DE':
      'Prüfen Sie presentation.workerUrl, den Worker-Pfad, den MIME-Typ, CSP und die Cross-Origin-Richtlinie.',
    'ru-RU':
      'Проверьте presentation.workerUrl, путь к Worker, MIME-тип, CSP и политику междоменных запросов.',
    'zh-TW': '請檢查 presentation.workerUrl、Worker 檔案路徑、MIME 類型、CSP 和跨域策略。',
    'zh-HK': '請檢查 presentation.workerUrl、Worker 檔案路徑、MIME 類型、CSP 和跨域策略。'
  },
  'presentation.diagnostic.hint.PPTX_NO_SLIDES': {
    'zh-CN': '请重新保存演示文稿，或检查包内是否存在 ppt/slides/slide*.xml。',
    'en-US':
      'Re-save the presentation, or check whether ppt/slides/slide*.xml exists inside the package.',
    'ja-JP':
      'プレゼンテーションを再保存するか、パッケージに ppt/slides/slide*.xml があるか確認してください。',
    'de-DE':
      'Speichern Sie die Präsentation erneut oder prüfen Sie, ob ppt/slides/slide*.xml im Paket vorhanden ist.',
    'ru-RU': 'Сохраните презентацию повторно или проверьте наличие ppt/slides/slide*.xml в пакете.',
    'zh-TW': '請重新儲存演示文稿，或檢查包內是否存在 ppt/slides/slide*.xml。',
    'zh-HK': '請重新儲存演示文稿，或檢查包內是否存在 ppt/slides/slide*.xml。'
  }
} satisfies Record<string, Record<FileViewerResolvedLocale, string>>
