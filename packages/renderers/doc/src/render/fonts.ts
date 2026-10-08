import type { CharState, FontInfo } from '../types.js';

const EAST_ASIAN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f\uff00-\uffef]/u;
const INHERIT_FONT = /[\p{Mark}\u200c\u200d]/u;

// Keep the authored face first. These aliases preserve its typeface class when
// a Windows CJK font is absent on the host; they never download a font.
function cjkFontFallbacks(family: string): readonly string[] | undefined {
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
  }
  const normalized = family.normalize('NFKC').toLowerCase();
  if (/fangsong|仿宋/.test(normalized)) return ['STFangsong', 'Songti SC', 'Noto Serif CJK SC', 'serif'];
  if (/simsun|nsimsun|宋体|宋體|songti/.test(normalized)) return ['Songti SC', 'Songti TC', 'Noto Serif CJK SC', 'serif'];
  if (/kaiti|楷体|楷體/.test(normalized)) return ['Kaiti SC', 'STKaiti', 'Noto Serif CJK SC', 'serif'];
  if (/mingliu|細明體|新細明體/.test(normalized)) return ['Songti TC', 'Noto Serif CJK TC', 'serif'];
  if (/mincho|明朝/.test(normalized)) return ['Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', 'serif'];
  if (/simhei|黑体|黑體|heiti|dengxian|等线|等線|yahei/.test(normalized)) return ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'];
  return undefined;
}

export function msDocFontFallbacks(family: string, info?: FontInfo): readonly string[] {
  const alternate = info?.altName && info.altName !== family ? [info.altName] : [];
  // CJK faces may report fixed pitch while retaining a Song/Mincho design.
  // Preserve the existing authored aliases before consulting Latin metadata.
  const cjk = cjkFontFallbacks(family);
  if (cjk) return [...alternate, ...cjk];
  const genericByFamily: Record<number, string> = {
    1: 'serif', 2: 'sans-serif', 3: 'monospace', 4: 'cursive', 5: 'fantasy',
  };
  const familyClass = ((info?.ffid ?? 0) >>> 4) & 7;
  let generic = genericByFamily[familyClass];
  if (!generic && info?.panose?.[0] === 2) {
    const serif = info.panose[1];
    if (info.panose[3] === 9) generic = 'monospace';
    else if (serif >= 2 && serif <= 10) generic = 'serif';
    else if (serif >= 11 && serif <= 15) generic = 'sans-serif';
  }
  return [...alternate, generic ?? 'sans-serif'];
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
