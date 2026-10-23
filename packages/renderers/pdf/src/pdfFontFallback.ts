const PDF_CJK_FONT_CSS_FILE = 'noto-sans-sc.css';
const PDF_CJK_FONT_TEMPLATE_FAMILY = 'Noto Sans SC Variable';
const PDF_CJK_TEXT_RE = /[\u2e80-\u2fff\u3000-\u303f\u3040-\u30ff\u3100-\u312f\u31a0-\u31bf\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef\u{20000}-\u{323af}]/u;
const PDF_CONTROL_TEXT_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const PDF_CJK_FONT_MAX_PROBE_CHARS = 4096;
const PDF_IDENTITY_FONT_MIN_CONTROL_CHARS = 2;

type PdfTextContentItem = {
  str?: string;
  fontName?: string;
};

type PdfTextContentStyle = {
  fontSubstitution?: string;
};

export type PdfTextContent = {
  items?: PdfTextContentItem[];
  styles?: Record<string, PdfTextContentStyle>;
};

export type PdfTextContentPage = {
  getTextContent: () => Promise<PdfTextContent>;
};

type PdfCjkFontFamilyState = {
  loadedChars: Set<string>;
  tail: Promise<void>;
  styleInjected: boolean;
};

type PdfCjkFontDocumentState = {
  families: Map<string, PdfCjkFontFamilyState>;
};

export interface PdfCjkFontFallbackManager {
  prepare: () => Promise<boolean>;
  ensureTextContent: (textContent: PdfTextContent) => Promise<boolean>;
  ensurePage: (page: PdfTextContentPage) => Promise<boolean>;
}

export interface CreatePdfCjkFontFallbackManagerOptions {
  documentRef: Document;
  fontAssetPath: string;
  onWarning?: (message: string, error?: unknown) => void;
}

const fontTemplatePromises = new Map<string, Promise<string>>();
const fontDocumentStates = new WeakMap<Document, Map<string, PdfCjkFontDocumentState>>();

const escapeCssString = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/[\r\n\f]/g, ' ');

const unescapeCssString = (value: string) => value
  .replace(/\\([\\"'])/g, '$1')
  .trim();

const normalizeFontFamilyKey = (value: string) => value
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\s_,-]+/g, '');

const PDF_CJK_LOCAL_FONT_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  microsoftyahei: ['Microsoft YaHei', 'Microsoft YaHei UI', '微软雅黑'],
  microsoftyaheiui: ['Microsoft YaHei UI', 'Microsoft YaHei', '微软雅黑'],
  simhei: ['SimHei', 'Heiti SC', '黑体', '黑体-简'],
  simsun: ['SimSun', 'NSimSun', 'Songti SC', '宋体', '宋体-简'],
  kaiti: ['KaiTi', 'STKaiti', '楷体'],
  fangsong: ['FangSong', 'STFangsong', '仿宋'],
  pingfangsc: ['PingFang SC', 'Hiragino Sans GB', 'Heiti SC'],
  notosanscjksc: ['Noto Sans CJK SC', 'Source Han Sans SC'],
  sourcehansanssc: ['Source Han Sans SC', 'Noto Sans CJK SC'],
  arialunicodems: ['Arial Unicode MS'],
};

const getLocalFontCandidates = (family: string) => {
  const candidates = [family, ...(PDF_CJK_LOCAL_FONT_CANDIDATES[normalizeFontFamilyKey(family)] || [])];
  return [...new Set(candidates.filter(Boolean))];
};

const resolveFontCssUrl = (fontAssetPath: string) => {
  const normalizedPath = fontAssetPath.endsWith('/') ? fontAssetPath : `${fontAssetPath}/`;
  return new URL(PDF_CJK_FONT_CSS_FILE, normalizedPath).href;
};

