/*
 * ofd.js - A Javascript class for reading and rendering ofd files
 * <https://github.com/DLTech21/ofd.js>
 *
 * Copyright (c) 2020. DLTech21 All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

import JsZip from "jszip";
import {parseStBox, getExtensionByPath, replaceFirstSlash} from "./ofd_util.js";
import {Jbig2Image} from '../jbig2/jbig2.js';
import {pipeline} from "./pipeline.js";
import {parseSesSignature} from "./ses_signature_parser.js";

const ensureBrowserGlobal = () => {
    // DLTech21/ofd.js 的一部分遗留逻辑读取 Node 风格 global。
    // 浏览器端把它映射到 globalThis，避免解析 XML 时抛出 global is not defined。
    if (!globalThis.global) {
        globalThis.global = globalThis;
    }
    globalThis.xmlParseFlag = 0;
}

const appendChildValue = function (target, key, value) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] = Array.isArray(target[key])
            ? target[key].concat(value)
            : [target[key], value];
        return;
    }
    target[key] = value;
}

const xmlElementName = function (element) {
    return element.namespaceURI === 'http://www.ofdspec.org/2016'
        ? `ofd:${element.localName}`
        : element.nodeName;
}

const parseXmlElement = function (element, options, order) {
    const attrPrefix = options.attributeNamePrefix ?? '@_';
    const result = {};
    if (options.ignoreAttributes !== true) {
        for (const attr of Array.from(element.attributes || [])) {
            result[`${attrPrefix}${attr.name}`] = attr.value;
        }
    }

    const textParts = [];
    for (const child of Array.from(element.childNodes || [])) {
        if (child.nodeType === 1) {
            // 渲染层按 pfIndex 做绘制顺序（CSS z-index），这里用前序遍历给每个元素编号，
            // 还原 Image/Path/Text/PageBlock 在原始文档里交错出现的先后关系。
            // 若不记录，解析结果会把同名标签分组成数组，渲染时只能按“类型”整批绘制
            // （所有图片一起、所有路径一起……），导致本该压在图片下方的装饰路径盖住图片。
            const pfIndex = order ? order.next++ : undefined;
            const parsedChild = parseXmlElement(child, options, order);
            if (parsedChild && typeof parsedChild === 'object' && pfIndex !== undefined) {
                parsedChild.pfIndex = pfIndex;
            }
            appendChildValue(result, xmlElementName(child), parsedChild);
            continue;
        }
        if (child.nodeType === 3 || child.nodeType === 4) {
            textParts.push(child.nodeValue || '');
        }
    }

    // TextCode whitespace consumes explicitly positioned glyph slots. Trimming
    // it moves right-aligned dates and also shifts their DeltaX indices.
    const rawText = textParts.join('');
    const text = xmlElementName(element) === 'ofd:TextCode' ? rawText : rawText.trim();
    if (text) {
        if (Object.keys(result).length === 0) {
            return text;
        }
        result['#text'] = text;
    }
    return result;
}

const normalizeXmlContent = function (xmlData) {
    return String(xmlData || '')
        .replace(/^\uFEFF/, '')
        .replace(/^\u00EF\u00BB\u00BF/, '');
}

const parseXmlToJson = function (xmlData, options = {}) {
    const DOMParserCtor = globalThis.DOMParser;
    if (typeof DOMParserCtor !== 'function') {
        throw new Error('OFD XML parser requires DOMParser in the current runtime');
    }
    const document = new DOMParserCtor().parseFromString(normalizeXmlContent(xmlData), 'application/xml');
    const parserError = document.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new Error(parserError.textContent || 'OFD XML parse failed');
    }
    const root = document.documentElement;
    if (!root) {
        return {};
    }
    return {
        [xmlElementName(root)]: parseXmlElement(root, options, { next: 0 })
    };
}

const asArray = function (value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}

const collectGroupedItems = function (groupOrGroups, childKey) {
    let items = [];
    for (const group of asArray(groupOrGroups)) {
        if (group) {
            items = items.concat(asArray(group[childKey]));
        }
    }
    return items;
}

const zipEntryMapCache = new WeakMap();

const normalizeZipPath = function (value) {
    if (!value) {
        return '';
    }
    let normalized = String(value).replace(/\\/g, '/').trim();
    try {
        normalized = decodeURIComponent(normalized);
    } catch {
        // Keep the original path when it is not URI-encoded.
    }
    normalized = normalized
        .replace(/^\/+/, '')
        .replace(/^\.\//, '')
        .replace(/\/+/g, '/');
    const segments = [];
    for (const segment of normalized.split('/')) {
        if (!segment || segment === '.') {
            continue;
        }
        if (segment === '..') {
            segments.pop();
            continue;
        }
        segments.push(segment);
    }
    return segments.join('/');
}

const joinZipPath = function (...parts) {
    return normalizeZipPath(parts.filter(Boolean).join('/'));
}

const startsWithZipRoot = function (path, root) {
    const normalizedPath = normalizeZipPath(path).toLowerCase();
    const normalizedRoot = normalizeZipPath(root).toLowerCase();
    return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

const getZipEntry = function (zip, candidates) {
    const paths = asArray(candidates).map(normalizeZipPath).filter(Boolean);
    let lowerMap = zipEntryMapCache.get(zip);
    if (!lowerMap) {
        lowerMap = new Map();
        for (const name of Object.keys(zip.files)) {
            lowerMap.set(normalizeZipPath(name).toLowerCase(), zip.files[name]);
        }
        zipEntryMapCache.set(zip, lowerMap);
    }
    for (const path of paths) {
        const entry = zip.files[path] || lowerMap.get(path.toLowerCase());
        if (entry) {
            return entry;
        }
    }
    return null;
}

const resolveDocumentPath = function (path, doc) {
    const normalizedPath = normalizeZipPath(path);
    if (!normalizedPath || !doc || /^[\\/]/.test(String(path).trim()) || startsWithZipRoot(normalizedPath, doc)) {
        return normalizedPath;
    }
    return joinZipPath(doc, path);
}

const resolveResourceCandidates = function (file, baseLoc, doc, resourcePath) {
    const mediaFile = normalizeZipPath(file);
    const base = normalizeZipPath(baseLoc);
    const rawFile = String(file || '').replace(/\\/g, '/').trim();
    const rawBase = String(baseLoc || '').replace(/\\/g, '/').trim();
    const resourceDirectory = normalizeZipPath(resourcePath).split('/').slice(0, -1).join('/');
    const resourceBase = rawBase.startsWith('/') ? normalizeZipPath(rawBase) : joinZipPath(resourceDirectory, rawBase);
    // Resolve relative components before normalizing '..'. Declared locations
    // outrank compatibility fallbacks, including their case-insensitive matches.
    const declaredPath = rawFile.startsWith('/') ? mediaFile : joinZipPath(resourceBase, rawFile);
    const candidates = [mediaFile];

    if (base && !startsWithZipRoot(mediaFile, base)) {
        candidates.push(joinZipPath(base, mediaFile));
    }

    const docCandidates = [];
    for (const candidate of candidates) {
        docCandidates.push(candidate);
        if (candidate && !startsWithZipRoot(candidate, doc)) {
            docCandidates.push(joinZipPath(doc, candidate));
        }
    }

    return [...new Set([declaredPath, ...docCandidates].filter(Boolean))];
}

const getImageMime = function (format) {
    const normalized = format ? format.toLowerCase() : '';
    if (normalized === 'jpg' || normalized === 'jpeg') {
        return 'image/jpeg';
    }
    if (normalized === 'gif') {
        return 'image/gif';
    }
    if (normalized === 'bmp') {
        return 'image/bmp';
    }
    if (normalized === 'webp') {
        return 'image/webp';
    }
    return 'image/png';
}

export const unzipOfd = function (file) {
    return new Promise((resolve, reject) => {
        JsZip.loadAsync(file)
            .then(function (zip) {
                resolve(zip);
            }, function (e) {
                reject(e);
            });
    });
}

export const getDocRoots = async function (zip) {
    const data = await getJsonFromXmlContent(zip, 'OFD.xml');
    const docbodys = data['json']['ofd:OFD']['ofd:DocBody'];
    let array = [];
    array = array.concat(docbodys);
    return [zip, array]
}

export const parseSingleDoc = async function ([zip, array]) {
    let docs = [];
    for (let docbody of array) {
        if (docbody) {
            let res = await doGetDocRoot(zip, docbody);
            res = await getDocument(res);
            res = await getDocumentRes(res);
            res = await getPublicRes(res);
            res = await getTemplatePage(res);
            res = await getPage(res);
            docs.push(res);
        }
    }
    return docs;
}

const uint8ArrayToBase64 = function (bytes) {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

const sealImageMime = function (type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'jpg' || normalized === 'jpeg') {
        return 'image/jpeg';
    }
    if (normalized === 'gif') {
        return 'image/gif';
    }
    if (normalized === 'bmp') {
        return 'image/bmp';
    }
    return 'image/png';
}

export const doGetDocRoot = async function (zip, docbody) {
    let docRoot = docbody['ofd:DocRoot'];
    docRoot = normalizeZipPath(replaceFirstSlash(docRoot));
    const doc = docRoot.split('/').slice(0, -1).join('/');
    const signatures = docbody['ofd:Signatures'];
    const stampAnnot = await getSignature(zip, signatures, doc);
    let stampAnnotArray = {};
    for (const stamp of stampAnnot) {
        if (stamp.sealObj && Object.keys(stamp.sealObj).length > 0) {
            if (stamp.sealObj.type === 'ofd') {
                try {
                    const stampObjs = await getSealDocumentObj(stamp);
                    let annotArray = [];
                    annotArray = annotArray.concat(stamp.stampAnnot);
                    for (const annot of annotArray) {
                        if (!annot) {
                            continue;
                        }
                        annot.boundary = parseStBox(annot['@_Boundary']);
                        annot.pageRef = annot['@_PageRef'];
                        for (let stampObj of stampObjs) {
                            if (!stampAnnotArray[annot['@_PageRef']]) {
                                stampAnnotArray[annot['@_PageRef']] = [];
                            }
                            stampAnnotArray[annot['@_PageRef']].push({
                                type: 'ofd',
                                obj: stampObj,
                                stamp: {...stamp, stampAnnot: annot},
                            });
                        }
                    }
                } catch (e) {
                    console.warn('[ofd] nested OFD seal parse failed', e);
                }
            } else if (stamp.sealObj.ofdArray?.length) {
                const mime = sealImageMime(stamp.sealObj.type);
                let img = `data:${mime};base64,` + uint8ArrayToBase64(stamp.sealObj.ofdArray);
                let stampArray = [];
                stampArray = stampArray.concat(stamp.stampAnnot);
                for (const annot of stampArray) {
                    if (annot) {
                        const stampObj = {img, pageId: annot['@_PageRef'], 'boundary': parseStBox(annot['@_Boundary']), 'clip': parseStBox(annot['@_Clip'])};
                        if (!stampAnnotArray[annot['@_PageRef']]) {
                            stampAnnotArray[annot['@_PageRef']] = [];
                        }
                        stampAnnotArray[annot['@_PageRef']].push({type: 'png', obj: stampObj, stamp});
                    }
                }
            }
        }
    }
    return [zip, doc, docRoot, stampAnnotArray];
}

export const getDocument = async function ([zip, doc, docRoot, stampAnnot]) {
    const data = await getJsonFromXmlContent(zip, docRoot);
    const documentObj = data['json']['ofd:Document'];
    let annotations = documentObj['ofd:Annotations'];
    let array = [];
    let annoBase;
    if (annotations) {
        if (annotations.indexOf('/') !== -1) {
            annoBase = annotations.substring(0, annotations.indexOf('/'));
        }
        if (annotations.indexOf(doc) === -1) {
            annotations = `${doc}/${annotations}`;
        }
        if (getZipEntry(zip, annotations)) {
            annotations = await getJsonFromXmlContent(zip, annotations);
            array = array.concat(annotations['json']['ofd:Annotations']['ofd:Page']);
        }
    }
    const annotationObjs = await getAnnotations(annoBase, array, doc, zip)
    return [zip, doc, documentObj, stampAnnot, annotationObjs];
}

const getAnnotations = async function (annoBase, annotations, doc, zip) {
    let annotationObjs = {};
    for (let anno of annotations) {
        if (!anno) {
            continue
        }
        const pageId = anno['@_PageID'];
        let fileLoc = anno['ofd:FileLoc'];
        if (!fileLoc) {
            continue
        }
        fileLoc = normalizeZipPath(replaceFirstSlash(fileLoc));
        if (annoBase && fileLoc.indexOf(annoBase) === -1) {
            fileLoc = `${annoBase}/${fileLoc}`;
        }
        if (fileLoc.indexOf(doc) === -1) {
            fileLoc = `${doc}/${fileLoc}`;
        }

        if (getZipEntry(zip, fileLoc)) {
            const data = await getJsonFromXmlContent(zip, fileLoc);

            let array = [];
            array = array.concat(data['json']['ofd:PageAnnot']['ofd:Annot']);
            if (!annotationObjs[pageId]) {
                annotationObjs[pageId] = [];
            }
            for (let annot of array) {
                if (!annot) {
                    continue
                }
                const type = annot['@_Type'];
                const visible = annot['@_Visible'] ? annot['@_Visible']:true;
                const appearance = annot['ofd:Appearance'];
                let appearanceObj = {type, appearance, visible};
                annotationObjs[pageId].push(appearanceObj);
            }
        }
    }
    return annotationObjs;
}

export const getDocumentRes = async function ([zip, doc, Document, stampAnnot, annotationObjs]) {
    let documentResPath = Document['ofd:CommonData']['ofd:DocumentRes'];
    let fontResObj = {};
    let drawParamResObj = {};
    let multiMediaResObj = {};
    if (documentResPath) {
        documentResPath = resolveDocumentPath(documentResPath, doc);
        if (getZipEntry(zip, documentResPath)) {
            const data = await getJsonFromXmlContent(zip, documentResPath);
            const documentResObj = data['json']['ofd:Res'];
            fontResObj = await getFont(documentResObj);
            drawParamResObj = await getDrawParam(documentResObj);
            multiMediaResObj = await getMultiMediaRes(zip, documentResObj, doc, documentResPath);
        }
    }
    return [zip, doc, Document, stampAnnot, annotationObjs, fontResObj, drawParamResObj, multiMediaResObj];
}

export const getPublicRes = async function ([zip, doc, Document, stampAnnot, annotationObjs, fontResObj, drawParamResObj, multiMediaResObj]) {
    let publicResPath = Document['ofd:CommonData']['ofd:PublicRes'];
    if (publicResPath) {
        publicResPath = resolveDocumentPath(publicResPath, doc);
        if (getZipEntry(zip, publicResPath)) {
            const data = await getJsonFromXmlContent(zip, publicResPath);
            const publicResObj = data['json']['ofd:Res'];
            let fontObj = await getFont(publicResObj);
            fontResObj = Object.assign(fontResObj, fontObj);
            let drawParamObj = await getDrawParam(publicResObj);
            drawParamResObj = Object.assign(drawParamResObj, drawParamObj);
            let multiMediaObj = await getMultiMediaRes(zip, publicResObj, doc, publicResPath);
            multiMediaResObj = Object.assign(multiMediaResObj, multiMediaObj);
        }
    }
    return [zip, doc, Document, stampAnnot, annotationObjs, fontResObj, drawParamResObj, multiMediaResObj];
}

export const getTemplatePage = async function ([zip, doc, Document, stampAnnot, annotationObjs, fontResObj, drawParamResObj, multiMediaResObj]) {
    let templatePages = Document['ofd:CommonData']['ofd:TemplatePage'];
    let array = [];
    array = array.concat(templatePages);
    let tpls = {};
    for (const templatePage of array) {
        if (templatePage) {
            let pageObj = await parsePage(zip, templatePage, doc);
            tpls[Object.keys(pageObj)[0]] = pageObj[Object.keys(pageObj)[0]];
        }
    }
    return [zip, doc, Document, stampAnnot, annotationObjs, tpls, fontResObj, drawParamResObj, multiMediaResObj];
}

export const getPage = async function ([zip, doc, Document, stampAnnot, annotationObjs, tpls, fontResObj, drawParamResObj, multiMediaResObj]) {
    let pages = Document['ofd:Pages']['ofd:Page'];
    let array = [];
    array = array.concat(pages);
    let res = [];
    for (const page of array) {
        if (page) {
            let pageObj = await parsePage(zip, page, doc);
            const pageId = Object.keys(pageObj)[0];
            const currentPageStamp = stampAnnot[pageId];
            if (currentPageStamp) {
                pageObj[pageId].stamp = currentPageStamp;
            }
            const annotationObj = annotationObjs[pageId];
            if (annotationObj) {
                pageObj[pageId].annotation = annotationObj;
            }
            res.push(pageObj);
        }
    }
    return {
        'doc': doc,
        'document': Document,
        'pages': res,
        'tpls': tpls,
        'stampAnnot': stampAnnot,
        fontResObj,
        drawParamResObj,
        multiMediaResObj
    };
}

const getFont = async function (res) {
    const fonts = res['ofd:Fonts'];
    let fontResObj = {};
    if (fonts) {
        let fontArray = collectGroupedItems(fonts, 'ofd:Font');
        for (const font of fontArray) {
            if (font) {
                if (font['@_FamilyName']) {
                    fontResObj[font['@_ID']] = font['@_FamilyName'];
                } else {
                    fontResObj[font['@_ID']] = font['@_FontName'];
                }
            }
        }
    }
    return fontResObj;
}

const getDrawParam = async function (res) {
    const drawParams = res['ofd:DrawParams'];
    let drawParamResObj = {};
    if (drawParams) {
        let array = collectGroupedItems(drawParams, 'ofd:DrawParam');
        for (const item of array) {
            if (item) {
                drawParamResObj[item['@_ID']] = {
                    'LineWidth': item['@_LineWidth'],
                    'FillColor': item['ofd:FillColor'] ? item['ofd:FillColor']['@_Value'] : '',
                    'StrokeColor': item['ofd:StrokeColor'] ? item['ofd:StrokeColor']['@_Value'] : "",
                    'relative': item['@_Relative'],
                };
            }
        }
    }
    return drawParamResObj;
}

const getMultiMediaRes = async function (zip, res, doc, resourcePath) {
    const multiMedias = res['ofd:MultiMedias'];
    let multiMediaResObj = {};
    if (multiMedias) {
        let array = collectGroupedItems(multiMedias, 'ofd:MultiMedia');
        for (const item of array) {
            if (item && item['ofd:MediaFile']) {
                const candidates = resolveResourceCandidates(item['ofd:MediaFile'], res['@_BaseLoc'], doc, resourcePath);
                const file = getZipEntry(zip, candidates) ? candidates : null;
                const type = item['@_Type'] ? item['@_Type'].toLowerCase() : '';
                if (type === 'image') {
                    const format = item['@_Format'];
                    const ext = getExtensionByPath(candidates[0]);
                    if ((format && (format.toLowerCase() === 'gbig2' || format.toLowerCase() === 'jb2')) || ext && (ext.toLowerCase() === 'jb2' || ext.toLowerCase() === 'gbig2')) {
                        const jbig2 = await parseJbig2ImageFromZip(zip, candidates);
                        if (jbig2) {
                            multiMediaResObj[item['@_ID']] = jbig2;
                        }
                    } else {
                        const imageFormat = format || ext || 'png';
                        const img = await parseOtherImageFromZip(zip, candidates, getImageMime(imageFormat));
                        if (img) {
                            multiMediaResObj[item['@_ID']] = {img, 'format': imageFormat.toLowerCase()};
                        }
                    }
                } else {
                    multiMediaResObj[item['@_ID']] = file ? file[0] : candidates[0];
                }
            }
        }
    }
    return multiMediaResObj;
}

const parsePage = async function (zip, obj, doc) {
    let pagePath = obj['@_BaseLoc'];
    pagePath = resolveDocumentPath(pagePath, doc);
    const data = await getJsonFromXmlContent(zip, pagePath);
    let pageObj = {};
    pageObj[obj['@_ID']] = {'json': data['json']['ofd:Page'], 'xml': data['xml']};
    return pageObj;
}

const getSignature = async function (zip, signatures, doc) {
    // 预览只解析签章外观（SES 印章图片 / 嵌套 OFD），不做国密/证书验签，
    // 单个签章失败不影响正文页渲染。
    let stampAnnot = [];
    if (!signatures) {
        return stampAnnot;
    }
    try {
        let signaturesPath = normalizeZipPath(replaceFirstSlash(signatures));
        if (!startsWithZipRoot(signaturesPath, doc)) {
            signaturesPath = joinZipPath(doc, signaturesPath);
        }
        if (!getZipEntry(zip, signaturesPath)) {
            return stampAnnot;
        }
        let data = await getJsonFromXmlContent(zip, signaturesPath);
        let signature = data['json']['ofd:Signatures']['ofd:Signature'];
        let signatureArray = [];
        signatureArray = signatureArray.concat(signature);
        for (const sign of signatureArray) {
            if (!sign) {
                continue;
            }
            try {
                let signatureLoc = normalizeZipPath(replaceFirstSlash(sign['@_BaseLoc']));
                let signatureID = sign['@_ID'];
                if (signatureLoc && signatureLoc.indexOf('Signs') === -1 && !startsWithZipRoot(signatureLoc, doc)) {
                    signatureLoc = joinZipPath('Signs', signatureLoc);
                }
                if (!startsWithZipRoot(signatureLoc, doc)) {
                    signatureLoc = joinZipPath(doc, signatureLoc);
                }
                const parsed = await getSignatureData(zip, signatureLoc, signatureID);
                if (parsed) {
                    stampAnnot.push(parsed);
                }
            } catch (e) {
                console.warn('[ofd] signature entry parse failed', sign?.['@_ID'], e);
            }
        }
    } catch (e) {
        console.warn('[ofd] signatures.xml parse failed', e);
    }
    return stampAnnot;
}

const getSignatureData = async function (zip, signature, signatureID) {
    const data = await getJsonFromXmlContent(zip, signature);
    let signedValue = data['json']['ofd:Signature']['ofd:SignedValue'];
    if (signedValue == null) {
        return null;
    }
    signedValue = normalizeZipPath(replaceFirstSlash(String(signedValue)));
    if (!getZipEntry(zip, signedValue)) {
        signedValue = joinZipPath(signature.substring(0, signature.lastIndexOf('/')), signedValue);
    }
    if (!getZipEntry(zip, signedValue)) {
        console.warn('[ofd] SignedValue not found', signedValue);
        return null;
    }
    let sealObj = await parseSesSignature(zip, signedValue, getZipEntry);
    if (!sealObj || !Object.keys(sealObj).length) {
        return null;
    }
    const signedInfoNode = data['json']['ofd:Signature']['ofd:SignedInfo'] || {};
    return {
        'stampAnnot': signedInfoNode['ofd:StampAnnot'],
        'sealObj': sealObj,
        'signedInfo': {
            'signatureID': signatureID,
            'VerifyRet': sealObj.verifyRet,
            'VerificationStatus': sealObj.verificationStatus || 'not-verified',
            'Provider': signedInfoNode['ofd:Provider'],
            'SignatureMethod': signedInfoNode['ofd:SignatureMethod'],
            'SignatureDateTime': signedInfoNode['ofd:SignatureDateTime'],
        },
    };
}

const getSealDocumentObj = function (stampAnnot) {
    return new Promise((resolve, reject) => {
        pipeline.call(this, async () => await unzipOfd(stampAnnot.sealObj.ofdArray), getDocRoots, parseSingleDoc)
            .then(res => {
                resolve(res)
            })
            .catch(res => {
                reject(res);
            });
    });
}

const getJsonFromXmlContent = async function (zip, xmlName) {
    const entry = getZipEntry(zip, xmlName);
    if (!entry) {
        throw new Error(`OFD XML resource not found: ${normalizeZipPath(xmlName)}`);
    }
    const content = await entry.async('string');
    ensureBrowserGlobal();
    try {
        const json = parseXmlToJson(content, {
            attributeNamePrefix: "@_",
            ignoreAttributes: false,
            parseNodeValue: false,
            trimValues: false
        });
        return {xml: content, json};
    } catch (error) {
        throw new Error(`OFD XML parse failed (${normalizeZipPath(xmlName)}): ${error.message}`);
    }
}

const parseJbig2ImageFromZip = async function (zip, name) {
    const entry = getZipEntry(zip, name);
    if (!entry) return null;
    const bytes = await entry.async('uint8array');
    const jbig2 = new Jbig2Image();
    const img = jbig2.parse(bytes);
    return {img, width: jbig2.width, height: jbig2.height, format: 'gbig2'};
}

const parseOtherImageFromZip = async function (zip, name, mime = 'image/png') {
    return new Promise((resolve, reject) => {
        const entry = getZipEntry(zip, name);
        if (!entry) {
            resolve(null);
            return;
        }
        entry.async('base64').then(function (bytes) {
            const img = `data:${mime};base64,` + bytes;
            resolve(img);
        }, function error(e) {
            reject(e);
        })
    });
}
