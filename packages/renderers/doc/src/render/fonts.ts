import type { CharState } from '../types.js';

const EAST_ASIAN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f\uff00-\uffef]/u;
const INHERIT_FONT = /[\p{Mark}\u200c\u200d]/u;

// Keep the authored face first. These aliases preserve its typeface class when
// a Windows CJK font is absent on the host; they never download a font.
export function msDocFontFallbacks(family: string): readonly string[] {
  switch (family.toLowerCase().replace(/[ _-]/g, '')) {
    case '宋体': case '新宋体': case 'simsun': case 'nsimsun':
      return ['SimSun', 'Songti SC', 'Noto Serif CJK SC', 'serif'];
    case '仿宋': case '仿宋gb2312': case 'fangsong': case 'fangsonggb2312':
      return ['FangSong', 'STFangsong', 'Songti SC', 'Noto Serif CJK SC', 'serif'];
    case '楷体': case '楷体gb2312': case 'kaiti': case 'kaitigb2312':
      return ['KaiTi', 'STKaiti', 'Kaiti SC', 'Songti SC', 'serif'];
    case '黑体': case 'simhei':
      return ['SimHei', 'Heiti SC', 'Noto Sans CJK SC', 'sans-serif'];
    case '微软雅黑': case 'microsoftyahei':
      return ['Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'sans-serif'];
    default:
      return ['sans-serif'];
  }
}

export function textFontRuns(text: string, style: CharState): Array<{ text: string; fontFamily?: string }> {
  if (!text) return [];
  if (style.rtl && style.fontFamilyBi) return [{ text, fontFamily: style.fontFamilyBi }];
  const base = style.fontFamily;
  const eastAsia = style.fontFamilyEastAsia || base;
  const other = style.fontFamilyOther || base;
  if (eastAsia === base && other === base) return [{ text, fontFamily: base }];
  const runs: Array<{ text: string; fontFamily?: string }> = [];
  for (const character of text) {
    const previous = runs[runs.length - 1];
    const fontFamily = previous && INHERIT_FONT.test(character) ? previous.fontFamily
      : EAST_ASIAN.test(character) ? eastAsia
        : character.codePointAt(0)! < 0x80 ? base : other;
    if (previous && previous.fontFamily === fontFamily) previous.text += character;
    else runs.push({ text: character, fontFamily });
  }
  return runs;
}
