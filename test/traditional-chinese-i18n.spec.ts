// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  FILE_VIEWER_BUILTIN_MESSAGES,
  FILE_VIEWER_SUPPORTED_LOCALES,
  normalizeFileViewerLocale,
  translateFileViewerMessage
} from '../packages/core/src/i18n/messages'
import { demoCopyZhTW } from '../apps/viewer-demo/src/composables/useDemoCopy.zh-tw'
import { demoCopyZhHK } from '../apps/viewer-demo/src/composables/useDemoCopy.zh-hk'
import { useDemoCopy } from '../apps/viewer-demo/src/composables/useDemoCopy'
import { demoWelcomeCopy } from '../apps/viewer-demo/src/composables/useDemoWelcome'
import { sampleGroupsZh } from '../apps/viewer-demo/src/data/demoSamples'
import { sampleGroupsZhTW } from '../apps/viewer-demo/src/data/demoSamples.zh-tw'
import { sampleGroupsZhHK } from '../apps/viewer-demo/src/data/demoSamples.zh-hk'
import { buildExportHtmlDocument } from '../packages/core/src/exportDocument'

describe('Traditional Chinese locales', () => {
  afterEach(() => vi.restoreAllMocks())

  it('resolves regional and script tags without treating explicit Hans as Traditional', () => {
    for (const [input, expected] of [
      ['zh', 'zh-CN'], ['zh-Hans', 'zh-CN'], ['zh-Hans-TW', 'zh-CN'],
      ['zh-TW', 'zh-TW'], ['zh-Hant', 'zh-TW'], ['zh_Hant_TW', 'zh-TW'],
      ['zh-HK', 'zh-HK'], ['zh-Hant-HK', 'zh-HK'], ['zh-MO', 'zh-HK']
    ] as const) expect(normalizeFileViewerLocale(input)).toBe(expected)
    expect(FILE_VIEWER_SUPPORTED_LOCALES).toContain('zh-TW')
    expect(FILE_VIEWER_SUPPORTED_LOCALES).toContain('zh-HK')
  })

  it('uses the first supported browser language and preserves the English fallback', () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'zh-Hant-HK', 'en-US'])
    expect(normalizeFileViewerLocale('auto')).toBe('zh-HK')
    expect(normalizeFileViewerLocale('fr-FR')).toBe('en-US')
  })

  it('keeps complete runtime messages and placeholders for both regions', () => {
    const base = FILE_VIEWER_BUILTIN_MESSAGES['zh-CN']
    const tokens = (value: string) => [...value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[1]).sort()
    for (const locale of ['zh-TW', 'zh-HK'] as const) {
      const catalog = FILE_VIEWER_BUILTIN_MESSAGES[locale]
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(base).sort())
      for (const key of Object.keys(base) as Array<keyof typeof base>) {
        expect(tokens(catalog[key]), `${locale} ${key}`).toEqual(tokens(base[key]))
      }
    }
    expect(translateFileViewerMessage({ locale: 'zh-TW' }, 'toolbar.print')).toBe('列印')
    expect(translateFileViewerMessage({ locale: 'zh-HK' }, 'toolbar.download')).toBe('下載')
  })

  it('uses Taiwanese row, column, source, and WebArchive terms in core messages', () => {
    const translate = (key: Parameters<typeof translateFileViewerMessage>[1], params?: Record<string, string | number>) =>
      translateFileViewerMessage({ locale: 'zh-TW' }, key, params)

    expect(translate('spreadsheet.state.cachedRows', { cached: 2, total: 10 })).toBe('已快取 2 / 10 列')
    expect(translate('spreadsheet.state.rows', { rows: 10 })).toBe('共 10 列，按視口預取平滑載入')
    expect(translate('spreadsheet.state.rowsAndColumns', { rows: 10, cols: 3 })).toBe('共 10 列，3 欄，按視口預取平滑載入')
    expect(translate('data.label.rows')).toBe('列數')
    expect(translate('data.label.columns')).toBe('欄數')
    expect(translate('data.label.sampleRows')).toBe('範例列')
    expect(translate('data.title.parquet')).toBe('Parquet 欄式資料預覽')
    expect(translate('data.note.webarchive')).toBe('安全提取可讀片段，不執行網頁指令碼')
    expect(translate('text.code.showOriginal')).toBe('檢視原始碼')
    expect(demoCopyZhTW.htmlSource).toBe('原始碼')
  })

  it('keeps demo copy and sample URLs complete while localizing displayed names', () => {
    const getCopy = useDemoCopy(ref('zh-CN')).getCopy
    for (const catalog of [demoCopyZhTW, demoCopyZhHK]) {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(getCopy('zh-CN')).sort())
      for (const [key, message] of Object.entries(getCopy('zh-CN'))) {
        const tokens = (value: string) => [...value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[1]).sort()
        expect(tokens(catalog[key as keyof typeof catalog]), key).toEqual(tokens(message))
      }
    }
    expect(demoCopyZhTW.openFile).toBe('開啟檔案')
    expect(demoCopyZhHK.openFile).toBe('打開文件')
    for (const catalog of [sampleGroupsZhTW, sampleGroupsZhHK]) {
      expect(catalog.map(group => group.items.map(item => item.url)))
        .toEqual(sampleGroupsZh.map(group => group.items.map(item => item.url)))
      expect(catalog[0].title).not.toBe(sampleGroupsZh[0].title)
    }
  })

  it('uses Taiwanese spreadsheet column and row terms in the demo', () => {
    expect(demoCopyZhTW.resizableColumns).toBe('允許拖曳欄寬')
    expect(demoCopyZhTW.resizableRows).toBe('允許拖曳列高')
    expect(demoWelcomeCopy['zh-TW'].examples.workbook.description).toBe('檢視儲存格，拖曳調整欄寬')
  })

  it('uses the source document language in standalone HTML exports', () => {
    const original = document.documentElement.lang
    try {
      document.documentElement.lang = 'zh-TW'
      const html = buildExportHtmlDocument({ contentHtml: '<p>測試</p>', title: '測試', documentRef: document })
      expect(html).toContain('<html lang="zh-TW">')
    } finally {
      document.documentElement.lang = original
    }
  })
})
