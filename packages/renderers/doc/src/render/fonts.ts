import type { CharState, FontInfo } from '../types.js';

const EAST_ASIAN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f\uff00-\uffef]/u;
const INHERIT_FONT = /[\p{Mark}\u200c\u200d]/u;

type GenericFontFamily = 'serif' | 'sans-serif' | 'monospace' | 'cursive' | 'fantasy';

/** Preserve the authored family while providing compatible installed substitutes. */
export function fontFallbacks(
  name: string,
  info?: FontInfo
): {
  families: string[];
  generic: GenericFontFamily;
} {
  const families = [name];
  if (info?.altName && info.altName !== name) families.push(info.altName);
  const normalized = name.normalize('NFKC').toLowerCase();
  // East Asian fonts can report a fixed-pitch FFID even when their glyphs are
  // Song/Mincho. A Latin monospace substitute loses that authored appearance.
  if (/fangsong|仿宋/.test(normalized)) {
    return {
      families: [...families, 'STFangsong', 'Songti SC', 'Noto Serif CJK SC'],
      generic: 'serif'
    };
  }
  if (/simsun|nsimsun|宋体|宋體|songti/.test(normalized)) {
    return {
      families: [...families, 'Songti SC', 'Songti TC', 'Noto Serif CJK SC'],
      generic: 'serif'
    };
  }
  if (/kaiti|楷体|楷體/.test(normalized)) {
    return {
      families: [...families, 'Kaiti SC', 'STKaiti', 'Noto Serif CJK SC'],
      generic: 'serif'
    };
  }
  if (/mincho|明朝|mingliu/.test(normalized)) {
    return {
      families: [...families, 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP'],
      generic: 'serif'
    };
  }
  if (/simhei|黑体|黑體|heiti|dengxian|等线|等線|yahei/.test(normalized)) {
    return {
      families: [...families, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC'],
      generic: 'sans-serif'
    };
  }
  // MS-DOC FFID and PANOSE describe substitution when a named font is absent.
  // Prefer an explicit FFID; inspect Latin PANOSE only when FFID is unspecified.
  const family = ((info?.ffid ?? 0) >>> 4) & 7;
  const genericByFamily: Partial<Record<number, GenericFontFamily>> = {
    1: 'serif',
    2: 'sans-serif',
    3: 'monospace',
    4: 'cursive',
    5: 'fantasy'
  };
  let generic = genericByFamily[family];
  if (!generic && info?.panose?.[0] === 2) {
    const serif = info.panose[1];
    if (info.panose[3] === 9) generic = 'monospace';
    else if (serif >= 2 && serif <= 10) generic = 'serif';
    else if (serif >= 11 && serif <= 15) generic = 'sans-serif';
  }
  return { families, generic: generic ?? 'sans-serif' };
}

export function textFontRuns(
  text: string,
  style: CharState
): Array<{ text: string; fontFamily?: string }> {
  if (!text) return [];
  if (style.rtl && style.fontFamilyBi) return [{ text, fontFamily: style.fontFamilyBi }];
  const base = style.fontFamily;
  const eastAsia = style.fontFamilyEastAsia || base;
  const other = style.fontFamilyOther || base;
  if (eastAsia === base && other === base) return [{ text, fontFamily: base }];
  const runs: Array<{ text: string; fontFamily?: string }> = [];
  for (const character of text) {
    const previous = runs[runs.length - 1];
    const fontFamily =
      previous && INHERIT_FONT.test(character)
        ? previous.fontFamily
        : EAST_ASIAN.test(character)
          ? eastAsia
          : character.codePointAt(0)! < 0x80
            ? base
            : other;
    if (previous && previous.fontFamily === fontFamily) previous.text += character;
    else runs.push({ text: character, fontFamily });
  }
  return runs;
}
