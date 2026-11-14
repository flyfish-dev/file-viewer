// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import renderLrc from '../packages/renderers/text/src/lrc'

describe('LRC locale coverage', () => {
  afterEach(() => document.body.replaceChildren())

  it.each([
    ['zh-CN', '时间标注', '静态歌词预览，不播放音频。'],
    ['zh-TW', '時間標註', '靜態歌詞預覽，不播放音訊。'],
    ['zh-Hant', '時間標註', '靜態歌詞預覽，不播放音訊。'],
    ['zh_Hant_TW', '時間標註', '靜態歌詞預覽，不播放音訊。'],
    ['zh-HK', '時間標註', '靜態歌詞預覽，不播放音頻。'],
    ['zh-Hant-HK', '時間標註', '靜態歌詞預覽，不播放音頻。'],
    ['zh-MO', '時間標註', '靜態歌詞預覽，不播放音頻。'],
    ['zh-Hans-TW', '时间标注', '静态歌词预览，不播放音频。'],
    ['en-US', 'Annotated', 'Static lyrics preview; no audio playback.'],
    ['ja-JP', '時間付き', '歌詞の静的プレビューです。音声は再生しません。'],
    ['de-DE', 'Mit Zeitangaben', 'Statische Liedtextvorschau ohne Audiowiedergabe.'],
    ['fr-FR', 'Annotated', 'Static lyrics preview; no audio playback.']
  ])('renders controls and preserves source for %s', async (locale, label, note) => {
    const source = '[ti:Locale test]\n[00:01.00]繁體歌詞驗證\n[00:02.00]Second line\n'
    const target = document.createElement('div')
    document.body.append(target)
    const rendered = await renderLrc(new TextEncoder().encode(source).buffer, target, 'lrc', { options: { locale } })
    try {
      expect(target.querySelector('[data-lrc-mode="0"]')?.textContent).toBe(label)
      expect(target.querySelector('.lrc-note')?.textContent).toBe(note)
      expect(target.querySelector('.lrc-content')?.textContent).toContain('繁體歌詞驗證')
      expect(target.querySelectorAll('.lrc-toolbar button')).toHaveLength(4)
      target.querySelector<HTMLButtonElement>('[data-lrc-mode="2"]')!.click()
      expect(target.querySelector('.lrc-source')?.textContent).toBe(source)
      target.querySelector<HTMLButtonElement>('[data-lrc-wrap]')!.click()
      expect(target.querySelector('.fv-lrc')?.getAttribute('data-wrap')).toBe('false')
    } finally {
      await rendered.unmount?.()
    }
    expect(target.children).toHaveLength(0)
  })
})
