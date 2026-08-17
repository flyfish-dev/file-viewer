export interface Fb2Image {
  id: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface Fb2Chapter {
  id: string;
  title: string;
  paragraphs: string[];
  imageIds: string[];
  children: Fb2Chapter[];
  footnote: boolean;
}

export interface Fb2Book {
  title: string;
  authors: string[];
  language?: string;
  genres: string[];
  annotation?: string;
  coverImageId?: string;
  chapters: Fb2Chapter[];
  footnotes: Fb2Chapter[];
  images: Map<string, Fb2Image>;
}

type XmlParserFactory = () => Pick<DOMParser, 'parseFromString'>;

const localName = (node: Node) => ((node as Node & { localName?: string }).localName || node.nodeName).split(':').pop()!.toLowerCase();

const childElements = (node: Node, name?: string) => Array.from(node.childNodes)
  .filter((child): child is Element => child.nodeType === 1)
  .filter(child => !name || localName(child) === name);

const descendants = (node: Node, name: string) => {
  const result: Element[] = [];
  const visit = (current: Node) => {
    for (const child of childElements(current)) {
      if (localName(child) === name) result.push(child);
      visit(child);
    }
  };
  visit(node);
  return result;
};

const firstDescendant = (node: Node, name: string) => descendants(node, name)[0];

const normalizedText = (node?: Node | null) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

const getHref = (element?: Element | null) => {
  if (!element) return '';
  return element.getAttribute('xlink:href') || element.getAttribute('href') ||
    Array.from(element.attributes).find(attribute => attribute.localName === 'href')?.value || '';
};

const decodeXml = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const probe = new TextDecoder('ascii').decode(bytes.slice(0, Math.min(bytes.length, 256)));
  const encoding = /<\?xml[^>]+encoding=["']([^"']+)/i.exec(probe)?.[1]?.toLowerCase() || 'utf-8';
  try {
    return new TextDecoder(encoding).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
};

const decodeBase64 = (value: string) => {
  const normalized = value.replace(/\s+/g, '');
  if (!normalized) return new Uint8Array();
  if (typeof atob === 'function') {
    const binary = atob(normalized);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const output: number[] = [];
  let bits = 0;
  let bitCount = 0;
  for (const character of normalized.replace(/=+$/, '')) {
    const index = alphabet.indexOf(character);
    if (index < 0) continue;
    bits = (bits << 6) | index;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      output.push((bits >> bitCount) & 0xff);
    }
  }
  return Uint8Array.from(output);
};

const parseAuthor = (element: Element) => {
  const parts = ['first-name', 'middle-name', 'last-name', 'nickname']
    .map(name => normalizedText(firstDescendant(element, name)))
    .filter(Boolean);
  return parts.join(' ');
};

const chapterTitle = (section: Element, index: number) => {
  const title = childElements(section, 'title')[0];
  const paragraphs = title ? descendants(title, 'p').map(normalizedText).filter(Boolean) : [];
  return paragraphs.join(' — ') || section.getAttribute('id') || `Chapter ${index + 1}`;
};

const parseSection = (section: Element, index: number, footnote = false): Fb2Chapter => {
  const nestedSections = childElements(section, 'section');
  const contentElements = childElements(section).filter(child => !['title', 'section'].includes(localName(child)));
  const paragraphs = contentElements
    .flatMap(element => localName(element) === 'p' ? [normalizedText(element)] : descendants(element, 'p').map(normalizedText))
    .filter(Boolean);
  const imageIds = contentElements
    .flatMap(element => localName(element) === 'image' ? [element] : descendants(element, 'image'))
    .map(image => getHref(image).replace(/^#/, ''))
    .filter(Boolean);
  return {
    id: section.getAttribute('id') || `section-${index + 1}`,
    title: chapterTitle(section, index),
    paragraphs,
    imageIds,
    children: nestedSections.map((child, childIndex) => parseSection(child, childIndex, footnote)),
    footnote,
  };
};

export const parseFb2Book = (
  buffer: ArrayBuffer,
  createParser: XmlParserFactory = () => new DOMParser()
): Fb2Book => {
  const document = createParser().parseFromString(decodeXml(buffer), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error('FB2 XML could not be parsed.');
  }
  const root = document.documentElement;
  if (!root || localName(root) !== 'fictionbook') {
    throw new Error('The file is not a FictionBook 2 document.');
  }

  const description = firstDescendant(root, 'description');
  const titleInfo = description ? firstDescendant(description, 'title-info') : undefined;
  const title = normalizedText(titleInfo ? firstDescendant(titleInfo, 'book-title') : undefined) || 'FictionBook';
  const authors = titleInfo ? childElements(titleInfo, 'author').map(parseAuthor).filter(Boolean) : [];
  const genres = titleInfo ? childElements(titleInfo, 'genre').map(normalizedText).filter(Boolean) : [];
  const language = normalizedText(titleInfo ? firstDescendant(titleInfo, 'lang') : undefined) || undefined;
  const annotation = normalizedText(titleInfo ? firstDescendant(titleInfo, 'annotation') : undefined) || undefined;
  const coverPage = titleInfo ? firstDescendant(titleInfo, 'coverpage') : undefined;
  const coverImageId = getHref(coverPage ? firstDescendant(coverPage, 'image') : undefined).replace(/^#/, '') || undefined;

  const images = new Map<string, Fb2Image>();
  for (const binary of childElements(root, 'binary')) {
    const id = binary.getAttribute('id') || '';
    if (!id) continue;
    images.set(id, {
      id,
      mimeType: binary.getAttribute('content-type') || 'application/octet-stream',
      bytes: decodeBase64(binary.textContent || ''),
    });
  }

  const chapters: Fb2Chapter[] = [];
  const footnotes: Fb2Chapter[] = [];
  for (const body of childElements(root, 'body')) {
    const isFootnote = ['notes', 'comments'].includes((body.getAttribute('name') || '').toLowerCase());
    const sections = childElements(body, 'section').map((section, index) => parseSection(section, index, isFootnote));
    (isFootnote ? footnotes : chapters).push(...sections);
  }

  return { title, authors, language, genres, annotation, coverImageId, chapters, footnotes, images };
};
