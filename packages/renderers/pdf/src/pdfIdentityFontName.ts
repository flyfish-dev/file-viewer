const MAX_PDF_IDENTITY_FONT_NAME_CHARACTERS = 1024;

const PDF_FONT_STYLE_NAMES = new Set([
  'bold',
  'regular',
  'italic',
  'oblique',
  'medium',
  'semibold',
  'demibold',
  'light',
  'black',
  'thin',
]);

const isFontNameSeparator = (character: string) =>
  character === ',' || character === '_' || character === '-' || character.trim() === '';

const hasSubsetPrefix = (value: string) => {
  if (value.length < 7 || value[6] !== '+') return false;
  for (let index = 0; index < 6; index += 1) {
    const codePoint = value.charCodeAt(index) | 0x20;
    if (codePoint < 0x61 || codePoint > 0x7a) return false;
  }
  return true;
};

const stripFontStyleSuffix = (value: string) => {
  let cursor = 0;
  while (cursor < value.length) {
    if (!isFontNameSeparator(value[cursor])) {
      cursor += 1;
      continue;
    }

    const separatorStart = cursor;
    while (cursor < value.length && isFontNameSeparator(value[cursor])) cursor += 1;
    const tokenStart = cursor;
    while (cursor < value.length && !isFontNameSeparator(value[cursor])) cursor += 1;
    const token = value.slice(tokenStart, cursor).toLowerCase();
    const style = token.endsWith('mt') ? token.slice(0, -2) : token;
    if (PDF_FONT_STYLE_NAMES.has(style)) return value.slice(0, separatorStart);
  }
  return value;
};

/** @internal Shared only with the source-level regression tests. */
export const normalizePdfIdentityFontFamily = (value: string) => {
  if (!value || value.length > MAX_PDF_IDENTITY_FONT_NAME_CHARACTERS) return '';
  const withoutSubset = hasSubsetPrefix(value) ? value.slice(7) : value;
  const withoutStyle = stripFontStyleSuffix(withoutSubset);
  const normalizedCharacters: string[] = [];
  for (const character of withoutStyle.normalize('NFKC').toLowerCase()) {
    if (!isFontNameSeparator(character)) normalizedCharacters.push(character);
  }
  return normalizedCharacters.join('');
};
