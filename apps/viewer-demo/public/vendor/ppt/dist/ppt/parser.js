import { CompoundFile, toBytes } from '../core/cfb.js';
import { PptError } from '../core/errors.js';
import { trimTrailingNulls } from '../core/utils.js';
import { DEFAULT_LIMITS, RT } from './constants.js';
import { readRecord } from './records.js';
import { parseDefaultTextStyle, parseFonts, parseMasterTextStyles, parseTextFrames } from './text.js';
import { parseDrawing, readDrawingDefaults } from './drawing.js';
import { parsePictures } from './pictures.js';
import { parseDocumentExtras, parseSlideExtras, extractOleStorage } from './extras.js';
import { parseHeaderFooter, resolveHeaderFooter } from './headers-footers.js';
import { parseLegacyAnimations } from './animation.js';
import { decryptPptStreams } from './encryption.js';
import { bindShapeInteractions, resolveSlideLinks } from './interactions.js';
export const VERSION = '1.0.2';
const now = () => typeof performance === 'undefined' ? Date.now() : performance.now();
function dataView(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
/** Resolve newest-to-oldest save transactions; old versions never override newer IDs. [MS-PPT] 2.1.2. */
export function readPersistDirectory(bytes, currentUser, ctx) {
    const cctx = { ...ctx, bytes: currentUser, count: 0 };
    const current = readRecord(cctx, 0);
    if (current.type !== RT.CurrentUserAtom || current.length < 20)
        throw new PptError('CURRENT_USER', 'Invalid Current User stream');
    const cv = dataView(currentUser), token = cv.getUint32(current.dataOffset + 4, true);
    if (token === 0xf3d1c4df)
        throw new PptError('ENCRYPTED_PPT', 'Decrypt this encrypted presentation with its supplied password before reading its persist graph');
    if (token !== 0xe391c05f)
        throw new PptError('CURRENT_USER', 'Unrecognized PowerPoint Current User token');
    let edit = cv.getUint32(current.dataOffset + 8, true), documentId = 0, editCount = 0;
    const objects = new Map(), seen = new Set();
    const view = dataView(bytes);
    while (edit !== 0) {
        if (seen.has(edit))
            throw new PptError('PERSIST_CYCLE', 'Cycle in UserEdit chain', edit);
        seen.add(edit);
        const user = readRecord(ctx, edit);
        if (user.type !== RT.UserEditAtom || user.length < 28)
            throw new PptError('USER_EDIT', 'Invalid UserEditAtom', edit);
        const p = user.dataOffset;
        if (user.length >= 32 && view.getUint32(p + 28, true) !== 0)
            throw new PptError('ENCRYPTED_PPT', 'Encrypted persist objects must be decrypted before reading the graph', edit);
        if (editCount++ === 0)
            documentId = view.getUint32(p + 16, true);
        const directory = readRecord(ctx, view.getUint32(p + 12, true));
        if (directory.type !== RT.PersistDirectoryAtom && directory.type !== RT.PersistDirectoryFullBlock)
            throw new PptError('PERSIST_DIRECTORY', 'UserEdit references an invalid persist directory', directory.offset);
        let at = directory.dataOffset;
        while (at < directory.end) {
            if (at + 4 > directory.end)
                throw new PptError('PERSIST_DIRECTORY', 'Truncated persist directory entry', at);
            const packed = view.getUint32(at, true), start = packed & 0xfffff, count = packed >>> 20;
            at += 4;
            if (count === 0 || start === 0 || start + count > 0x100000 || at + count * 4 > directory.end)
                throw new PptError('PERSIST_DIRECTORY', 'Invalid persist directory range', at - 4);
            for (let i = 0; i < count; i++) {
                const offset = view.getUint32(at + i * 4, true);
                if (offset + 8 > bytes.length)
                    throw new PptError('PERSIST_OFFSET', 'Persist object offset is outside PowerPoint Document', offset);
                if (!objects.has(start + i))
                    objects.set(start + i, offset);
            }
            at += count * 4;
        }
        edit = view.getUint32(p + 8, true);
    }
    if (!documentId || !objects.has(documentId))
        throw new PptError('PERSIST_DOCUMENT', 'Current document persist object is missing');
    return { objects, documentId, editCount };
}
function slideReferences(list, bytes) {
    if (!list)
        return [];
    const v = dataView(bytes), out = [];
    let ref;
    for (const record of list.children) {
        if (record.type === RT.SlidePersistAtom) {
            if (record.length < 20)
                throw new PptError('SLIDE_PERSIST', 'Truncated SlidePersistAtom', record.offset);
            ref = { persistId: v.getUint32(record.dataOffset, true), id: v.getUint32(record.dataOffset + 12, true), textCount: v.getUint32(record.dataOffset + 8, true), texts: [] };
            out.push(ref);
        }
        else if (ref)
            ref.texts.push(record);
    }
    return out;
}
function scheme(records, bytes, fallback) {
    const choices = records.filter(r => r.type === RT.ColorSchemeAtom && r.length >= 32);
    const r = choices.find(r => r.instance === 1) ?? choices[0];
    if (!r)
        return fallback;
    const v = dataView(bytes);
    return Array.from({ length: 8 }, (_, i) => v.getUint32(r.dataOffset + i * 4, true) & 0xffffff);
}
function rgb(value) { return '#' + [value & 255, (value >>> 8) & 255, (value >>> 16) & 255].map(x => x.toString(16).padStart(2, '0')).join(''); }
function frames(shapes) { const out = []; for (const shape of shapes) {
    if (shape.text)
        out.push(shape.text);
    if (shape.children)
        out.push(...frames(shape.children));
} return out; }
function validateLimits(options) { const limits = { ...DEFAULT_LIMITS, ...options.limits }; for (const [key, value] of Object.entries(limits))
    if (!Number.isSafeInteger(value) || value <= 0)
        throw new PptError('INVALID_LIMIT', `Invalid parse limit ${key}`); return limits; }
function summary(bytes) {
    const result = {};
    if (!bytes || bytes.length < 48)
        return result;
    try {
        const v = dataView(bytes);
        if (v.getUint16(0, true) !== 0xfffe)
            return result;
        const p = v.getUint32(44, true);
        if (p + 8 > bytes.length)
            return result;
        const size = v.getUint32(p, true), count = v.getUint32(p + 4, true);
        if (p + size > bytes.length || 8 + count * 8 > size)
            return result;
        const map = new Map();
        for (let i = 0; i < count; i++)
            map.set(v.getUint32(p + 8 + i * 8, true), p + v.getUint32(p + 12 + i * 8, true));
        let encoding = 'windows-1252';
        const cp = map.get(1);
        if (cp !== undefined && cp + 6 <= p + size && v.getUint32(cp, true) === 2) {
            const code = v.getUint16(cp + 4, true);
            encoding = code === 65001 ? 'utf-8' : code === 936 ? 'gbk' : code === 932 ? 'shift_jis' : code === 949 ? 'euc-kr' : 'windows-1252';
        }
        for (const [id, key] of [[2, 'title'], [3, 'subject'], [4, 'author']]) {
            const at = map.get(id);
            if (at === undefined || at + 8 > p + size)
                continue;
            const type = v.getUint32(at, true), n = v.getUint32(at + 4, true), length = type === 31 ? n * 2 : n;
            if ((type !== 30 && type !== 31) || at + 8 + length > p + size)
                continue;
            result[key] = trimTrailingNulls(new TextDecoder(type === 31 ? 'utf-16le' : encoding).decode(bytes.subarray(at + 8, at + 8 + length)));
        }
    }
    catch { /* Optional metadata never prevents rendering a valid slide stream. */ }
    return result;
}
/** Parse a real legacy .ppt file into a serializable model. No DOM, external URLs, native code or WASM. */
export function parsePpt(input, options = {}) {
    const started = now(), inputBytes = toBytes(input), limits = validateLimits(options), diagnostics = [];
    if (inputBytes[0] === 0x50 && inputBytes[1] === 0x4b)
        throw new PptError('UNSUPPORTED_PPTX', 'This parser handles binary .ppt files. Use a separate OOXML parser for .pptx.');
    const cfb = new CompoundFile(inputBytes, limits, diagnostics, options.strict);
    const decrypted = decryptPptStreams(cfb, options.password, limits, diagnostics);
    const bytes = decrypted?.document ?? cfb.getStream('PowerPoint Document'), currentUser = decrypted?.currentUser ?? cfb.getStream('Current User');
    if (!bytes || !currentUser)
        throw new PptError('NOT_PPT', 'Required PowerPoint Document or Current User stream is missing');
    const rc = { bytes, limits, diagnostics, count: 0, strict: options.strict };
    const persist = readPersistDirectory(bytes, currentUser, rc);
    const cache = new Map();
    const recordCount = { get value() { return rc.count; }, set value(value) { rc.count = value; } };
    const object = (id) => { let node = cache.get(id); if (node)
        return node; const offset = persist.objects.get(id); if (offset === undefined)
        throw new PptError('PERSIST_MISSING', `Persist object ${id} is missing`); node = readRecord(rc, offset); cache.set(id, node); return node; };
    const document = object(persist.documentId);
    if (document.type !== RT.Document)
        throw new PptError('DOCUMENT', 'Document persist ID does not refer to a DocumentContainer');
    const da = document.children.find(r => r.type === RT.DocumentAtom);
    if (!da || da.length < 40)
        throw new PptError('DOCUMENT_ATOM', 'Required DocumentAtom is missing or truncated');
    const dv = dataView(bytes);
    const size = { width: dv.getInt32(da.dataOffset, true) / 6, height: dv.getInt32(da.dataOffset + 4, true) / 6 };
    const notesSize = { width: dv.getInt32(da.dataOffset + 8, true) / 6, height: dv.getInt32(da.dataOffset + 12, true) / 6 }, notesMasterPersistId = dv.getUint32(da.dataOffset + 24, true);
    const firstSlideNumber = dv.getUint16(da.dataOffset + 32, true), omitTitlePlace = !!dv.getUint8(da.dataOffset + 37);
    if (firstSlideNumber >= 10000)
        diagnostics.push({ code: 'SLIDE_NUMBER_RANGE', severity: 'warning', message: 'Document first-slide number exceeds the specification range', offset: da.offset });
    const hfContext = { bytes, limits, diagnostics }, documentHeadersFooters = parseHeaderFooter(document.children, hfContext, 3), notesHeadersFooters = parseHeaderFooter(document.children, hfContext, 4);
    if (!(size.width > 0 && size.height > 0 && size.width <= 1e6 && size.height <= 1e6))
        throw new PptError('SLIDE_SIZE', 'Invalid slide dimensions');
    const lists = document.children.filter(r => r.type === RT.SlideListWithText);
    const slideRefs = slideReferences(lists.find(r => r.instance === 0), bytes), masterRefs = slideReferences(lists.find(r => r.instance === 1), bytes), noteRefs = slideReferences(lists.find(r => r.instance === 2), bytes);
    if (slideRefs.length > limits.maxSlides || masterRefs.length > limits.maxSlides || noteRefs.length > limits.maxSlides)
        throw new PptError('LIMIT_SLIDES', 'Presentation exceeds the slide count limit');
    const drawingGroup = document.children.find(r => r.type === RT.PPDrawingGroup);
    const picturesBytes = decrypted?.pictures ?? cfb.getStream('Pictures') ?? new Uint8Array(0);
    const pictureResult = parsePictures(drawingGroup, bytes, picturesBytes, diagnostics, limits);
    const extras = { hyperlinks: [], sounds: [], media: [], oleObjects: [], comments: [], animationRecordTypes: [] };
    const hyperlinkTargets = new Map(), oleStorage = new Map();
    let assetCursor = 0, totalAssetBytes = 0;
    const assetSize = () => { while (assetCursor < pictureResult.assets.length)
        totalAssetBytes += pictureResult.assets[assetCursor++].bytes.length; return totalAssetBytes; };
    const remainingLimits = () => ({ ...limits, maxAssetBytes: Math.max(0, limits.maxAssetBytes - assetSize()), maxRecords: Math.max(0, limits.maxRecords - rc.count) });
    function mergeExtras(part) {
        rc.count += part.additionalRecordCount;
        if (rc.count > limits.maxRecords)
            throw new PptError('LIMIT_RECORDS', 'Presentation exceeds the aggregate record limit');
        pictureResult.assets.push(...part.assets);
        if (assetSize() > limits.maxAssetBytes)
            throw new PptError('LIMIT_ASSETS', 'Presentation exceeds the aggregate asset limit');
        resolveSlideLinks(part.hyperlinks, slideRefs, part.hyperlinkTargets, diagnostics);
        for (const [id, href] of part.hyperlinkTargets)
            if (!hyperlinkTargets.has(id))
                hyperlinkTargets.set(id, href);
        extras.hyperlinks.push(...part.hyperlinks);
        extras.sounds.push(...part.sounds);
        extras.media.push(...part.media);
        extras.comments.push(...part.comments);
        for (const type of part.animationRecordTypes)
            if (!extras.animationRecordTypes.includes(type))
                extras.animationRecordTypes.push(type);
        for (const embedded of part.oleObjects) {
            const id = embedded.storagePersistId;
            if (id) {
                const known = oleStorage.get(id);
                if (known)
                    embedded.assetId = known;
                else if (persist.objects.has(id)) {
                    const storage = extractOleStorage(object(id), bytes, limits.maxAssetBytes - assetSize(), diagnostics);
                    if (storage) {
                        pictureResult.assets.push(storage);
                        embedded.assetId = storage.id;
                        oleStorage.set(id, storage.id);
                    }
                }
                else
                    diagnostics.push({ code: 'OLE_STORAGE_MISSING', severity: 'warning', message: 'The embedded object storage persist ID is missing', offset: embedded.sourceOffset, details: { persistId: id } });
            }
            extras.oleObjects.push(embedded);
        }
    }
    mergeExtras(parseDocumentExtras(document.children, bytes, remainingLimits(), diagnostics));
    const fonts = parseFonts(document.children, bytes);
    const baseColors = [0xffffff, 0x000000, 0x808080, 0x000000, 0xffffff, 0xff0000, 0x0000ff, 0x800080];
    const tc = { bytes, fonts, colors: baseColors, diagnostics, limits, hyperlinkTargets };
    const environment = document.children.find(r => r.type === RT.Environment);
    tc.defaultStyle = parseDefaultTextStyle(environment?.children ?? [], tc);
    const defaultStyles = parseMasterTextStyles(environment?.children ?? [], tc);
    const drawingDefaults = readDrawingDefaults(drawingGroup, bytes, diagnostics, limits, recordCount);
    const shapeCount = { value: 0 };
    const common = { ...tc, assets: pictureResult.assets, pictureIds: pictureResult.pictureIds, slideTexts: [], shapeCount, drawingDefaults, recordCount };
    const masters = [];
    const masterStyles = new Map();
    const notes = new Map();
    let notesMaster, notesMasterTextStyles;
    const masterReferences = new Map(masterRefs.map((ref, index) => [ref.id, { ref, index }]));
    const masterById = new Map(), resolvingMasters = new Set();
    function resolveMaster(id) {
        if (!id)
            return undefined;
        const cached = masterById.get(id);
        if (cached)
            return cached;
        const entry = masterReferences.get(id);
        if (!entry)
            return undefined;
        if (resolvingMasters.has(id))
            throw new PptError('MASTER_CYCLE', 'Cycle in slide master inheritance');
        if (resolvingMasters.size >= limits.maxDepth)
            throw new PptError('LIMIT_DEPTH', 'Slide master inheritance exceeds the configured nesting limit');
        resolvingMasters.add(id);
        const master = parseOne(entry.ref, entry.index, true);
        resolvingMasters.delete(id);
        masters.push(master);
        masterById.set(id, master);
        return master;
    }
    function parseOne(ref, index, isMaster = false, isNotesMaster = false) {
        const diagnosticStart = diagnostics.length;
        const node = object(ref.persistId);
        if (node.type !== RT.Slide && node.type !== RT.MainMaster && node.type !== RT.Notes)
            throw new PptError('SLIDE_OBJECT', 'Slide list references a non-slide object', node.offset);
        const atom = node.children.find(r => r.type === RT.SlideAtom), masterId = atom && atom.length >= 20 ? dv.getUint32(atom.dataOffset + 12, true) : 0;
        const noteAtom = node.type === RT.Notes ? node.children.find(r => r.type === RT.NotesAtom) : undefined;
        const flags = noteAtom && noteAtom.length >= 6 ? dv.getUint16(noteAtom.dataOffset + 4, true) : atom && atom.length >= 22 ? dv.getUint16(atom.dataOffset + 20, true) : 7;
        const master = node.type === RT.Notes ? (isNotesMaster ? undefined : notesMaster) : resolveMaster(masterId);
        const colors = ((flags & 2) && master?.colorScheme) ? master.colorScheme : scheme(node.children, bytes, master?.colorScheme ?? baseColors);
        const slideExtras = parseSlideExtras(node.children, bytes, remainingLimits(), diagnostics, ref.id);
        mergeExtras(slideExtras);
        const localContext = { ...tc, colors, masterStyles: (node.type === RT.Notes ? notesMasterTextStyles : masterStyles.get(masterId)) ?? defaultStyles };
        if (isMaster) {
            const own = parseMasterTextStyles(node.children, localContext);
            const merged = new Map(localContext.masterStyles);
            for (const [key, value] of own)
                merged.set(key, value);
            localContext.masterStyles = merged;
            if (isNotesMaster)
                notesMasterTextStyles = merged;
            else
                masterStyles.set(ref.id, merged);
        }
        const slideTexts = parseTextFrames(ref.texts, localContext);
        const drawing = node.children.find(r => r.type === RT.PPDrawing);
        const shapes = drawing ? parseDrawing(drawing, { ...common, ...localContext, slideTexts, masterShapes: master?.shapes }) : [];
        bindShapeInteractions(node.children, bytes, shapes, extras, hyperlinkTargets, diagnostics, ref.id);
        let background = (flags & 4) && master ? master.background : { kind: 'solid', color: rgb(colors[0] ?? 0xffffff) };
        const visibleShapes = [];
        for (const shape of shapes) {
            if ((shape.source?.properties?.fspFlags ?? 0) & 0x400) {
                if (!(flags & 4) || !master)
                    background = shape.fill;
            }
            else
                visibleShapes.push(shape);
        }
        if (!drawing && slideTexts.length)
            diagnostics.push({ code: 'SLIDE_NO_DRAWING', severity: 'warning', message: 'Text exists but the slide has no drawing container; original positioning is unavailable.', slideId: ref.id });
        const name = slideTexts.map(f => f.sourceText ?? f.paragraphs.flatMap(p => p.runs.map(r => r.text)).join('')).find(t => t.trim())?.slice(0, 200);
        const layoutType = atom && atom.length >= 4 ? dv.getUint32(atom.dataOffset, true) : undefined;
        const headersFooters = resolveHeaderFooter(node.type === RT.Notes ? notesHeadersFooters : documentHeadersFooters, master?.headersFooters, parseHeaderFooter(node.children, hfContext));
        const slide = { id: ref.id, persistId: ref.persistId, index, name, size: node.type === RT.Notes ? notesSize : size, masterId: masterId || undefined, shapes: visibleShapes, background, showMasterShapes: !!(flags & 1), colorScheme: colors, headersFooters, displayNumber: firstSlideNumber + index, layoutType, suppressHeaderFooter: !isMaster && node.type === RT.Slide && layoutType === 0 && omitTitlePlace };
        const hasModernTiming = slideExtras.animationRecordTypes.some(t => t >= 0xf125 && t <= 0xf145);
        const effects = parseLegacyAnimations(node.children, bytes, shapes, diagnostics, ref.id, hasModernTiming);
        if (effects.length)
            slide.timeline = { effects };
        const show = node.children.find(r => r.type === RT.SSSlideInfoAtom);
        if (show && show.length >= 16) {
            const p = show.dataOffset, showFlags = dv.getUint16(p + 10, true);
            slide.transition = { type: dv.getUint8(p + 9), direction: dv.getUint8(p + 8), duration: [750, 500, 250][dv.getUint8(p + 12)], autoAdvanceAfterMs: (showFlags & 0x400) ? dv.getUint32(p, true) : undefined, manualAdvance: !!(showFlags & 1), soundId: dv.getUint32(p + 4, true), soundEnabled: !!(showFlags & 16), loopSound: !!(showFlags & 64) };
            slide.hidden = !!(showFlags & 4);
        }
        if (slideExtras.animationRecordTypes.length && (hasModernTiming || diagnostics.slice(diagnosticStart).some(d => d.slideId === ref.id && d.severity === 'warning' && d.code.startsWith('ANIMATION_'))))
            slide.unsupportedRecordTypes = slideExtras.animationRecordTypes;
        if (atom && atom.length >= 20) {
            const noteId = dv.getUint32(atom.dataOffset + 16, true);
            if (noteId && notes.has(noteId))
                slide.notes = notes.get(noteId);
        }
        for (let i = diagnosticStart; i < diagnostics.length; i++)
            if (diagnostics[i].slideId == null)
                diagnostics[i].slideId = ref.id;
        return slide;
    }
    for (const ref of masterRefs)
        resolveMaster(ref.id);
    masters.sort((a, b) => a.index - b.index);
    // Notes text type 2 comes from the first main master, while its palette and
    // drawing defaults come from the separate notes-master persist object.
    notesMasterTextStyles = masterRefs[0] ? masterStyles.get(masterRefs[0].id) : defaultStyles;
    if (notesMasterPersistId) {
        if (!persist.objects.has(notesMasterPersistId))
            diagnostics.push({ code: 'NOTES_MASTER_MISSING', severity: 'warning', message: 'The notes master persist ID is missing', details: { persistId: notesMasterPersistId } });
        else if (object(notesMasterPersistId).type !== RT.Notes)
            diagnostics.push({ code: 'NOTES_MASTER_TYPE', severity: 'warning', message: 'The notes master persist ID does not refer to a NotesContainer', offset: object(notesMasterPersistId).offset });
        else
            notesMaster = parseOne({ persistId: notesMasterPersistId, id: 0, texts: [], textCount: 0 }, -1, true, true);
    }
    for (let i = 0; i < noteRefs.length; i++) {
        const note = parseOne(noteRefs[i], i);
        notes.set(note.id, frames(note.shapes));
    }
    const slides = slideRefs.map((ref, index) => parseOne(ref, index));
    if (slides.length === 0)
        diagnostics.push({ code: 'EMPTY_PRESENTATION', severity: 'info', message: 'The current document slide list is empty.' });
    // Each asset owns exactly its bytes, avoiding accidental transfer/retention of a full compound stream.
    let assetBytes = 0;
    for (const asset of pictureResult.assets) {
        if (!(asset.bytes.buffer instanceof ArrayBuffer) || asset.bytes.byteOffset !== 0 || asset.bytes.byteLength !== asset.bytes.buffer.byteLength)
            asset.bytes = new Uint8Array(asset.bytes);
        assetBytes += asset.bytes.length;
    }
    if (assetBytes > limits.maxAssetBytes)
        throw new PptError('LIMIT_ASSETS', 'Presentation exceeds the aggregate asset limit');
    return { format: 'ppt', version: VERSION, size, slides, masters, fonts, assets: pictureResult.assets, extras, diagnostics, metadata: { ...summary(cfb.getStream('\u0005SummaryInformation')), firstSlideNumber, omitTitlePlace, slideCount: slides.length, source: 'Microsoft PowerPoint 97–2003 binary format ([MS-PPT])' }, stats: { inputBytes: inputBytes.length, streamBytes: bytes.length + picturesBytes.length, recordCount: rc.count, shapeCount: shapeCount.value, parseTimeMs: now() - started, assetBytes } };
}
