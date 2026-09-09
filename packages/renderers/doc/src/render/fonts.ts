import type { CharState } from '../types.js';

const EAST_ASIAN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f\uff00-\uffef]/u;
const INHERIT_FONT = /[\p{Mark}\u200c\u200d]/u;

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
