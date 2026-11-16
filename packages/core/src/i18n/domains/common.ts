import type { FileViewerResolvedLocale } from '../locales'

export const FILE_VIEWER_COMMON_MESSAGE_ROWS = {
  'geo.map': {
    'zh-CN': '地图', 'en-US': 'Map', 'ja-JP': '地図', 'zh-TW': '地圖', 'zh-HK': '地圖', 'de-DE': 'Karte', 'ru-RU': 'Карта'
  },
  'geo.attribution': {
    'zh-CN': '地图来源', 'en-US': 'Map attribution', 'ja-JP': '地図の出典', 'zh-TW': '地圖來源', 'zh-HK': '地圖來源', 'de-DE': 'Kartenquellen', 'ru-RU': 'Источники карты'
  },
  'chm.topicCount': {
    'zh-CN': '主题数：{count}', 'en-US': 'Topics: {count}', 'ja-JP': 'トピック数：{count}',
    'zh-TW': '主題數：{count}', 'zh-HK': '主題數：{count}', 'de-DE': 'Themen: {count}', 'ru-RU': 'Тем: {count}'
  },
  'dicom.error.renderFailed': {
    'zh-CN': '无法渲染此 DICOM 文件。', 'en-US': 'Unable to render this DICOM file.',
    'ja-JP': 'この DICOM ファイルを描画できません。', 'zh-TW': '無法呈現此 DICOM 檔案。',
    'zh-HK': '無法呈現此 DICOM 檔案。', 'de-DE': 'Diese DICOM-Datei kann nicht dargestellt werden.',
    'ru-RU': 'Не удалось отобразить этот файл DICOM.'
  },
  'media.midi.trackFallback': {
    'zh-CN': '轨道 {index}', 'en-US': 'Track {index}', 'ja-JP': 'トラック {index}',
    'zh-TW': '音軌 {index}', 'zh-HK': '音軌 {index}', 'de-DE': 'Spur {index}', 'ru-RU': 'Дорожка {index}'
  },
  'media.midi.unknownInstrument': {
    'zh-CN': '未知乐器', 'en-US': 'Unknown instrument', 'ja-JP': '不明な楽器',
    'zh-TW': '未知樂器', 'zh-HK': '未知樂器', 'de-DE': 'Unbekanntes Instrument', 'ru-RU': 'Неизвестный инструмент'
  },
  'media.midi.install': {
    'zh-CN': '请先启用 MIDI 支持。运行 `npx file-viewer-cli add midi --write`，再运行 `npx file-viewer-cli install --yes`。',
    'en-US': 'Enable MIDI support first. Run `npx file-viewer-cli add midi --write`, then `npx file-viewer-cli install --yes`.',
    'ja-JP': 'MIDI サポートを有効にしてください。`npx file-viewer-cli add midi --write`、次に `npx file-viewer-cli install --yes` を実行します。',
    'zh-TW': '請先啟用 MIDI 支援。執行 `npx file-viewer-cli add midi --write`，再執行 `npx file-viewer-cli install --yes`。',
    'zh-HK': '請先啟用 MIDI 支援。執行 `npx file-viewer-cli add midi --write`，再執行 `npx file-viewer-cli install --yes`。',
    'de-DE': 'Aktivieren Sie zuerst MIDI. Führen Sie `npx file-viewer-cli add midi --write` und danach `npx file-viewer-cli install --yes` aus.',
    'ru-RU': 'Сначала включите поддержку MIDI. Выполните `npx file-viewer-cli add midi --write`, затем `npx file-viewer-cli install --yes`.'
  },
  'eda.ui.detail.pins': {
    'zh-CN': '引脚', 'en-US': 'Pins', 'ja-JP': 'ピン', 'zh-TW': '接腳', 'zh-HK': '引腳', 'de-DE': 'Anschlüsse', 'ru-RU': 'Выводы'
  },
  'eda.ui.detail.layers': {
    'zh-CN': '图层', 'en-US': 'Layers', 'ja-JP': 'レイヤー', 'zh-TW': '圖層', 'zh-HK': '圖層', 'de-DE': 'Ebenen', 'ru-RU': 'Слои'
  },
  'eda.ui.detail.keywords': {
    'zh-CN': '关键词', 'en-US': 'Keywords', 'ja-JP': 'キーワード', 'zh-TW': '關鍵字', 'zh-HK': '關鍵字', 'de-DE': 'Schlüsselwörter', 'ru-RU': 'Ключевые слова'
  },
  'xml.viewSource': {
    'zh-CN': '查看源码',
    'en-US': 'View source',
    'ja-JP': 'ソースを表示',
    'zh-TW': '檢視原始碼',
    'zh-HK': '檢視原始碼',
    'de-DE': 'Quelltext anzeigen',
    'ru-RU': 'Исходный код'
  },
  'xml.viewRendered': {
    'zh-CN': '查看文档',
    'en-US': 'View document',
    'ja-JP': '文書を表示',
    'zh-TW': '檢視文件',
    'zh-HK': '檢視文件',
    'de-DE': 'Dokument anzeigen',
    'ru-RU': 'Документ'
  },
  'xml.diagnostics': {
    'zh-CN': 'XML 诊断',
    'en-US': 'XML diagnostics',
    'ja-JP': 'XML 診断',
    'zh-TW': 'XML 診斷',
    'zh-HK': 'XML 診斷',
    'de-DE': 'XML-Diagnose',
    'ru-RU': 'Диагностика XML'
  },
  'drawing.plantuml.configure': {
    'en-US': 'Source preview. Set options.drawing.plantumlServerUrl for SVG rendering.',
    'zh-CN': '源码预览。配置 options.drawing.plantumlServerUrl 可渲染 SVG。',
    'ja-JP':
      'ソースのプレビュー。SVG の描画には options.drawing.plantumlServerUrl を設定してください。',
    'zh-TW': '原始碼預覽。設定 options.drawing.plantumlServerUrl 可呈現 SVG。',
    'zh-HK': '原始碼預覽。設定 options.drawing.plantumlServerUrl 可呈現 SVG。',
    'de-DE': 'Quelltextvorschau. Für SVG options.drawing.plantumlServerUrl konfigurieren.',
    'ru-RU': 'Исходный код. Для SVG задайте options.drawing.plantumlServerUrl.'
  },
  'ui.archive.ui.file.971c41': {
    'en-US': 'file',
    'zh-CN': '文件',
    'ja-JP': 'ファイル',
    'zh-TW': '檔案',
    'zh-HK': '檔案',
    'de-DE': 'Datei',
    'ru-RU': 'Файл'
  },
  'ui.chm.ui.chm.topic.8e67cb': {
    'en-US': 'CHM topic',
    'zh-CN': 'CHM 主题',
    'ja-JP': 'CHM トピック',
    'zh-TW': 'CHM 主題',
    'zh-HK': 'CHM 主題',
    'de-DE': 'CHM-Thema',
    'ru-RU': 'Тема CHM'
  },
  'ui.data.ui.x.layers.ag.psd.7900d0': {
    'en-US': '{p0} x {p1} · {p2} layers · ag-psd',
    'zh-CN': '{p0} × {p1} · 图层：{p2} · ag-psd',
    'ja-JP': '{p0} × {p1} · レイヤー数：{p2} · ag-psd',
    'zh-TW': '{p0} × {p1} · 圖層：{p2} · ag-psd',
    'zh-HK': '{p0} × {p1} · 圖層：{p2} · ag-psd',
    'de-DE': '{p0} × {p1} · Ebenen: {p2} · ag-psd',
    'ru-RU': '{p0} × {p1} · слоёв: {p2} · ag-psd'
  },
  'ui.dicom.ui.dicom.image.viewport.ee1ec0': {
    'en-US': 'DICOM image viewport',
    'zh-CN': 'DICOM 图像视口',
    'ja-JP': 'DICOM 画像ビューポート',
    'zh-TW': 'DICOM 影像檢視區',
    'zh-HK': 'DICOM 影像檢視區',
    'de-DE': 'DICOM-Bildansicht',
    'ru-RU': 'Область просмотра DICOM'
  },
  'ui.drawing.ui.plantuml.source.preview.89583d': {
    'en-US': 'PlantUML source preview',
    'zh-CN': 'PlantUML 源码预览',
    'ja-JP': 'PlantUML ソースのプレビュー',
    'zh-TW': 'PlantUML 原始碼預覽',
    'zh-HK': 'PlantUML 原始碼預覽',
    'de-DE': 'PlantUML-Quelltextvorschau',
    'ru-RU': 'Предпросмотр исходного кода PlantUML'
  },
  'ui.drawing.ui.diagram.preview.e53a74': {
    'en-US': '{p0} diagram preview',
    'zh-CN': '{p0} 图表预览',
    'ja-JP': '{p0} 図のプレビュー',
    'zh-TW': '{p0} 圖表預覽',
    'zh-HK': '{p0} 圖表預覽',
    'de-DE': '{p0}-Diagrammvorschau',
    'ru-RU': 'Предпросмотр диаграммы {p0}'
  },
  'ui.drawing.ui.excalidraw.rough.js.preview.899b17': {
    'en-US': 'Excalidraw rough.js preview',
    'zh-CN': 'Excalidraw rough.js 预览',
    'ja-JP': 'Excalidraw rough.js プレビュー',
    'zh-TW': 'Excalidraw rough.js 預覽',
    'zh-HK': 'Excalidraw rough.js 預覽',
    'de-DE': 'Excalidraw-rough.js-Vorschau',
    'ru-RU': 'Предпросмотр Excalidraw rough.js'
  },
  'ui.drawing.ui.draw.io.local.svg.preview.4eff7a': {
    'en-US': 'Draw.io local SVG preview',
    'zh-CN': 'Draw.io 本地 SVG 预览',
    'ja-JP': 'Draw.io ローカル SVG プレビュー',
    'zh-TW': 'Draw.io 本機 SVG 預覽',
    'zh-HK': 'Draw.io 本機 SVG 預覽',
    'de-DE': 'Lokale SVG-Vorschau von Draw.io',
    'ru-RU': 'Локальный предпросмотр SVG Draw.io'
  },
  'ui.drawing.ui.diagrams.net.preview.2b1dc3': {
    'en-US': 'diagrams.net preview',
    'zh-CN': 'diagrams.net 预览',
    'ja-JP': 'diagrams.net プレビュー',
    'zh-TW': 'diagrams.net 預覽',
    'zh-HK': 'diagrams.net 預覽',
    'de-DE': 'diagrams.net-Vorschau',
    'ru-RU': 'Предпросмотр diagrams.net'
  },
  'ui.mindmap.ui.xmind.canvas.drag.to.pan.pinch.cd3061': {
    'en-US':
      'XMind canvas. Drag to pan, pinch on touch screens to zoom, double click to fit, use Ctrl or Command with wheel to zoom.',
    'zh-CN':
      'XMind 画布。拖动平移，触屏双指缩放，双击适配。按住 Ctrl 或 Command 滚动鼠标滚轮缩放。',
    'ja-JP':
      'XMind キャンバス。ドラッグで移動、タッチ画面ではピンチで拡大縮小、ダブルクリックで全体表示。Ctrl または Command とホイールで拡大縮小。',
    'zh-TW':
      'XMind 畫布。拖曳以平移，觸控螢幕雙指縮放，按兩下以符合視窗。按住 Ctrl 或 Command 並捲動滑鼠滾輪以縮放。',
    'zh-HK':
      'XMind 畫布。拖曳以平移，觸控螢幕雙指縮放，按兩下以符合視窗。按住 Ctrl 或 Command 並捲動滑鼠滾輪以縮放。',
    'de-DE':
      'XMind-Zeichenfläche. Zum Verschieben ziehen, auf Touchscreens mit zwei Fingern zoomen, zum Einpassen doppelklicken. Mit Strg oder Command und Mausrad zoomen.',
    'ru-RU':
      'Холст XMind. Перетаскивайте для перемещения, сведите или разведите пальцы для изменения масштаба, дважды нажмите для подгонки. Ctrl или Command с колёсиком мыши меняет масштаб.'
  },
  'ui.presentation-ppt.ui.slide.18e030': {
    'en-US': 'Slide {p0}',
    'zh-CN': '幻灯片 {p0}',
    'ja-JP': 'スライド {p0}',
    'zh-TW': '投影片 {p0}',
    'zh-HK': '投影片 {p0}',
    'de-DE': 'Folie {p0}',
    'ru-RU': 'Слайд {p0}'
  },
  'ui.text.ui.lines.24e137': {
    'en-US': 'Lines: {p0}',
    'zh-CN': '行数：{p0}',
    'ja-JP': '行数：{p0}',
    'zh-TW': '行數：{p0}',
    'zh-HK': '行數：{p0}',
    'de-DE': 'Zeilen: {p0}',
    'ru-RU': 'Строк: {p0}'
  },
  'ui.typst.ui.typst.document.b37fc0': {
    'en-US': 'Typst document',
    'zh-CN': 'Typst 文档',
    'ja-JP': 'Typst 文書',
    'zh-TW': 'Typst 文件',
    'zh-HK': 'Typst 文件',
    'de-DE': 'Typst-Dokument',
    'ru-RU': 'Документ Typst'
  },
  'ui.typst.ui.typst.preview.pages.7e618f': {
    'en-US': 'Typst preview pages',
    'zh-CN': 'Typst 预览页面',
    'ja-JP': 'Typst プレビューページ',
    'zh-TW': 'Typst 預覽頁面',
    'zh-HK': 'Typst 預覽頁面',
    'de-DE': 'Typst-Vorschauseiten',
    'ru-RU': 'Страницы предпросмотра Typst'
  },
  'ui.typst.ui.page.2a4109': {
    'en-US': 'Page {p0}',
    'zh-CN': '第 {p0} 页',
    'ja-JP': '{p0} ページ',
    'zh-TW': '第 {p0} 頁',
    'zh-HK': '第 {p0} 頁',
    'de-DE': 'Seite {p0}',
    'ru-RU': 'Страница {p0}'
  },

  'dicom.frames': {
    'en-US': 'Frames: {count}',
    'zh-CN': '帧数：{count}',
    'ja-JP': 'フレーム数：{count}',
    'zh-TW': '影格數：{count}',
    'zh-HK': '影格數：{count}',
    'de-DE': 'Frames: {count}',
    'ru-RU': 'Кадров: {count}'
  },
  'design.fidelity.exact': {
    'en-US': 'Exact',
    'zh-CN': '精确',
    'ja-JP': '正確',
    'zh-TW': '精確',
    'zh-HK': '精確',
    'de-DE': 'Exakt',
    'ru-RU': 'Точное'
  },
  'design.fidelity.high': {
    'en-US': 'High',
    'zh-CN': '高',
    'ja-JP': '高',
    'zh-TW': '高',
    'zh-HK': '高',
    'de-DE': 'Hoch',
    'ru-RU': 'Высокое'
  },
  'design.fidelity.partial': {
    'en-US': 'Partial',
    'zh-CN': '部分支持',
    'ja-JP': '部分対応',
    'zh-TW': '部分支援',
    'zh-HK': '部分支援',
    'de-DE': 'Teilweise',
    'ru-RU': 'Частичное'
  },
  'design.fidelity.structure-only': {
    'en-US': 'Structure only',
    'zh-CN': '仅结构',
    'ja-JP': '構造のみ',
    'zh-TW': '僅結構',
    'zh-HK': '僅結構',
    'de-DE': 'Nur Struktur',
    'ru-RU': 'Только структура'
  },
  'design.fidelity.unsupported': {
    'en-US': 'Unsupported',
    'zh-CN': '不支持',
    'ja-JP': '未対応',
    'zh-TW': '不支援',
    'zh-HK': '不支援',
    'de-DE': 'Nicht unterstützt',
    'ru-RU': 'Не поддерживается'
  },
  'design.status.preview': {
    'en-US': 'Embedded preview',
    'zh-CN': '内嵌预览',
    'ja-JP': '埋め込みプレビュー',
    'zh-TW': '內嵌預覽',
    'zh-HK': '內嵌預覽',
    'de-DE': 'Eingebettete Vorschau',
    'ru-RU': 'Встроенный предпросмотр'
  },
  'design.status.metadata-only': {
    'en-US': 'XMP only',
    'zh-CN': '仅 XMP',
    'ja-JP': 'XMP のみ',
    'zh-TW': '僅 XMP',
    'zh-HK': '僅 XMP',
    'de-DE': 'Nur XMP',
    'ru-RU': 'Только XMP'
  },
  'design.status.unsupported-structure': {
    'en-US': 'Unsupported structure',
    'zh-CN': '不支持的结构',
    'ja-JP': '未対応の構造',
    'zh-TW': '不支援的結構',
    'zh-HK': '不支援的結構',
    'de-DE': 'Nicht unterstützte Struktur',
    'ru-RU': 'Неподдерживаемая структура'
  },
  'design.status.structure-only': {
    'en-US': 'Structure only',
    'zh-CN': '仅结构',
    'ja-JP': '構造のみ',
    'zh-TW': '僅結構',
    'zh-HK': '僅結構',
    'de-DE': 'Nur Struktur',
    'ru-RU': 'Только структура'
  },
  'design.layer.locked': {
    'en-US': '{label} · locked',
    'zh-CN': '{label} · 已锁定',
    'ja-JP': '{label} · ロック済み',
    'zh-TW': '{label} · 已鎖定',
    'zh-HK': '{label} · 已鎖定',
    'de-DE': '{label} · gesperrt',
    'ru-RU': '{label} · заблокирован'
  },
  'design.artboard.fallback': {
    'en-US': 'Artboard {index}',
    'zh-CN': '画板 {index}',
    'ja-JP': 'アートボード {index}',
    'zh-TW': '工作區域 {index}',
    'zh-HK': '工作區域 {index}',
    'de-DE': 'Zeichenfläche {index}',
    'ru-RU': 'Монтажная область {index}'
  },

  'presentation.diagnostic.stage': {
    'en-US': 'Stage: {value}',
    'zh-CN': '阶段：{value}',
    'ja-JP': '段階：{value}',
    'de-DE': 'Phase: {value}',
    'zh-TW': '階段：{value}',
    'zh-HK': '階段：{value}',
    'ru-RU': 'Этап: {value}'
  },
  'presentation.diagnostic.detail': {
    'en-US': 'Detail: {value}',
    'zh-CN': '详情：{value}',
    'ja-JP': '詳細：{value}',
    'de-DE': 'Details: {value}',
    'zh-TW': '詳細資料：{value}',
    'zh-HK': '詳情：{value}',
    'ru-RU': 'Подробности: {value}'
  },
  'presentation.diagnostic.hint': {
    'en-US': 'Hint: {value}',
    'zh-CN': '建议：{value}',
    'ja-JP': '対処：{value}',
    'de-DE': 'Hinweis: {value}',
    'zh-TW': '建議：{value}',
    'zh-HK': '建議：{value}',
    'ru-RU': 'Рекомендация: {value}'
  },
  'signature.state.valid': {
    'en-US': '{label}: valid',
    'zh-CN': '{label}：有效',
    'ja-JP': '{label}：有効',
    'de-DE': '{label}: gültig',
    'zh-TW': '{label}：有效',
    'zh-HK': '{label}：有效',
    'ru-RU': 'Проверка «{label}»: пройдена'
  },
  'signature.state.invalid': {
    'en-US': '{label}: invalid',
    'zh-CN': '{label}：无效',
    'ja-JP': '{label}：無効',
    'de-DE': '{label}: ungültig',
    'zh-TW': '{label}：無效',
    'zh-HK': '{label}：無效',
    'ru-RU': 'Проверка «{label}»: не пройдена'
  },
  'signature.state.pending': {
    'en-US': '{label}: {state}',
    'zh-CN': '{label}：{state}',
    'ja-JP': '{label}：{state}',
    'de-DE': '{label}: {state}',
    'zh-TW': '{label}：{state}',
    'zh-HK': '{label}：{state}',
    'ru-RU': '{label}: {state}'
  },
  'text.lrc.annotated': {
    'en-US': 'Annotated',
    'zh-CN': '时间标注',
    'ja-JP': '時間付き',
    'de-DE': 'Mit Zeitangaben',
    'zh-TW': '時間標註',
    'zh-HK': '時間標註',
    'ru-RU': 'С отметками времени'
  },
  'text.lrc.lyrics': {
    'en-US': 'Lyrics',
    'zh-CN': '歌词',
    'ja-JP': '歌詞',
    'de-DE': 'Liedtext',
    'zh-TW': '歌詞',
    'zh-HK': '歌詞',
    'ru-RU': 'Текст песни'
  },
  'text.lrc.source': {
    'en-US': 'Source',
    'zh-CN': '原文',
    'ja-JP': '原文',
    'de-DE': 'Quelltext',
    'zh-TW': '原文',
    'zh-HK': '原文',
    'ru-RU': 'Исходный текст'
  },
  'text.lrc.wrap': {
    'en-US': 'Wrap lines',
    'zh-CN': '自动换行',
    'ja-JP': '折り返し',
    'de-DE': 'Zeilenumbruch',
    'zh-TW': '自動換行',
    'zh-HK': '自動換行',
    'ru-RU': 'Перенос строк'
  },
  'text.lrc.note': {
    'en-US': 'Static lyrics preview; no audio playback.',
    'zh-CN': '静态歌词预览，不播放音频。',
    'ja-JP': '歌詞の静的プレビューです。音声は再生しません。',
    'de-DE': 'Statische Liedtextvorschau ohne Audiowiedergabe.',
    'zh-TW': '靜態歌詞預覽，不播放音訊。',
    'zh-HK': '靜態歌詞預覽，不播放音頻。',
    'ru-RU': 'Статический предпросмотр текста песни без воспроизведения аудио.'
  },
  'state.currentFile': {
    'zh-CN': '当前文件',
    'en-US': 'current file',
    'ja-JP': '現在のファイル',
    'zh-TW': '目前的檔案',
    'zh-HK': '目前的檔案',
    'de-DE': 'aktuelle Datei',
    'ru-RU': 'текущий файл'
  },
  'state.unsupported.rendererTip': {
    'zh-CN': '；如果需要极致裁剪，也可以只安装 {package}',
    'en-US': '; for a strictly minimal configuration, install only {package}',
    'ja-JP': '。最小構成が必要な場合は {package} のみをインストールすることもできます',
    'zh-TW': '；如需最小化組態，也可以只安裝 {package}',
    'zh-HK': '；如需最小化設定，也可以只安裝 {package}',
    'de-DE': '; für eine strikt minimale Konfiguration installieren Sie nur {package}',
    'ru-RU': '; для минимальной конфигурации установите только {package}'
  }
} satisfies Record<string, Record<FileViewerResolvedLocale, string>>