const resolveFontTemplateUrls = (css: string, cssUrl: string) => css.replace(
  /url\(\s*(['"]?)(\.\/files\/[^'"\s)]+)\1\s*\)/g,
  (_match, _quote: string, relativeUrl: string) => {
    const absoluteUrl = escapeCssString(new URL(relativeUrl, cssUrl).href);
    return `url("${absoluteUrl}")`;
  }
);

const loadFontTemplate = (
  documentRef: Document,
  cssUrl: string
) => {
  const cached = fontTemplatePromises.get(cssUrl);
  if (cached) {
    return cached;
  }
  const view = documentRef.defaultView;
  const fetcher = view?.fetch?.bind(view) || globalThis.fetch;
  const promise = fetcher(cssUrl, { credentials: 'same-origin' })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading ${cssUrl}`);
      }
      const css = await response.text();
      if (!css.includes(PDF_CJK_FONT_TEMPLATE_FAMILY) || !css.includes('./files/')) {
        throw new Error(`Invalid PDF CJK font fallback stylesheet: ${cssUrl}`);
      }
      return resolveFontTemplateUrls(css, cssUrl);
    })
    .catch(error => {
      fontTemplatePromises.delete(cssUrl);
      throw error;
    });
  fontTemplatePromises.set(cssUrl, promise);
  return promise;
};

const getDocumentState = (documentRef: Document, cssUrl: string) => {
  let states = fontDocumentStates.get(documentRef);
  if (!states) {
    states = new Map();
    fontDocumentStates.set(documentRef, states);
  }
  let state = states.get(cssUrl);
  if (!state) {
    state = { families: new Map() };
    states.set(cssUrl, state);
  }
  return state;
};

const extractSubstitutionFamily = (value: string | undefined) => {
  if (!value) {
    return '';
  }
  const match = value.match(/^\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^,]+))/);
  const family = unescapeCssString(match?.[1] || match?.[2] || match?.[3] || '');
  if (
    !family ||
    family.length > 160 ||
    /[\u0000-\u001f\u007f]/.test(family) ||
    /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(family)
  ) {
    return '';
  }
  return family;
};

const isKnownCjkFontFamily = (family: string) => {
  const key = normalizeFontFamilyKey(family);
  return Boolean(PDF_CJK_LOCAL_FONT_CANDIDATES[key]) ||
    /(?:cjk|han|song|hei|kai|fang|yahei|ming|gothic|mincho)/i.test(key) ||
    /[\u3400-\u9fff]/.test(family);
};

/**
 * Some PDF generators write TrueType glyph IDs through Identity-H but omit
 * ToUnicode. PDF.js then exposes those glyph IDs as control characters, so a
 * replacement font alone cannot recover the intended text.
 */
export const detectMalformedIdentityCjkFontFamilies = (
  textContent: PdfTextContent,
  resolveFontFamily: (fontName: string) => string = () => ''
) => {
  const styles = textContent.styles || {};
  const families = new Set<string>();
  for (const item of textContent.items || []) {
    const text = item.str || '';
    const controlChars = text.match(PDF_CONTROL_TEXT_RE)?.length || 0;
    if (controlChars < PDF_IDENTITY_FONT_MIN_CONTROL_CHARS) {
      continue;
    }
    const fontName = item.fontName || '';
    const resolvedFamily = resolveFontFamily(fontName);
    const safeResolvedFamily = resolvedFamily.length <= 160 &&
      !/[\u0000-\u001f\u007f]/.test(resolvedFamily)
      ? resolvedFamily
      : '';
    const family = extractSubstitutionFamily(styles[fontName]?.fontSubstitution) ||
      safeResolvedFamily;
    if (family && isKnownCjkFontFamily(family)) {
      families.add(family);
    }
  }
  return [...families];
};

export const collectMalformedIdentityFontNames = (textContent: PdfTextContent) => {
  const fontNames = new Set<string>();
  for (const item of textContent.items || []) {
    const controlChars = (item.str || '').match(PDF_CONTROL_TEXT_RE)?.length || 0;
    if (controlChars >= PDF_IDENTITY_FONT_MIN_CONTROL_CHARS && item.fontName) {
      fontNames.add(item.fontName);
    }
  }
  return [...fontNames];
};

const collectPageFontText = (textContent: PdfTextContent) => {
  const styles = textContent.styles || {};
  const familyChars = new Map<string, Set<string>>();
  let totalChars = 0;

  for (const item of textContent.items || []) {
    const text = item.str || '';
    if (!PDF_CJK_TEXT_RE.test(text)) {
      continue;
    }
    const family = extractSubstitutionFamily(styles[item.fontName || '']?.fontSubstitution);
    if (!family) {
      continue;
    }
    let chars = familyChars.get(family);
    if (!chars) {
      chars = new Set();
      familyChars.set(family, chars);
    }
    for (const char of text) {
      if (!/[\u0000-\u001f\u007f]/.test(char) && !chars.has(char)) {
        chars.add(char);
        totalChars += 1;
        if (totalChars >= PDF_CJK_FONT_MAX_PROBE_CHARS) {
          return familyChars;
        }
      }
    }
  }
  return familyChars;
};

const createAliasStylesheet = (template: string, family: string) => {
  const escapedFamily = escapeCssString(family);
  const localSources = getLocalFontCandidates(family)
    .map(candidate => `local("${escapeCssString(candidate)}")`)
    .join(', ');
  return template
    .replace(/font-family:\s*'Noto Sans SC Variable';/g, `font-family: "${escapedFamily}";`)
    .replace(/font-display:\s*swap;/g, 'font-display: block;')
    .replace(/src:\s*url\(/g, `src: ${localSources}, url(`);
};

const ensureAliasStyle = (
  documentRef: Document,
  state: PdfCjkFontFamilyState,
  template: string,
  family: string
) => {
  if (state.styleInjected) {
    return;
  }
  const style = documentRef.createElement('style');
  style.dataset.fileViewerPdfCjkFallbackFamily = family;
  style.textContent = createAliasStylesheet(template, family);
  (documentRef.head || documentRef.documentElement).append(style);
  state.styleInjected = true;
};

const loadFamilyText = async (
  documentRef: Document,
  documentState: PdfCjkFontDocumentState,
  template: string,
  family: string,
  chars: Set<string>
) => {
  let state = documentState.families.get(family);
  if (!state) {
    state = {
      loadedChars: new Set(),
      tail: Promise.resolve(),
      styleInjected: false,
    };
    documentState.families.set(family, state);
  }
  ensureAliasStyle(documentRef, state, template, family);

  const needsFont = [...chars].some(char => !state.loadedChars.has(char));
  if (!needsFont) {
    return false;
  }
  const escapedFamily = escapeCssString(family);
  const fontSet = documentRef.fonts;
  if (!fontSet?.load) {
    return true;
  }

  const operation = state.tail.then(async () => {
    // Another viewer may be loading these shards. Readiness is shared, not just
    // scheduling: never let a concurrent canvas render before that load settles.
    const pendingChars = [...chars].filter(char => !state.loadedChars.has(char));
    if (!pendingChars.length) return;
    const probeText = pendingChars.join('');
    const loadedFaces = await Promise.all([
      fontSet.load(`normal 400 16px "${escapedFamily}"`, probeText),
      fontSet.load(`normal 700 16px "${escapedFamily}"`, probeText),
    ]);
    if (!loadedFaces.some(faces => faces.length > 0)) {
      throw new Error(`No matching CJK fallback font face loaded for ${family}`);
    }
    pendingChars.forEach(char => state.loadedChars.add(char));
  });
  state.tail = operation.catch(() => {});
  await operation;
  return true;
};

export const createPdfCjkFontFallbackManager = ({
  documentRef,
  fontAssetPath,
  onWarning,
}: CreatePdfCjkFontFallbackManagerOptions): PdfCjkFontFallbackManager => {
  const cssUrl = resolveFontCssUrl(fontAssetPath);
  const documentState = getDocumentState(documentRef, cssUrl);
  let templatePromise: Promise<string> | null = null;
  let warningReported = false;

  const warnOnce = (message: string, error?: unknown) => {
    if (warningReported) {
      return;
    }
    warningReported = true;
    onWarning?.(message, error);
  };

  const getTemplate = () => {
    templatePromise ||= loadFontTemplate(documentRef, cssUrl).catch(error => {
      templatePromise = null;
      throw error;
    });
    return templatePromise;
  };

  const ensureTextContent = async (textContent: PdfTextContent) => {
    try {
      const familyChars = collectPageFontText(textContent);
      if (!familyChars.size) {
        return false;
      }
      const template = await getTemplate();
      const results = await Promise.all(
        [...familyChars].map(([family, chars]) => (
          loadFamilyText(documentRef, documentState, template, family, chars)
        ))
      );
      return results.some(Boolean);
    } catch (error) {
      warnOnce('Unable to load an offline fallback for an unembedded PDF CJK font.', error);
      return false;
    }
  };

  return {
    async prepare() {
      try {
        await getTemplate();
        return true;
      } catch (error) {
        warnOnce(`Unable to load the offline PDF CJK font fallback from ${cssUrl}.`, error);
        return false;
      }
    },
    ensureTextContent,
    async ensurePage(page) {
      return ensureTextContent(await page.getTextContent());
    },
  };
};
