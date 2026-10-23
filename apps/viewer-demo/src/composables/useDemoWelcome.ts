import type { DemoLocale } from '@/composables/useDemoCopy'

/**
 * First-visit welcome state. Browsers and automation follow the same rules.
 * Deep links and embeds are handled by the page controller.
 */
export const DEMO_WELCOME_STORAGE_KEY = 'file-viewer-demo:welcome-dismissed'

export function shouldShowDemoWelcome(search = typeof window === 'undefined' ? '' : window.location.search) {
  if (typeof window === 'undefined') return false
  const forced = new URLSearchParams(search).get('welcome')
  if (forced === '1') return true
  if (forced === '0') return false
  try {
    return window.localStorage.getItem(DEMO_WELCOME_STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

export function dismissDemoWelcome() {
  try {
    window.localStorage.setItem(DEMO_WELCOME_STORAGE_KEY, '1')
  } catch {
    // Private mode / disabled storage: the card simply returns next visit.
  }
}

export type DemoWelcomeExampleKind = 'drawing' | 'document' | 'presentation' | 'workbook' | 'model'

export interface DemoWelcomeCopy {
  eyebrow: string
  title: string
  description: string
  drop: string
  privacy: string
  featured: string
  close: string
  previewUnavailable: string
  modelCredit: string
  examples: Record<DemoWelcomeExampleKind, { title: string; description: string }>
}

export const demoWelcomeCopy: Record<DemoLocale, DemoWelcomeCopy> = {
  'zh-CN': {
    eyebrow: '快速上手',
    title: '从一份真实文件开始',
    description: '点击示例，体验对应文件的查看方式；也可以直接拖入自己的文件。',
    drop: '将自己的文件拖到这里打开',
    privacy: '本地文件不会上传到任何服务器。',
    featured: '试试这些示例',
    close: '关闭欢迎卡片',
    previewUnavailable: '预览图暂不可用，仍可打开文件',
    modelCredit: '3D 模型署名与许可',
    examples: {
      drawing: { title: '查看图纸细节', description: '缩放图纸，拖动查看不同区域' },
      document: { title: '阅读业务报告', description: '查看目录、图表与分页内容' },
      presentation: { title: '翻阅演示文稿', description: '逐页查看幻灯片与图文内容' },
      workbook: { title: '浏览表格数据', description: '查看单元格，拖动调整列宽' },
      model: { title: '探索低模狐狸', description: '拖动旋转，从不同角度观察狐狸' }
    }
  },
  'en-US': {
    eyebrow: 'Quick start',
    title: 'Start with a real file',
    description: 'Open a sample to try its viewing tools, or drag your own file here.',
    drop: 'Drop your own file here to open it',
    privacy: 'Local files are never uploaded.',
    featured: 'Try a sample',
    close: 'Close welcome card',
    previewUnavailable: 'Preview unavailable. You can still open this file.',
    modelCredit: '3D model credits & license',
    examples: {
      drawing: { title: 'Explore a drawing', description: 'Zoom into details and pan across the drawing.' },
      document: { title: 'Read a business report', description: 'Follow the contents, tables and charts. All business data is fictional.' },
      presentation: { title: 'Read a presentation', description: 'Browse the slides, images and text.' },
      workbook: { title: 'Explore a workbook', description: 'Read cells and drag to resize columns.' },
      model: { title: 'Explore a low-poly fox', description: 'Drag to see the fox from different angles.' }
    }
  },
  'ja-JP': {
    eyebrow: '使い方を試す',
    title: '実際のファイルで試しましょう',
    description: 'サンプルで表示や操作を試すか、自分のファイルをここにドロップしてください。',
    drop: '自分のファイルをドロップして開く',
    privacy: 'ローカルファイルはアップロードされません。',
    featured: 'サンプルを試す',
    close: 'ウェルカムカードを閉じる',
    previewUnavailable: 'プレビュー画像は表示できませんが、ファイルは開けます。',
    modelCredit: '3D モデルの作者・ライセンス',
    examples: {
      drawing: { title: '図面の詳細を見る', description: '拡大やドラッグで図面の各部を確認。' },
      document: { title: '業務レポートを読む', description: '目次、表、図を確認。企業とデータは架空です。' },
      presentation: { title: 'スライドを読む', description: 'ページをめくり、画像や文章を確認。' },
      workbook: { title: '表のデータを見る', description: 'セルを確認し、ドラッグで列幅を調整。' },
      model: { title: 'ローポリのキツネを見る', description: 'ドラッグしてさまざまな角度から観察。' }
    }
  },
  'de-DE': {
    eyebrow: 'Erste Schritte',
    title: 'Mit einer echten Datei starten',
    description: 'Ein Beispiel und seine Werkzeuge ausprobieren oder eine eigene Datei hierher ziehen.',
    drop: 'Eigene Datei zum Öffnen hier ablegen',
    privacy: 'Lokale Dateien werden nie hochgeladen.',
    featured: 'Beispiel ausprobieren',
    close: 'Willkommenskarte schließen',
    previewUnavailable: 'Vorschaubild nicht verfügbar. Die Datei lässt sich trotzdem öffnen.',
    modelCredit: '3D-Modell: Urheber & Lizenz',
    examples: {
      drawing: { title: 'Zeichnung erkunden', description: 'Details vergrößern und die Ansicht verschieben.' },
      document: { title: 'Geschäftsbericht lesen', description: 'Inhaltsverzeichnis, Tabellen und Diagramme. Alle Geschäftsdaten sind fiktiv.' },
      presentation: { title: 'Präsentation lesen', description: 'Folien, Bilder und Texte durchblättern.' },
      workbook: { title: 'Tabelle erkunden', description: 'Zellen lesen und Spaltenbreiten anpassen.' },
      model: { title: 'Low-Poly-Fuchs erkunden', description: 'Den Fuchs drehen und von allen Seiten ansehen.' }
    }
  }
}
