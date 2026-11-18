import type { FileViewerMessageKey } from '../contracts/types'
import type { FileViewerResolvedLocale } from './locales'

type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'
type Forms = Partial<Record<PluralCategory, string>> & { other: string }
export const FILE_VIEWER_DEFAULT_PLURAL_MESSAGES: Partial<
  Record<FileViewerResolvedLocale, Partial<Record<FileViewerMessageKey, Forms>>>
> = {
  'en-US': {
    'eda.ui.panel.nodeCount': { one: '{count} node', other: '{count} nodes' },
    'eda.ui.panel.itemCount': { one: '{count} item', other: '{count} items' },
    'eda.ui.panel.entryCount': { one: '{count} entry', other: '{count} entries' },
    'eda.parser.maxStreams': {
      one: 'Only the first {count} CFB entry is shown. Download the full file and open it in a professional EDA tool for complete inspection.',
      other: 'Only the first {count} CFB entries are shown. Download the full file and open it in a professional EDA tool for complete inspection.'
    },
    'email.mbox.summary': {
      one: 'Detected {count} message in the MBOX archive. Showing message 1.',
      other: 'Detected {count} messages in the MBOX archive. Showing message 1.'
    },
    'typst.pageSummary.ready': { one: '{count} page / {width} × {height} pt', other: '{count} pages / {width} × {height} pt' },
    'pdf.nav.pageCount': { one: '{count} page', other: '{count} pages' },
    'pdf.nav.itemCount': { one: '{count} item', other: '{count} items' },
    'ebook.itemCount': { one: '{count} item', other: '{count} items' },
    'cad.layers.count': { one: '{count} item', other: '{count} items' },
    'cad.layers.merged': {
      one: '{name} ({count} merged layer)',
      other: '{name} ({count} merged layers)'
    },
    'model.summary.meshes': { one: '{count} mesh', other: '{count} meshes' },
    'model.summary.points': { one: '{count} point cloud', other: '{count} point clouds' }
  },
  'de-DE': {
    'eda.ui.panel.nodeCount': { one: '{count} Knoten', other: '{count} Knoten' },
    'eda.ui.panel.itemCount': { one: '{count} Element', other: '{count} Elemente' },
    'eda.ui.panel.entryCount': { one: '{count} Eintrag', other: '{count} Einträge' },
    'eda.parser.maxStreams': {
      one: 'Nur der erste {count} CFB-Eintrag wird angezeigt. Laden Sie die vollständige Datei für die Prüfung in einem EDA-Fachwerkzeug herunter.',
      other: 'Nur die ersten {count} CFB-Einträge werden angezeigt. Laden Sie die vollständige Datei für die Prüfung in einem EDA-Fachwerkzeug herunter.'
    },
    'email.mbox.summary': {
      one: 'Im MBOX-Archiv wurde {count} Nachricht erkannt. Nachricht 1 wird angezeigt.',
      other: 'Im MBOX-Archiv wurden {count} Nachrichten erkannt. Nachricht 1 wird angezeigt.'
    },
    'typst.pageSummary.ready': { one: '{count} Seite / {width} × {height} pt', other: '{count} Seiten / {width} × {height} pt' },
    'pdf.nav.pageCount': { one: '{count} Seite', other: '{count} Seiten' },
    'pdf.nav.itemCount': { one: '{count} Eintrag', other: '{count} Einträge' },
    'ebook.itemCount': { one: '{count} Eintrag', other: '{count} Einträge' },
    'cad.layers.count': { one: '{count} Eintrag', other: '{count} Einträge' },
    'cad.layers.merged': {
      one: '{name} ({count} zusammengeführte Ebene)',
      other: '{name} ({count} zusammengeführte Ebenen)'
    },
    'model.summary.meshes': { one: '{count} Netz', other: '{count} Netze' },
    'model.summary.points': { one: '{count} Punktwolke', other: '{count} Punktwolken' }
  },
  'ru-RU': {
    'pdf.nav.pageCount': {
      one: '{count} страница',
      few: '{count} страницы',
      many: '{count} страниц',
      other: '{count} страницы'
    },
    'pdf.nav.itemCount': {
      one: '{count} элемент',
      few: '{count} элемента',
      many: '{count} элементов',
      other: '{count} элемента'
    },
    'ebook.itemCount': {
      one: '{count} элемент',
      few: '{count} элемента',
      many: '{count} элементов',
      other: '{count} элемента'
    },
    'cad.layers.count': {
      one: '{count} слой',
      few: '{count} слоя',
      many: '{count} слоёв',
      other: '{count} слоя'
    },
    'cad.layers.merged': {
      one: '{name} (объединён {count} слой)',
      few: '{name} (объединено {count} слоя)',
      many: '{name} (объединено {count} слоёв)',
      other: '{name} (объединено {count} слоя)'
    },
    'model.summary.meshes': {
      one: '{count} сетка',
      few: '{count} сетки',
      many: '{count} сеток',
      other: '{count} сетки'
    },
    'model.summary.points': {
      one: '{count} облако точек',
      few: '{count} облака точек',
      many: '{count} облаков точек',
      other: '{count} облака точек'
    }
  }
}
