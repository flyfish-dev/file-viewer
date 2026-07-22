import assert from 'node:assert/strict';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';
import {
  DOCX_DEFAULT_PAGE_LAYOUT,
  normalizeDocxPageLayout
} from '../dist/docxPageDefaults.js';

const WORD_NAMESPACE =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const runtime = {
  parse: (xml) => new DOMParser().parseFromString(xml, 'application/xml'),
  serialize: (document) => new XMLSerializer().serializeToString(document)
};

const wrapDocument = (
  body
) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NAMESPACE}"><w:body>${body}</w:body></w:document>`;

const createPackage = async (documentXml) => {
  const zip = new JSZip();
  zip.file('word/document.xml', documentXml);
  return zip.generateAsync({ type: 'arraybuffer' });
};

const readDocument = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  return runtime.parse(await zip.file('word/document.xml').async('string'));
};

const children = (element) =>
  Array.from(element.childNodes).filter((node) => node.nodeType === 1);
const first = (document, name) =>
  document.getElementsByTagNameNS(WORD_NAMESPACE, name)[0];
const attribute = (element, name) =>
  element.getAttributeNS(WORD_NAMESPACE, name);

const missingSectionPackage = await createPackage(
  wrapDocument('<w:p><w:r><w:t>content</w:t></w:r></w:p>')
);
const normalizedMissingSection = await normalizeDocxPageLayout(
  missingSectionPackage,
  runtime
);
const missingSectionDocument = await readDocument(normalizedMissingSection);
const createdSection = first(missingSectionDocument, 'sectPr');
const createdPageSize = first(missingSectionDocument, 'pgSz');
const createdMargins = first(missingSectionDocument, 'pgMar');

assert.ok(createdSection);
assert.equal(attribute(createdPageSize, 'w'), DOCX_DEFAULT_PAGE_LAYOUT.width);
assert.equal(attribute(createdPageSize, 'h'), DOCX_DEFAULT_PAGE_LAYOUT.height);
assert.equal(
  attribute(createdMargins, 'top'),
  DOCX_DEFAULT_PAGE_LAYOUT.marginTop
);
assert.equal(
  attribute(createdMargins, 'right'),
  DOCX_DEFAULT_PAGE_LAYOUT.marginRight
);
assert.equal(
  attribute(createdMargins, 'bottom'),
  DOCX_DEFAULT_PAGE_LAYOUT.marginBottom
);
assert.equal(
  attribute(createdMargins, 'left'),
  DOCX_DEFAULT_PAGE_LAYOUT.marginLeft
);
assert.equal(
  attribute(createdMargins, 'header'),
  DOCX_DEFAULT_PAGE_LAYOUT.header
);
assert.equal(
  attribute(createdMargins, 'footer'),
  DOCX_DEFAULT_PAGE_LAYOUT.footer
);
assert.equal(
  attribute(createdMargins, 'gutter'),
  DOCX_DEFAULT_PAGE_LAYOUT.gutter
);

const partialPackage = await createPackage(
  wrapDocument(`
  <w:p><w:pPr><w:sectPr>
    <w:pgSz w:orient="landscape"/>
    <w:pgMar w:top="0"/>
    <w:cols w:num="1"/>
  </w:sectPr></w:pPr></w:p>
  <w:sectPr>
    <w:pgSz w:w="10000" w:h="20000"/>
    <w:pgMar w:top="100" w:right="200" w:bottom="300" w:left="400" w:header="500" w:footer="600" w:gutter="700"/>
  </w:sectPr>
`)
);
const normalizedPartial = await normalizeDocxPageLayout(
  partialPackage,
  runtime
);
const partialDocument = await readDocument(normalizedPartial);
const partialSections = Array.from(
  partialDocument.getElementsByTagNameNS(WORD_NAMESPACE, 'sectPr')
);
const firstPageSize = children(partialSections[0]).find(
  (node) => node.localName === 'pgSz'
);
const firstMargins = children(partialSections[0]).find(
  (node) => node.localName === 'pgMar'
);
const orderedNames = children(partialSections[0]).map((node) => node.localName);

assert.equal(attribute(firstPageSize, 'w'), DOCX_DEFAULT_PAGE_LAYOUT.height);
assert.equal(attribute(firstPageSize, 'h'), DOCX_DEFAULT_PAGE_LAYOUT.width);
assert.equal(attribute(firstMargins, 'top'), '0');
assert.equal(
  attribute(firstMargins, 'left'),
  DOCX_DEFAULT_PAGE_LAYOUT.marginLeft
);
assert.ok(orderedNames.indexOf('pgSz') < orderedNames.indexOf('pgMar'));
assert.ok(orderedNames.indexOf('pgMar') < orderedNames.indexOf('cols'));

const finalPageSize = children(partialSections[1]).find(
  (node) => node.localName === 'pgSz'
);
const finalMargins = children(partialSections[1]).find(
  (node) => node.localName === 'pgMar'
);
assert.equal(attribute(finalPageSize, 'w'), '10000');
assert.equal(attribute(finalPageSize, 'h'), '20000');
assert.equal(attribute(finalMargins, 'left'), '400');
assert.equal(attribute(finalMargins, 'gutter'), '700');

const completePackage = await createPackage(
  wrapDocument(`
  <w:p/>
  <w:sectPr>
    <w:pgSz w:w="10000" w:h="20000"/>
    <w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/>
  </w:sectPr>
`)
);
assert.equal(
  await normalizeDocxPageLayout(completePackage, runtime),
  completePackage
);

console.log('DOCX missing page size and margin defaults verified.');
