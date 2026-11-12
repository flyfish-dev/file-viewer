import type { FileViewerResolvedLocale } from '../locales'

/** Renderer-owned UI messages, keyed explicitly at their presentation sites. */
export const FILE_VIEWER_RENDERER_MESSAGE_ROWS = {
  'eda.ui.role.root': {
    'zh-CN': '根',
    'en-US': 'Root',
    'ja-JP': 'ルート',
    'de-DE': 'Wurzel',
    'ru-RU': 'Корень',
    'zh-HK': '根',
    'zh-TW': '根'
  },
  'eda.ui.role.library': {
    'zh-CN': '库',
    'en-US': 'Library',
    'ja-JP': 'ライブラリ',
    'de-DE': 'Bibliothek',
    'ru-RU': 'Библиотека',
    'zh-HK': '庫',
    'zh-TW': '庫'
  },
  'eda.ui.role.symbol': {
    'zh-CN': '元件符号',
    'en-US': 'Symbol',
    'ja-JP': 'シンボル',
    'de-DE': 'Symbol',
    'ru-RU': 'Символ',
    'zh-HK': '元件符號',
    'zh-TW': '元件符號'
  },
  'eda.ui.role.footprint': {
    'zh-CN': '封装',
    'en-US': 'Footprint',
    'ja-JP': 'フットプリント',
    'de-DE': 'Footprint',
    'ru-RU': 'Посадочное место',
    'zh-HK': '封裝',
    'zh-TW': '封裝'
  },
  'eda.ui.role.padstack': {
    'zh-CN': 'Padstack',
    'en-US': 'Padstack',
    'ja-JP': 'Padstack',
    'de-DE': 'Padstack',
    'ru-RU': 'Стек контактных площадок',
    'zh-HK': 'Padstack',
    'zh-TW': 'Padstack'
  },
  'eda.ui.role.drawing': {
    'zh-CN': '图纸',
    'en-US': 'Drawing',
    'ja-JP': '図面',
    'de-DE': 'Zeichnung',
    'ru-RU': 'Чертёж',
    'zh-HK': '圖紙',
    'zh-TW': '圖紙'
  },
  'eda.ui.role.metadata': {
    'zh-CN': '元数据',
    'en-US': 'Metadata',
    'ja-JP': 'メタデータ',
    'de-DE': 'Metadaten',
    'ru-RU': 'Метаданные',
    'zh-HK': '元數據',
    'zh-TW': '中繼資料'
  },
  'eda.ui.role.property': {
    'zh-CN': '属性',
    'en-US': 'Property',
    'ja-JP': 'プロパティ',
    'de-DE': 'Eigenschaft',
    'ru-RU': 'Свойство',
    'zh-HK': '屬性',
    'zh-TW': '屬性'
  },
  'eda.ui.role.geometry': {
    'zh-CN': '几何',
    'en-US': 'Geometry',
    'ja-JP': '幾何',
    'de-DE': 'Geometrie',
    'ru-RU': 'Геометрия',
    'zh-HK': '幾何',
    'zh-TW': '幾何'
  },
  'eda.ui.role.net': {
    'zh-CN': '网络',
    'en-US': 'Net',
    'ja-JP': 'ネット',
    'de-DE': 'Netz',
    'ru-RU': 'Цепь',
    'zh-HK': '網絡',
    'zh-TW': '網路'
  },
  'eda.ui.role.unknown': {
    'zh-CN': '未知',
    'en-US': 'Unknown',
    'ja-JP': '不明',
    'de-DE': 'Unbekannt',
    'ru-RU': 'Неизвестно',
    'zh-HK': '未知',
    'zh-TW': '未知'
  },
  'eda.ui.confidence.high': {
    'zh-CN': '高',
    'en-US': 'High',
    'ja-JP': '高',
    'de-DE': 'Hoch',
    'ru-RU': 'Высокая',
    'zh-HK': '高',
    'zh-TW': '高'
  },
  'eda.ui.confidence.medium': {
    'zh-CN': '中',
    'en-US': 'Medium',
    'ja-JP': '中',
    'de-DE': 'Mittel',
    'ru-RU': 'Средняя',
    'zh-HK': '中',
    'zh-TW': '中'
  },
  'eda.ui.confidence.low': {
    'zh-CN': '低',
    'en-US': 'Low',
    'ja-JP': '低',
    'de-DE': 'Niedrig',
    'ru-RU': 'Низкая',
    'zh-HK': '低',
    'zh-TW': '低'
  },
  'eda.ui.kind.storage': {
    'zh-CN': '目录',
    'en-US': 'Directory',
    'ja-JP': 'ディレクトリ',
    'de-DE': 'Verzeichnis',
    'ru-RU': 'Каталог',
    'zh-HK': '目錄',
    'zh-TW': '目錄'
  },
  'eda.ui.kind.text': {
    'zh-CN': '文本',
    'en-US': 'Text',
    'ja-JP': 'テキスト',
    'de-DE': 'Text',
    'ru-RU': 'Текст',
    'zh-HK': '文字',
    'zh-TW': '文字'
  },
  'eda.ui.kind.binary': {
    'zh-CN': '二进制',
    'en-US': 'Binary',
    'ja-JP': 'バイナリ',
    'de-DE': 'Binär',
    'ru-RU': 'Двоичные данные',
    'zh-HK': '二進制',
    'zh-TW': "二進位"
  },
  'eda.ui.panel.layout': {
    'zh-CN': '版图预览',
    'en-US': 'Layout preview',
    'ja-JP': 'レイアウトプレビュー',
    'de-DE': 'Layoutvorschau',
    'ru-RU': 'Предпросмотр топологии',
    'zh-HK': '版圖預覽',
    'zh-TW': '版圖預覽'
  },
  'eda.ui.empty.noGeometry.title': {
    'zh-CN': '没有可绘制几何',
    'en-US': 'No drawable geometry',
    'ja-JP': '描画可能な幾何要素がありません',
    'de-DE': 'Keine darstellbare Geometrie',
    'ru-RU': 'Нет геометрии для отрисовки',
    'zh-HK': '沒有可繪制幾何',
    'zh-TW': '沒有可繪制幾何'
  },
  'eda.ui.empty.noGeometry.description': {
    'zh-CN':
      '已读取 {layout} 头部和 structure 信息，但未发现 boundary、path、text 或 reference 元素。',
    'en-US':
      '{layout} headers and structure metadata were read, but no boundary, path, text, or reference elements were found.',
    'ja-JP':
      '{layout} のヘッダーと構造情報を読み込みましたが、boundary、path、text、reference 要素は見つかりませんでした。',
    'de-DE':
      'Header und Strukturinformationen von {layout} wurden gelesen, aber es wurden keine Boundary-, Path-, Text- oder Referenzelemente gefunden.',
    'ru-RU':
      'Заголовки и структура {layout} прочитаны, но элементы boundary, path, text и reference не найдены.',
    'zh-HK':
      '已讀取 {layout} 頭部和 structure 資訊，但未發現 boundary、path、text 或 reference 元素。',
    'zh-TW':
      '已讀取 {layout} 頭部和 structure 資訊，但未發現 boundary、path、text 或 reference 元素。'
  },
  'eda.ui.stats.textStreams': {
    'zh-CN': '文本流',
    'en-US': 'Text streams',
    'ja-JP': 'テキストストリーム',
    'de-DE': 'Textdatenströme',
    'ru-RU': 'Текстовые потоки',
    'zh-HK': '文字流',
    'zh-TW': '文字流'
  },
  'eda.ui.stats.binaryStreams': {
    'zh-CN': '二进制流',
    'en-US': 'Binary streams',
    'ja-JP': 'バイナリストリーム',
    'de-DE': 'Binärdatenströme',
    'ru-RU': 'Двоичные потоки',
    'zh-HK': '二進制流',
    'zh-TW': "二進位流"
  },
  'eda.ui.stats.storageEntries': {
    'zh-CN': '目录',
    'en-US': 'Directories',
    'ja-JP': 'ディレクトリ',
    'de-DE': 'Verzeichnisse',
    'ru-RU': 'Каталоги',
    'zh-HK': '目錄',
    'zh-TW': '目錄'
  },
  'eda.ui.stats.properties': {
    'zh-CN': '属性',
    'en-US': 'Properties',
    'ja-JP': 'プロパティ',
    'de-DE': 'Eigenschaften',
    'ru-RU': 'Свойства',
    'zh-HK': '屬性',
    'zh-TW': '屬性'
  },
  'eda.ui.stats.symbols': {
    'zh-CN': '符号',
    'en-US': 'Symbols',
    'ja-JP': 'シンボル',
    'de-DE': 'Symbole',
    'ru-RU': 'Символы',
    'zh-HK': '符號',
    'zh-TW': '符號'
  },
  'eda.ui.stats.footprints': {
    'zh-CN': '封装',
    'en-US': 'Footprints',
    'ja-JP': 'フットプリント',
    'de-DE': 'Footprints',
    'ru-RU': 'Посадочные места',
    'zh-HK': '封裝',
    'zh-TW': '封裝'
  },
  'eda.ui.stats.confidence': {
    'zh-CN': '可信度',
    'en-US': 'Confidence',
    'ja-JP': '信頼度',
    'de-DE': 'Verlässlichkeit',
    'ru-RU': 'Достоверность',
    'zh-HK': '可信度',
    'zh-TW': '可信度'
  },
  'eda.ui.group.symbol': {
    'zh-CN': '元件符号',
    'en-US': 'Component symbols',
    'ja-JP': 'コンポーネントシンボル',
    'de-DE': 'Bauteilsymbole',
    'ru-RU': 'Символы компонентов',
    'zh-HK': '元件符號',
    'zh-TW': '元件符號'
  },
  'eda.ui.group.footprint': {
    'zh-CN': '封装图形',
    'en-US': 'Footprint graphics',
    'ja-JP': 'フットプリント図形',
    'de-DE': 'Footprint-Grafiken',
    'ru-RU': 'Графика посадочных мест',
    'zh-HK': '封裝圖形',
    'zh-TW': '封裝圖形'
  },
  'eda.ui.group.drawing': {
    'zh-CN': '图纸信息',
    'en-US': 'Drawing information',
    'ja-JP': '図面情報',
    'de-DE': 'Zeichnungsinformationen',
    'ru-RU': 'Сведения о чертеже',
    'zh-HK': '圖紙資訊',
    'zh-TW': '圖紙資訊'
  },
  'eda.ui.state.loading': {
    'zh-CN': '正在解析 {type}...',
    'en-US': 'Parsing {type}...',
    'ja-JP': '{type} を解析しています...',
    'de-DE': '{type} wird verarbeitet...',
    'ru-RU': 'Обработка {type}…',
    'zh-HK': '正在解析 {type}...',
    'zh-TW': '正在解析 {type}...'
  },
  'eda.ui.state.errorTitle': {
    'zh-CN': 'EDA 预览提示',
    'en-US': 'EDA preview notice',
    'ja-JP': 'EDA プレビューのお知らせ',
    'de-DE': 'Hinweis zur EDA-Vorschau',
    'ru-RU': 'Сообщение предпросмотра EDA',
    'zh-HK': 'EDA 預覽提示',
    'zh-TW': 'EDA 預覽提示'
  },
  'eda.ui.header.format': {
    'zh-CN': '格式',
    'en-US': 'Format',
    'ja-JP': '形式',
    'de-DE': 'Format',
    'ru-RU': 'Формат',
    'zh-HK': '格式',
    'zh-TW': '格式'
  },
  'eda.ui.header.size': {
    'zh-CN': '大小',
    'en-US': 'Size',
    'ja-JP': 'サイズ',
    'de-DE': 'Größe',
    'ru-RU': 'Размер',
    'zh-HK': '大小',
    'zh-TW': '大小'
  },
  'eda.ui.header.entries': {
    'zh-CN': '条目',
    'en-US': 'Entries',
    'ja-JP': '項目',
    'de-DE': 'Einträge',
    'ru-RU': 'Элементы',
    'zh-HK': '條目',
    'zh-TW': '條目'
  },
  'eda.ui.summary.layoutReady': {
    'zh-CN':
      '{layout} 属于芯片版图工程文件。预览器已在浏览器端解析可识别几何，小图生成 SVG，大图自动切换 WebGL canvas，同时保留结构、字符串和诊断索引。',
    'en-US':
      '{layout} is an IC layout engineering file. Recognizable geometry is parsed in the browser, small drawings use SVG, large drawings switch to WebGL canvas, and structure, strings, and diagnostics remain indexed.',
    'ja-JP':
      '{layout} は IC レイアウトの工学ファイルです。認識可能な幾何要素をブラウザー内で解析し、小規模図面は SVG、大規模図面は WebGL canvas で表示します。構造、文字列、診断索引も保持します。',
    'de-DE':
      '{layout} ist eine IC-Layoutdatei. Erkannte Geometrie wird im Browser verarbeitet; kleine Zeichnungen verwenden SVG, große WebGL. Struktur, Zeichenfolgen und Diagnosen bleiben indiziert.',
    'ru-RU':
      '{layout} — инженерный файл топологии микросхемы. Геометрия обрабатывается в браузере: небольшие чертежи используют SVG, крупные — WebGL. Структура, строки и диагностика доступны в индексах.',
    'zh-HK':
      '{layout} 屬於芯片版圖工程檔案。預覽器已在瀏覽器端解析可識別幾何，小圖生成 SVG，大圖自動切換 WebGL canvas，同時保留結構、字串和診斷索引。',
    'zh-TW':
      '{layout} 屬於芯片版圖工程檔案。預覽器已在瀏覽器端解析可識別幾何，小圖生成 SVG，大圖自動切換 WebGL canvas，同時保留結構、字串和診斷索引。'
  },
  'eda.ui.summary.layoutSafe': {
    'zh-CN':
      'GDSII / OASIS 属于芯片版图工程文件。预览器优先索引结构、属性、可读字符串和二进制线索，并在纯前端安全退化。',
    'en-US':
      'GDSII / OASIS are IC layout engineering files. The viewer prioritizes structure, properties, readable strings, and binary clues, then degrades safely in the frontend.',
    'ja-JP':
      'GDSII / OASIS は IC レイアウトの工学ファイルです。構造、プロパティ、可読文字列、バイナリ構造の手掛かりを優先的に索引化し、フロントエンド内で安全にフォールバックします。',
    'de-DE':
      'GDSII / OASIS sind IC-Layoutdateien. Der Viewer priorisiert Struktur, Eigenschaften, lesbare Zeichenfolgen und binäre Hinweise und fällt im Frontend sicher zurück.',
    'ru-RU':
      'GDSII / OASIS — инженерные файлы топологии микросхем. Просмотрщик безопасно индексирует структуру, свойства, читаемые строки и двоичные признаки в браузере.',
    'zh-HK':
      'GDSII / OASIS 屬於芯片版圖工程檔案。預覽器優先索引結構、屬性、可讀字串和二進制線索，並在純前端安全退化。',
    'zh-TW':
      "GDSII / OASIS 屬於芯片版圖工程檔案。預覽器優先索引結構、屬性、可讀字串和二進位線索，並在純前端安全退化。"
  },
  'eda.ui.summary.orcadSafe': {
    'zh-CN':
      'OLB / DRA 属于 OrCAD / Allegro 生态的私有设计数据。预览器优先解析 CFB 结构、对象候选、属性和可读文本，并在纯前端安全退化。',
    'en-US':
      'OLB / DRA are private OrCAD / Allegro design assets. The viewer prioritizes CFB structure, object candidates, properties, and readable text with safe frontend degradation.',
    'ja-JP':
      'OLB / DRA は OrCAD / Allegro 系の独自設計データです。CFB 構造、オブジェクト候補、プロパティ、可読テキストを優先的に解析し、フロントエンド内で安全にフォールバックします。',
    'de-DE':
      'OLB / DRA sind private OrCAD-/Allegro-Designdaten. Der Viewer priorisiert CFB-Struktur, Objektkandidaten, Eigenschaften und lesbaren Text und fällt im Frontend sicher zurück.',
    'ru-RU':
      'OLB / DRA — закрытые форматы OrCAD / Allegro. Просмотрщик безопасно обрабатывает структуру CFB, кандидаты объектов, свойства и читаемый текст в браузере.',
    'zh-HK':
      'OLB / DRA 屬於 OrCAD / Allegro 生態的私有設計數據。預覽器優先解析 CFB 結構、物件候選、屬性和可讀文字，並在純前端安全退化。',
    'zh-TW':
      'OLB / DRA 屬於 OrCAD / Allegro 生態的私有設計資料。預覽器優先解析 CFB 結構、物件候選、屬性和可讀文字，並在純前端安全退化。'
  },
  'eda.ui.search.placeholder': {
    'zh-CN': '筛选路径、角色、属性或文本',
    'en-US': 'Filter paths, roles, properties, or text',
    'ja-JP': 'パス、役割、プロパティ、テキストを絞り込み',
    'de-DE': 'Pfade, Rollen, Eigenschaften oder Text filtern',
    'ru-RU': 'Фильтр путей, ролей, свойств или текста',
    'zh-HK': '篩選路徑、角色、屬性或文字',
    'zh-TW': '篩選路徑、角色、屬性或文字'
  },
  'eda.ui.selection.title': {
    'zh-CN': '当前条目',
    'en-US': 'Current entry',
    'ja-JP': '現在の項目',
    'de-DE': 'Aktueller Eintrag',
    'ru-RU': 'Текущий элемент',
    'zh-HK': '目前條目',
    'zh-TW': '目前條目'
  },
  'eda.ui.selection.none': {
    'zh-CN': '未选择',
    'en-US': 'Not selected',
    'ja-JP': '未選択',
    'de-DE': 'Nicht ausgewählt',
    'ru-RU': 'Не выбран',
    'zh-HK': '未選擇',
    'zh-TW': '未選擇'
  },
  'eda.ui.selection.storageTitle': {
    'zh-CN': '目录条目',
    'en-US': 'Directory entry',
    'ja-JP': 'ディレクトリ項目',
    'de-DE': 'Verzeichniseintrag',
    'ru-RU': 'Элемент каталога',
    'zh-HK': '目錄條目',
    'zh-TW': '目錄條目'
  },
  'eda.ui.selection.storageDescription': {
    'zh-CN': '该节点用于组织下级流，没有可直接展示的文本或十六进制片段。',
    'en-US':
      'This node organizes child streams and has no directly displayable text or hex fragment.',
    'ja-JP':
      'このノードは下位ストリームを整理するためのもので、直接表示できるテキストや 16 進断片はありません。',
    'de-DE':
      'Dieser Knoten organisiert untergeordnete Datenströme und enthält keinen direkt darstellbaren Text- oder Hexadezimalabschnitt.',
    'ru-RU':
      'Этот узел объединяет дочерние потоки и не содержит текста или шестнадцатеричного фрагмента для показа.',
    'zh-HK': "該節點用於組織下級流，沒有可直接展示的文字或十六進制片段。",
    'zh-TW': "該節點用於組織下級流，沒有可直接展示的文字或十六進位片段。"
  },
  'eda.ui.selection.localStrings': {
    'zh-CN': '当前条目字符串',
    'en-US': 'Current entry strings',
    'ja-JP': '現在の項目の文字列',
    'de-DE': 'Zeichenfolgen des aktuellen Eintrags',
    'ru-RU': 'Строки текущего элемента',
    'zh-HK': '目前條目字串',
    'zh-TW': '目前條目字串'
  },
  'eda.ui.panel.overview': {
    'zh-CN': '解析概览',
    'en-US': 'Parse overview',
    'ja-JP': '解析概要',
    'de-DE': 'Verarbeitungsübersicht',
    'ru-RU': 'Обзор обработки',
    'zh-HK': '解析概覽',
    'zh-TW': '解析概覽'
  },
  'eda.ui.panel.tree': {
    'zh-CN': '结构树',
    'en-US': 'Structure tree',
    'ja-JP': '構造ツリー',
    'de-DE': 'Strukturbaum',
    'ru-RU': 'Дерево структуры',
    'zh-HK': '結構樹',
    'zh-TW': '結構樹'
  },
  'eda.ui.panel.objects': {
    'zh-CN': 'EDA 对象',
    'en-US': 'EDA objects',
    'ja-JP': 'EDA オブジェクト',
    'de-DE': 'EDA-Objekte',
    'ru-RU': 'Объекты EDA',
    'zh-HK': 'EDA 物件',
    'zh-TW': 'EDA 物件'
  },
  'eda.ui.panel.strings': {
    'zh-CN': '可读字符串',
    'en-US': 'Readable strings',
    'ja-JP': '可読文字列',
    'de-DE': 'Lesbare Zeichenfolgen',
    'ru-RU': 'Читаемые строки',
    'zh-HK': '可讀字串',
    'zh-TW': '可讀字串'
  },
  'eda.ui.panel.diagnostics': {
    'zh-CN': '诊断',
    'en-US': 'Diagnostics',
    'ja-JP': '診断',
    'de-DE': 'Diagnosen',
    'ru-RU': 'Диагностика',
    'zh-HK': '診斷',
    'zh-TW': '診斷'
  },
  'eda.ui.panel.nodeCount': {
    'zh-CN': '{count} 节点',
    'en-US': '{count} nodes',
    'ja-JP': '{count} ノード',
    'de-DE': '{count} Knoten',
    'ru-RU': 'Узлов: {count}',
    'zh-HK': '{count} 節點',
    'zh-TW': '{count} 節點'
  },
  'eda.ui.panel.itemCount': {
    'zh-CN': '{count} 项',
    'en-US': '{count} items',
    'ja-JP': '{count} 件',
    'de-DE': '{count} Elemente',
    'ru-RU': 'Элементов: {count}',
    'zh-HK': '{count} 項',
    'zh-TW': '{count} 項'
  },
  'eda.ui.panel.entryCount': {
    'zh-CN': '{count} 条目',
    'en-US': '{count} entries',
    'ja-JP': '{count} 項目',
    'de-DE': '{count} Einträge',
    'ru-RU': 'Записей: {count}',
    'zh-HK': '{count} 條目',
    'zh-TW': '{count} 條目'
  },
  'eda.ui.empty.noObjects.title': {
    'zh-CN': '没有明确对象候选',
    'en-US': 'No clear object candidates',
    'ja-JP': '明確なオブジェクト候補がありません',
    'de-DE': 'Keine eindeutigen Objektkandidaten',
    'ru-RU': 'Явные кандидаты объектов не найдены',
    'zh-HK': '沒有明確物件候選',
    'zh-TW': '沒有明確物件候選'
  },
  'eda.ui.empty.noObjects.description': {
    'zh-CN': '仍可从结构树、属性和字符串索引中查看可读内容。',
    'en-US':
      'Readable content is still available from the structure tree, properties, and string index.',
    'ja-JP': '構造ツリー、プロパティ、文字列索引から可読内容を確認できます。',
    'de-DE':
      'Lesbare Inhalte sind weiterhin im Strukturbaum, in den Eigenschaften und im Zeichenfolgenindex verfügbar.',
    'ru-RU': 'Читаемое содержимое доступно в дереве структуры, свойствах и индексе строк.',
    'zh-HK': '仍可從結構樹、屬性和字串索引中查看可讀內容。',
    'zh-TW': '仍可從結構樹、屬性和字串索引中查看可讀內容。'
  },
  'eda.ui.meta.renderer': {
    'zh-CN': '渲染器',
    'en-US': 'Renderer',
    'ja-JP': 'レンダラー',
    'de-DE': 'Renderer',
    'ru-RU': 'Модуль отображения',
    'zh-HK': '呈現器',
    'zh-TW': '呈現器'
  },
  'eda.ui.meta.library': {
    'zh-CN': '库',
    'en-US': 'Library',
    'ja-JP': 'ライブラリ',
    'de-DE': 'Bibliothek',
    'ru-RU': 'Библиотека',
    'zh-HK': '庫',
    'zh-TW': '庫'
  },
  'eda.ui.meta.userUnit': {
    'zh-CN': '用户单位',
    'en-US': 'User unit',
    'ja-JP': 'ユーザー単位',
    'de-DE': 'Benutzereinheit',
    'ru-RU': 'Пользовательская единица',
    'zh-HK': '用戶單位',
    'zh-TW': '使用者單位'
  },
  'eda.ui.meta.dbUnit': {
    'zh-CN': '数据库单位',
    'en-US': 'DB unit',
    'ja-JP': 'データベース単位',
    'de-DE': 'Datenbankeinheit',
    'ru-RU': 'Единица базы данных',
    'zh-HK': '數據庫單位',
    'zh-TW': '資料庫單位'
  },
  'eda.ui.layout.summary': {
    'zh-CN': '{structures} 个结构 · {elements} 个元素',
    'en-US': '{structures} structures · {elements} elements',
    'ja-JP': '構造 {structures} 件 · 要素 {elements} 件',
    'de-DE': '{structures} Strukturen · {elements} Elemente',
    'ru-RU': 'Структур: {structures} · элементов: {elements}',
    'zh-HK': '{structures} 個結構 · {elements} 個元素',
    'zh-TW': '{structures} 個結構 · {elements} 個元素'
  },
  'eda.ui.layout.webglSummary': {
    'zh-CN': 'WebGL · {elements} 个元素',
    'en-US': 'WebGL · {elements} elements',
    'ja-JP': 'WebGL · 要素 {elements} 件',
    'de-DE': 'WebGL · {elements} Elemente',
    'ru-RU': 'WebGL · элементов: {elements}',
    'zh-HK': 'WebGL · {elements} 個元素',
    'zh-TW': 'WebGL · {elements} 個元素'
  },
  'eda.ui.layout.aria': {
    'zh-CN': '{layout} 版图预览',
    'en-US': '{layout} layout preview',
    'ja-JP': '{layout} レイアウトプレビュー',
    'de-DE': '{layout}-Layoutvorschau',
    'ru-RU': 'Предпросмотр топологии {layout}',
    'zh-HK': '{layout} 版圖預覽',
    'zh-TW': '{layout} 版圖預覽'
  },
  'eda.ui.header.cfbViewer': {
    'zh-CN': 'CFB 结构预览器',
    'en-US': 'CFB structure viewer',
    'ja-JP': 'CFB 構造ビューアー',
    'de-DE': 'CFB-Strukturansicht',
    'ru-RU': 'Просмотр структуры CFB',
    'zh-HK': 'CFB 結構預覽器',
    'zh-TW': 'CFB 結構預覽器'
  },
  'eda.ui.header.binaryViewer': {
    'zh-CN': '二进制结构预览器',
    'en-US': 'Binary structure viewer',
    'ja-JP': 'バイナリ構造ビューアー',
    'de-DE': 'Binärstrukturansicht',
    'ru-RU': 'Просмотр двоичной структуры',
    'zh-HK': '二進制結構預覽器',
    'zh-TW': "二進位結構預覽器"
  },
  'eda.parser.oasisFixture': {
    'zh-CN':
      '已识别为 OASIS 文本结构夹具，并在浏览器端解析几何预览和结构索引；真实 SEMI 二进制 OASIS 仍走安全索引与后续独立内核路线。',
    'en-US':
      'Detected an OASIS text fixture and parsed geometry preview plus structure indexes in the browser. Full SEMI binary OASIS still follows the safe index and dedicated-kernel path.',
    'ja-JP':
      'OASIS テキスト fixture を認識し、ブラウザー内で幾何プレビューと構造索引を解析しました。完全な SEMI バイナリ OASIS は安全な索引と専用カーネルの経路を使用します。',
    'de-DE':
      'Eine OASIS-Textstruktur wurde erkannt; Geometrievorschau und Strukturindex wurden im Browser verarbeitet. Vollständiges binäres SEMI OASIS verwendet weiterhin den sicheren Index- und den eigenen Kernel-Pfad.',
    'ru-RU':
      'Обнаружен текстовый образец OASIS. Геометрия и индексы структуры обработаны в браузере. Для полного двоичного SEMI OASIS используются безопасный индекс и отдельное ядро.',
    'zh-HK':
      '已識別為 OASIS 文字結構夾具，並在瀏覽器端解析幾何預覽和結構索引；真實 SEMI 二進制 OASIS 仍走安全索引與後續獨立內核路線。',
    'zh-TW':
      "已識別為 OASIS 文字結構夾具，並在瀏覽器端解析幾何預覽和結構索引；真實 SEMI 二進位 OASIS 仍走安全索引與後續獨立內核路線。"
  },
  'eda.parser.gdsLayout': {
    'zh-CN': '已识别为标准 GDSII 二进制版图记录，并在浏览器端解析几何预览和结构索引。',
    'en-US':
      'Detected standard GDSII binary layout records and parsed geometry preview plus structure indexes in the browser.',
    'ja-JP':
      '標準 GDSII バイナリレイアウトレコードを認識し、ブラウザー内で幾何プレビューと構造索引を解析しました。',
    'de-DE':
      'Standardmäßige binäre GDSII-Layoutdatensätze wurden erkannt; Geometrievorschau und Strukturindex wurden im Browser verarbeitet.',
    'ru-RU':
      'Обнаружены стандартные двоичные записи GDSII. Геометрия и индекс структуры обработаны в браузере.',
    'zh-HK': "已識別為標準 GDSII 二進制版圖記錄，並在瀏覽器端解析幾何預覽和結構索引。",
    'zh-TW': "已識別為標準 GDSII 二進位版圖記錄，並在瀏覽器端解析幾何預覽和結構索引。"
  },
  'eda.parser.cfbContainer': {
    'zh-CN': '已识别为 Microsoft Compound File / OLE2 复合文档容器，并在浏览器端解析目录与流。',
    'en-US':
      'Detected a Microsoft Compound File / OLE2 container and parsed its directory and streams in the browser.',
    'ja-JP':
      'Microsoft Compound File / OLE2 コンテナーを認識し、ブラウザー内でディレクトリとストリームを解析しました。',
    'de-DE':
      'Ein Microsoft-Compound-File-/OLE2-Container wurde erkannt; Verzeichnis und Datenströme wurden im Browser verarbeitet.',
    'ru-RU':
      'Обнаружен контейнер Microsoft Compound File / OLE2. Каталог и потоки обработаны в браузере.',
    'zh-HK': '已識別為 Microsoft Compound File / OLE2 復合文件容器，並在瀏覽器端解析目錄與流。',
    'zh-TW': '已識別為 Microsoft Compound File / OLE2 復合文件容器，並在瀏覽器端解析目錄與流。'
  },
  'eda.parser.binaryIndex': {
    'zh-CN': '未识别为 CFB 容器，已使用二进制字符串索引模式展示可读信息。',
    'en-US':
      'This file is not recognized as a CFB container, so readable information is shown through a safe binary string index.',
    'ja-JP':
      'CFB コンテナーとして認識できなかったため、安全なバイナリ文字列索引で可読情報を表示します。',
    'de-DE':
      'Die Datei wurde nicht als CFB-Container erkannt. Lesbare Informationen werden über einen sicheren Binärzeichenfolgenindex angezeigt.',
    'ru-RU':
      'Файл не распознан как CFB. Читаемые данные отображаются через безопасный индекс двоичных строк.',
    'zh-HK': '未識別為 CFB 容器，已使用二進制字串索引模式展示可讀資訊。',
    'zh-TW': "未識別為 CFB 容器，已使用二進位字串索引模式展示可讀資訊。"
  },
  'eda.parser.coverage': {
    'zh-CN': '已索引 {streams} 个条目、{strings} 个可读字符串、{entities} 个 EDA 结构候选。',
    'en-US':
      'Indexed {streams} entries, {strings} readable strings, and {entities} EDA structure candidates.',
    'ja-JP':
      '{streams} 件の項目、{strings} 件の可読文字列、{entities} 件の EDA 構造候補を索引化しました。',
    'de-DE':
      '{streams} Einträge, {strings} lesbare Zeichenfolgen und {entities} EDA-Strukturkandidaten wurden indiziert.',
    'ru-RU':
      'Проиндексировано записей: {streams}, читаемых строк: {strings}, кандидатов структур EDA: {entities}.',
    'zh-HK': '已索引 {streams} 個條目、{strings} 個可讀字串、{entities} 個 EDA 結構候選。',
    'zh-TW': '已索引 {streams} 個條目、{strings} 個可讀字串、{entities} 個 EDA 結構候選。'
  },
  'eda.parser.layout': {
    'zh-CN':
      '已解析 {layout}: {structures} 个 structure、{elements} 个几何/引用/文本元素，可在版图预览面板中拖动查看。',
    'en-US':
      'Parsed {layout}: {structures} structures and {elements} geometry/reference/text elements. Drag the layout preview panel to inspect it.',
    'ja-JP':
      '{layout} を解析しました：構造 {structures} 件、幾何・参照・テキスト要素 {elements} 件。レイアウトプレビューパネルをドラッグして確認できます。',
    'de-DE':
      '{layout} verarbeitet: {structures} Strukturen und {elements} Geometrie-, Referenz- oder Textelemente. Ziehen Sie die Layoutvorschau, um sie zu prüfen.',
    'ru-RU':
      'Обработан {layout}: структур — {structures}, элементов геометрии, ссылок и текста — {elements}. Перетаскивайте панель предпросмотра для просмотра.',
    'zh-HK':
      '已解析 {layout}: {structures} 個 structure、{elements} 個幾何/引用/文字元素，可在版圖預覽面板中拖動查看。',
    'zh-TW':
      '已解析 {layout}: {structures} 個 structure、{elements} 個幾何/引用/文字元素，可在版圖預覽面板中拖動查看。'
  },
  'eda.parser.layoutOasisName': {
    'zh-CN': 'OASIS 文本结构',
    'en-US': 'OASIS text fixture',
    'ja-JP': 'OASIS テキスト構造',
    'de-DE': 'OASIS-Textstruktur',
    'ru-RU': 'Текстовый образец OASIS',
    'zh-HK': 'OASIS 文字結構',
    'zh-TW': 'OASIS 文字結構'
  },
  'eda.parser.layoutGdsName': {
    'zh-CN': 'GDSII 版图',
    'en-US': 'GDSII layout',
    'ja-JP': 'GDSII レイアウト',
    'de-DE': 'GDSII-Layout',
    'ru-RU': 'Топология GDSII',
    'zh-HK': 'GDSII 版圖',
    'zh-TW': 'GDSII 版圖'
  },
  'eda.parser.titleOrcadSymbolLibrary': {
    'zh-CN': 'OrCAD Capture 元件符号库',
    'en-US': 'OrCAD Capture Symbol Library',
    'ja-JP': 'OrCAD Capture シンボルライブラリ',
    'de-DE': 'OrCAD-Capture-Symbolbibliothek',
    'ru-RU': 'Библиотека символов OrCAD Capture',
    'zh-HK': 'OrCAD Capture 元件符號庫',
    'zh-TW': 'OrCAD Capture 元件符號庫'
  },
  'eda.parser.titleOlbBinaryLibrary': {
    'zh-CN': 'OLB 二进制库',
    'en-US': 'OLB Binary Library',
    'ja-JP': 'OLB バイナリライブラリ',
    'de-DE': 'Binäre OLB-Bibliothek',
    'ru-RU': 'Двоичная библиотека OLB',
    'zh-HK': 'OLB 二進制庫',
    'zh-TW': "OLB 二進位庫"
  },
  'eda.parser.titleOrcadDrawingLibrary': {
    'zh-CN': 'OrCAD / Allegro 图纸库',
    'en-US': 'OrCAD / Allegro Drawing Library',
    'ja-JP': 'OrCAD / Allegro 図面ライブラリ',
    'de-DE': 'OrCAD-/Allegro-Zeichnungsbibliothek',
    'ru-RU': 'Библиотека чертежей OrCAD / Allegro',
    'zh-HK': 'OrCAD / Allegro 圖紙庫',
    'zh-TW': 'OrCAD / Allegro 圖紙庫'
  },
  'eda.parser.titleDraBinaryDrawing': {
    'zh-CN': 'DRA 二进制图纸',
    'en-US': 'DRA Binary Drawing',
    'ja-JP': 'DRA バイナリ図面',
    'de-DE': 'Binäre DRA-Zeichnung',
    'ru-RU': 'Двоичный чертёж DRA',
    'zh-HK': "DRA 二進制圖紙",
    'zh-TW': "DRA 二進點陣圖紙"
  },
  'eda.parser.titleLayoutStructure': {
    'zh-CN': '{type} 版图结构',
    'en-US': '{type} Layout Structure',
    'ja-JP': '{type} レイアウト構造',
    'de-DE': '{type}-Layoutstruktur',
    'ru-RU': 'Структура топологии {type}',
    'zh-HK': '{type} 版圖結構',
    'zh-TW': '{type} 版圖結構'
  },
  'eda.parser.noSymbol': {
    'zh-CN':
      '未发现明确的元件符号候选，文件可能使用了私有二进制编码或需要专业工具导出 ASCII/XML 后再检查。',
    'en-US':
      'No clear component-symbol candidates were found. The file may use private binary encoding or need ASCII/XML export from a professional tool.',
    'ja-JP':
      '明確なコンポーネントシンボル候補を検出できませんでした。独自バイナリエンコーディングの可能性があるため、専門ツールから ASCII/XML を書き出して確認してください。',
    'de-DE':
      'Es wurden keine eindeutigen Bauteilsymbole gefunden. Die Datei verwendet möglicherweise eine private Binärcodierung oder muss mit einem Fachwerkzeug als ASCII/XML exportiert werden.',
    'ru-RU':
      'Явные кандидаты символов компонентов не найдены. Возможно закрытое двоичное кодирование; для проверки экспортируйте ASCII/XML в специализированном инструменте.',
    'zh-HK':
      '未發現明確的元件符號候選，檔案可能使用了私有二進制編碼或需要專業工具匯出 ASCII/XML 後再檢查。',
    'zh-TW':
      "未發現明確的元件符號候選，檔案可能使用了私有二進位編碼或需要專業工具匯出 ASCII/XML 後再檢查。"
  },
  'eda.parser.noFootprint': {
    'zh-CN': '未发现明确的封装、图形或 padstack 候选，文件可能使用了私有二进制数据库编码。',
    'en-US':
      'No clear footprint, drawing, or padstack candidates were found. The file may use private binary database encoding.',
    'ja-JP':
      '明確なフットプリント、図形、Padstack 候補を検出できませんでした。独自バイナリデータベース形式の可能性があります。',
    'de-DE':
      'Es wurden keine eindeutigen Footprint-, Zeichnungs- oder Padstack-Kandidaten gefunden. Die Datei verwendet möglicherweise eine private binäre Datenbankcodierung.',
    'ru-RU':
      'Явные кандидаты посадочных мест, чертежей или стеков площадок не найдены. Возможно закрытое двоичное кодирование базы данных.',
    'zh-HK': '未發現明確的封裝、圖形或 padstack 候選，檔案可能使用了私有二進制數據庫編碼。',
    'zh-TW': "未發現明確的封裝、圖形或 padstack 候選，檔案可能使用了私有二進位資料庫編碼。"
  },
  'eda.parser.noGds': {
    'zh-CN': '未发现明确的 GDSII 版图结构候选。文件可能不是标准 GDSII 二进制或使用了专有封装。',
    'en-US':
      'No clear GDSII layout structure candidates were found. The file may not be standard GDSII binary or may use a proprietary wrapper.',
    'ja-JP':
      '明確な GDSII レイアウト構造候補を検出できませんでした。標準 GDSII バイナリではないか、独自ラッパーを使用している可能性があります。',
    'de-DE':
      'Es wurden keine eindeutigen GDSII-Layoutstrukturen gefunden. Die Datei ist möglicherweise kein standardmäßiges GDSII-Binärformat oder verwendet einen proprietären Container.',
    'ru-RU':
      'Явные кандидаты структуры GDSII не найдены. Возможно, файл не является стандартным GDSII или использует закрытую оболочку.',
    'zh-HK': '未發現明確的 GDSII 版圖結構候選。檔案可能不是標準 GDSII 二進制或使用了專有封裝。',
    'zh-TW': "未發現明確的 GDSII 版圖結構候選。檔案可能不是標準 GDSII 二進位或使用了專有封裝。"
  },
  'eda.parser.noOasis': {
    'zh-CN':
      '未发现明确的 OASIS 版图结构候选。OASIS 完整几何浏览通常需要专业版图库或独立 WASM/TS 内核，当前前端包会安全展示头部、字符串、属性和二进制结构线索。',
    'en-US':
      'No clear OASIS layout structure candidates were found. Full OASIS geometry browsing usually needs a professional layout library or dedicated WASM/TS kernel; this frontend package safely exposes headers, strings, properties, and binary clues.',
    'ja-JP':
      '明確な OASIS レイアウト構造候補を検出できませんでした。完全な OASIS 幾何プレビューには専門ライブラリまたは専用 WASM/TS カーネルが必要です。このフロントエンドパッケージはヘッダー、文字列、プロパティ、バイナリ構造の手掛かりを安全に表示します。',
    'de-DE':
      'Es wurden keine eindeutigen OASIS-Layoutstrukturen gefunden. Für die vollständige OASIS-Geometrie ist üblicherweise eine Fachbibliothek oder ein eigener WASM/TS-Kernel erforderlich; dieses Frontend zeigt Header, Zeichenfolgen, Eigenschaften und binäre Hinweise sicher an.',
    'ru-RU':
      'Явные кандидаты топологии OASIS не найдены. Для полной геометрии обычно требуется специализированная библиотека или отдельное ядро WASM/TS. Здесь безопасно показываются заголовки, строки, свойства и признаки двоичной структуры.',
    'zh-HK':
      '未發現明確的 OASIS 版圖結構候選。OASIS 完整幾何瀏覽通常需要專業版圖庫或獨立 WASM/TS 內核，目前前端包會安全展示頭部、字串、屬性和二進制結構線索。',
    'zh-TW':
      "未發現明確的 OASIS 版圖結構候選。OASIS 完整幾何瀏覽通常需要專業版圖庫或獨立 WASM/TS 內核，目前前端包會安全展示頭部、字串、屬性和二進位結構線索。"
  },
  'eda.parser.maxStreams': {
    'zh-CN': '仅展示前 {count} 个 CFB 项，完整文件仍可下载后在专业 EDA 工具中打开。',
    'en-US':
      'Only the first {count} CFB entries are shown. Download the full file and open it in a professional EDA tool for complete inspection.',
    'ja-JP':
      '安全上の理由から、先頭 {count} 件の CFB 項目だけを表示します。完全な確認にはファイルをダウンロードして専門 EDA ツールで開いてください。',
    'de-DE':
      'Nur die ersten {count} CFB-Einträge werden angezeigt. Laden Sie die vollständige Datei für die Prüfung in einem EDA-Fachwerkzeug herunter.',
    'ru-RU':
      'Показаны только первые {count} записей CFB. Для полной проверки скачайте файл и откройте его в специализированном инструменте EDA.',
    'zh-HK': '僅展示前 {count} 個 CFB 項，完整檔案仍可下載後在專業 EDA 工具中打開。',
    'zh-TW': '僅展示前 {count} 個 CFB 項，完整檔案仍可下載後在專業 EDA 工具中打開。'
  },
  'eda.parser.binaryFallback': {
    'zh-CN': '该文件不是标准 CFB 容器，已退化为安全的二进制字符串索引预览。',
    'en-US':
      'This file is not a standard CFB container, so it falls back to a safe binary string index preview.',
    'ja-JP':
      '標準 CFB コンテナーではないため、安全なバイナリ文字列索引プレビューへ切り替えました。',
    'de-DE':
      'Die Datei ist kein standardmäßiger CFB-Container. Deshalb wird eine sichere Vorschau des Binärzeichenfolgenindex angezeigt.',
    'ru-RU':
      'Файл не является стандартным контейнером CFB. Используется безопасный предпросмотр индекса двоичных строк.',
    'zh-HK': '該檔案不是標準 CFB 容器，已退化為安全的二進制字串索引預覽。',
    'zh-TW': "該檔案不是標準 CFB 容器，已退化為安全的二進位字串索引預覽。"
  },
  'dicom.fit': {
    'zh-CN': '适合视图',
    'en-US': 'Fit to view',
    'ja-JP': '画面に合わせる',
    'de-DE': 'Ansicht einpassen',
    'ru-RU': 'Вписать в окно',
    'zh-HK': '適合視圖',
    'zh-TW': '適合視圖'
  },
  'dicom.loading': {
    'zh-CN': '正在加载 DICOM ...',
    'en-US': 'Loading DICOM ...',
    'ja-JP': 'DICOM を読み込み中 ...',
    'de-DE': 'DICOM wird geladen ...',
    'ru-RU': 'Загрузка DICOM…',
    'zh-HK': '正在載入 DICOM ...',
    'zh-TW': '正在載入 DICOM ...'
  },
  'dicom.next': {
    'zh-CN': '下一帧',
    'en-US': 'Next frame',
    'ja-JP': '次のフレーム',
    'de-DE': 'Nächstes Bild',
    'ru-RU': 'Следующий кадр',
    'zh-HK': '下一幀',
    'zh-TW': '下一幀'
  },
  'dicom.previous': {
    'zh-CN': '上一帧',
    'en-US': 'Previous frame',
    'ja-JP': '前のフレーム',
    'de-DE': 'Vorheriges Bild',
    'ru-RU': 'Предыдущий кадр',
    'zh-HK': '上一幀',
    'zh-TW': '上一幀'
  },
  'dicom.rotateLeft': {
    'zh-CN': '向左旋转',
    'en-US': 'Rotate left',
    'ja-JP': '左に回転',
    'de-DE': 'Nach links drehen',
    'ru-RU': 'Повернуть влево',
    'zh-HK': '向左旋轉',
    'zh-TW': '向左旋轉'
  },
  'dicom.rotateRight': {
    'zh-CN': '向右旋转',
    'en-US': 'Rotate right',
    'ja-JP': '右に回転',
    'de-DE': 'Nach rechts drehen',
    'ru-RU': 'Повернуть вправо',
    'zh-HK': '向右旋轉',
    'zh-TW': '向右旋轉'
  },
  'dicom.windowCenter': {
    'zh-CN': '窗位',
    'en-US': 'Window center',
    'ja-JP': 'ウィンドウ中心',
    'de-DE': 'Fenstermitte',
    'ru-RU': 'Уровень окна',
    'zh-HK': '窗位',
    'zh-TW': '窗位'
  },
  'dicom.windowWidth': {
    'zh-CN': '窗宽',
    'en-US': 'Window width',
    'ja-JP': 'ウィンドウ幅',
    'de-DE': 'Fensterbreite',
    'ru-RU': 'Ширина окна',
    'zh-HK': '窗寬',
    'zh-TW': '窗寬'
  },
  'dicom.zoomIn': {
    'zh-CN': '放大',
    'en-US': 'Zoom in',
    'ja-JP': '拡大',
    'de-DE': 'Vergrößern',
    'ru-RU': 'Увеличить',
    'zh-HK': '放大',
    'zh-TW': '放大'
  },
  'dicom.zoomOut': {
    'zh-CN': '缩小',
    'en-US': 'Zoom out',
    'ja-JP': '縮小',
    'de-DE': 'Verkleinern',
    'ru-RU': 'Уменьшить',
    'zh-HK': '縮小',
    'zh-TW': '縮小'
  },
  'chm.contents': {
    'zh-CN': '目录',
    'en-US': 'Contents',
    'ja-JP': '目次',
    'de-DE': 'Inhalt',
    'ru-RU': 'Оглавление',
    'zh-HK': '目錄',
    'zh-TW': '目錄'
  },
  'chm.index': {
    'zh-CN': '索引',
    'en-US': 'Index',
    'ja-JP': '索引',
    'de-DE': 'Index',
    'ru-RU': 'Указатель',
    'zh-HK': '索引',
    'zh-TW': '索引'
  },
  'chm.search': {
    'zh-CN': '搜索',
    'en-US': 'Search',
    'ja-JP': '検索',
    'de-DE': 'Suchen',
    'ru-RU': 'Поиск',
    'zh-HK': '搜尋',
    'zh-TW': '搜尋'
  },
  'chm.searchPlaceholder': {
    'zh-CN': '搜索主题和正文',
    'en-US': 'Search topics and text',
    'ja-JP': 'トピックと本文を検索',
    'de-DE': 'Themen und Text durchsuchen',
    'ru-RU': 'Поиск по темам и тексту',
    'zh-HK': '搜尋主題和正文',
    'zh-TW': '搜尋主題和正文'
  },
  'chm.loading': {
    'zh-CN': '正在打开 CHM…',
    'en-US': 'Opening CHM…',
    'ja-JP': 'CHM を開いています…',
    'de-DE': 'CHM wird geöffnet…',
    'ru-RU': 'Открытие CHM…',
    'zh-HK': '正在打開 CHM…',
    'zh-TW': '正在打開 CHM…'
  },
  'chm.wasm': {
    'zh-CN': '正在加载本地 WASM…',
    'en-US': 'Loading local WASM…',
    'ja-JP': 'ローカル WASM を読み込んでいます…',
    'de-DE': 'Lokales WASM wird geladen…',
    'ru-RU': 'Загрузка локального WASM…',
    'zh-HK': '正在載入本機 WASM…',
    'zh-TW': '正在載入本機 WASM…'
  },
  'chm.directory': {
    'zh-CN': '正在读取 CHM 目录…',
    'en-US': 'Reading the CHM directory…',
    'ja-JP': 'CHM のディレクトリを読み込んでいます…',
    'de-DE': 'CHM-Verzeichnis wird gelesen…',
    'ru-RU': 'Чтение каталога CHM…',
    'zh-HK': '正在讀取 CHM 目錄…',
    'zh-TW': '正在讀取 CHM 目錄…'
  },
  'chm.manifest': {
    'zh-CN': '正在构建帮助目录…',
    'en-US': 'Building help navigation…',
    'ja-JP': 'ヘルプのナビゲーションを準備しています…',
    'de-DE': 'Hilfenavigation wird vorbereitet…',
    'ru-RU': 'Подготовка навигации справки…',
    'zh-HK': '正在構建幫助目錄…',
    'zh-TW': '正在構建幫助目錄…'
  },
  'chm.searching': {
    'zh-CN': '正在搜索…',
    'en-US': 'Searching…',
    'ja-JP': '検索中…',
    'de-DE': 'Suche läuft…',
    'ru-RU': 'Поиск…',
    'zh-HK': '正在搜尋…',
    'zh-TW': '正在搜尋…'
  },
  'chm.noContents': {
    'zh-CN': '没有可显示的目录。',
    'en-US': 'No table of contents is available.',
    'ja-JP': '表示できる目次がありません。',
    'de-DE': 'Kein Inhaltsverzeichnis verfügbar.',
    'ru-RU': 'Нет доступного оглавления.',
    'zh-HK': '沒有可顯示的目錄。',
    'zh-TW': '沒有可顯示的目錄。'
  },
  'chm.noIndex': {
    'zh-CN': '没有可显示的关键词索引。',
    'en-US': 'No keyword index is available.',
    'ja-JP': '利用できるキーワード索引がありません。',
    'de-DE': 'Kein Stichwortverzeichnis verfügbar.',
    'ru-RU': 'Нет доступного указателя ключевых слов.',
    'zh-HK': '沒有可顯示的關鍵詞索引。',
    'zh-TW': '沒有可顯示的關鍵詞索引。'
  },
  'chm.searchHint': {
    'zh-CN': '输入至少两个字符搜索当前 CHM。',
    'en-US': 'Enter at least two characters to search this CHM.',
    'ja-JP': 'CHM 内を検索するには 2 文字以上入力してください。',
    'de-DE': 'Mindestens zwei Zeichen eingeben, um diese CHM-Datei zu durchsuchen.',
    'ru-RU': 'Введите не менее двух символов для поиска в CHM.',
    'zh-HK': '輸入至少兩個字符搜尋目前 CHM。',
    'zh-TW': '輸入至少兩個字符搜尋目前 CHM。'
  },
  'chm.noResults': {
    'zh-CN': '没有找到匹配内容。',
    'en-US': 'No matching content was found.',
    'ja-JP': '一致する内容がありません。',
    'de-DE': 'Keine Treffer gefunden.',
    'ru-RU': 'Совпадений не найдено.',
    'zh-HK': '沒有找到匹配內容。',
    'zh-TW': '沒有找到匹配內容。'
  },
  'chm.truncated': {
    'zh-CN': '结果已按安全与性能上限截断。',
    'en-US': 'Results were truncated at the configured safety limit.',
    'ja-JP': '安全性と性能の上限により結果を制限しました。',
    'de-DE': 'Ergebnisse wurden aus Sicherheits- und Leistungsgründen begrenzt.',
    'ru-RU': 'Результаты ограничены настройками безопасности и производительности.',
    'zh-HK': '結果已按安全與性能上限截斷。',
    'zh-TW': '結果已按安全與性能上限截斷。'
  },
  'chm.error': {
    'zh-CN': 'CHM 预览失败',
    'en-US': 'CHM preview failed',
    'ja-JP': 'CHM のプレビューに失敗しました',
    'de-DE': 'CHM-Vorschau fehlgeschlagen',
    'ru-RU': 'Ошибка предпросмотра CHM',
    'zh-HK': 'CHM 預覽失敗',
    'zh-TW': 'CHM 預覽失敗'
  },
  'chm.topics': {
    'zh-CN': '个主题',
    'en-US': 'topics',
    'ja-JP': 'トピック',
    'de-DE': 'Themen',
    'ru-RU': 'тем',
    'zh-HK': '個主題',
    'zh-TW': '個主題'
  },
  'chm.ready': {
    'zh-CN': '离线安全预览',
    'en-US': 'Safe offline preview',
    'ja-JP': '安全なオフラインプレビュー',
    'de-DE': 'Sichere Offline-Vorschau',
    'ru-RU': 'Безопасный офлайн-предпросмотр',
    'zh-HK': '離線安全預覽',
    'zh-TW': '離線安全預覽'
  },
  'chm.binaryToc': {
    'zh-CN': '二进制目录',
    'en-US': 'Binary TOC',
    'ja-JP': 'バイナリ目次',
    'de-DE': 'Binäres Inhaltsverzeichnis',
    'ru-RU': 'Двоичное оглавление',
    'zh-HK': '二進制目錄',
    'zh-TW': "二進位目錄"
  },
  'chm.fullText': {
    'zh-CN': '全文索引',
    'en-US': 'Full-text index',
    'ja-JP': '全文索引',
    'de-DE': 'Volltextindex',
    'ru-RU': 'Полнотекстовый индекс',
    'zh-HK': '全文索引',
    'zh-TW': '全文索引'
  },
  'chm.menu': {
    'zh-CN': '目录',
    'en-US': 'Menu',
    'ja-JP': 'メニュー',
    'de-DE': 'Menü',
    'ru-RU': 'Меню',
    'zh-HK': '目錄',
    'zh-TW': '目錄'
  },
  'chm.opening': {
    'zh-CN': '正在打开主题…',
    'en-US': 'Opening topic…',
    'ja-JP': 'トピックを開いています…',
    'de-DE': 'Thema wird geöffnet…',
    'ru-RU': 'Открытие темы…',
    'zh-HK': '正在打開主題…',
    'zh-TW': '正在打開主題…'
  },
  'chm.unavailable': {
    'zh-CN': '没有找到可打开的主题。',
    'en-US': 'No readable topic was found.',
    'ja-JP': '表示できるトピックがありません。',
    'de-DE': 'Kein lesbares Thema gefunden.',
    'ru-RU': 'Доступные темы не найдены.',
    'zh-HK': '沒有找到可打開的主題。',
    'zh-TW': '沒有找到可打開的主題。'
  },
  'email.msg.bcc': {
    'zh-CN': '密送',
    'en-US': 'Bcc',
    'ja-JP': 'Bcc',
    'de-DE': 'Bcc',
    'ru-RU': 'Скрытая копия',
    'zh-HK': '密送',
    'zh-TW': '密送'
  },
  'email.msg.sender': {
    'zh-CN': '代发人',
    'en-US': 'Sender',
    'ja-JP': '送信者',
    'de-DE': 'Absender',
    'ru-RU': 'Отправитель',
    'zh-HK': '代發人',
    'zh-TW': '代發人'
  },
  'email.msg.close': {
    'zh-CN': '关闭附件预览',
    'en-US': 'Close attachment preview',
    'ja-JP': '添付ファイルのプレビューを閉じる',
    'de-DE': 'Anhangvorschau schließen',
    'ru-RU': 'Закрыть предпросмотр вложения',
    'zh-HK': '關閉附件預覽',
    'zh-TW': '關閉附件預覽'
  },
  'email.msg.rtfUnavailable': {
    'zh-CN': '富文本正文暂不可渲染，已尽可能显示纯文本正文。仅含 RTF 的邮件需要安装 RTF 预览能力。',
    'en-US':
      'Rich-text rendering is unavailable. The readable plain-text body is shown when available. Install the RTF capability to render RTF-only messages.',
    'ja-JP':
      'リッチテキストを表示できません。可能な場合はプレーンテキストを表示します。RTF 形式の本文には RTF プレビュー機能が必要です。',
    'de-DE':
      'Die Rich-Text-Darstellung ist nicht verfügbar. Wenn möglich, wird Klartext angezeigt. Für RTF-Nachrichten ist die RTF-Vorschaufunktion erforderlich.',
    'ru-RU':
      'Форматированный текст недоступен. По возможности показан обычный текст письма. Для писем только с RTF установите модуль предпросмотра RTF.',
    'zh-HK': '富文字正文暫不可呈現，已盡可能顯示純文字正文。僅含 RTF 的郵件需要安裝 RTF 預覽能力。',
    'zh-TW': '富文字正文暫不可呈現，已盡可能顯示純文字正文。僅含 RTF 的郵件需要安裝 RTF 預覽能力。'
  },
  'email.msg.inlineUnavailable': {
    'zh-CN': '部分内嵌图片无法显示，原始附件仍保留。',
    'en-US': 'An inline image could not be displayed. The original attachment remains available.',
    'ja-JP': '一部の埋め込み画像を表示できません。元の添付ファイルは保持されています。',
    'de-DE':
      'Ein eingebettetes Bild konnte nicht angezeigt werden. Der Originalanhang bleibt verfügbar.',
    'ru-RU': 'Не удалось отобразить встроенное изображение. Исходное вложение доступно.',
    'zh-HK': '部分內嵌圖片無法顯示，原始附件仍保留。',
    'zh-TW': '部分內嵌圖片無法顯示，原始附件仍保留。'
  },
  'email.msg.noBody': {
    'zh-CN': '此 Outlook 项目不含可读邮件正文，已展示元数据及内嵌附件。',
    'en-US':
      'This Outlook item has no readable email body. Its metadata and embedded attachments are shown.',
    'ja-JP':
      'この Outlook アイテムには表示可能なメール本文がありません。メタデータと添付ファイルを表示します。',
    'de-DE':
      'Dieses Outlook-Element enthält keinen lesbaren Nachrichtentext. Metadaten und eingebettete Anhänge werden angezeigt.',
    'ru-RU': 'В этом элементе Outlook нет читаемого текста письма. Показаны метаданные и вложения.',
    'zh-HK': '此 Outlook 項目不含可讀郵件正文，已展示元數據及內嵌附件。',
    'zh-TW': '此 Outlook 項目不含可讀郵件正文，已展示中繼資料及內嵌附件。'
  },
  'email.msg.protected': {
    'zh-CN': '此邮件包含加密或签名内容，本预览器不进行解密或签名验证。',
    'en-US':
      'This message is protected or signed. Decryption and signature verification are not performed by this viewer.',
    'ja-JP': 'このメールには保護または署名が含まれます。復号と署名検証は行いません。',
    'de-DE':
      'Diese Nachricht ist geschützt oder signiert. Entschlüsselung und Signaturprüfung werden nicht durchgeführt.',
    'ru-RU':
      'Письмо защищено или подписано. Просмотрщик не выполняет расшифровку и проверку подписи.',
    'zh-HK': '此郵件包含加密或簽名內容，本預覽器不進行解密或簽名驗證。',
    'zh-TW': '此郵件包含加密或簽名內容，本預覽器不進行解密或簽名驗證。'
  }
} satisfies Record<string, Record<FileViewerResolvedLocale, string>>
