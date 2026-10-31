import { walkRecords } from './records.js';
const relative = ['#pptjs-next', '#pptjs-previous', '#pptjs-first', '#pptjs-last'];
/** MS-PPT 2.6.10, 2.13.13–15; no executable actions are promoted to links. */
export function interactionHref(record, bytes, targets) {
    if (record.type !== 0x0ff3 || record.length !== 16)
        return undefined;
    const v = new DataView(bytes.buffer, bytes.byteOffset + record.dataOffset, 16), id = v.getUint32(4, true), action = v.getUint8(8), jump = v.getUint8(10), type = v.getUint8(12);
    if (action === 3) {
        if (jump >= 1 && jump <= 4)
            return relative[jump - 1];
        if (jump === 5)
            return '#pptjs-back';
        if (jump === 6)
            return '#pptjs-end';
        return undefined;
    }
    if (action === 4) {
        if (type <= 3)
            return relative[type];
        if (type === 7 || type === 8)
            return targets?.get(id);
    }
    return undefined;
}
/** PowerPoint stores its slide locator in LocationAtom as ID,number,title.
 * The stable ID wins over the stale displayed number after a slide reorder.
 * Unknown locator strings stay metadata; never reinterpret another-file targets.
 */
export function resolveSlideLinks(links, slides, targets, diagnostics) {
    const byId = new Map(slides.map((s, index) => [s.id, index]));
    const unresolved = new Map();
    for (const diagnostic of diagnostics)
        if (diagnostic.code === 'INTERNAL_LINK_UNRESOLVED' && diagnostic.offset !== undefined && !unresolved.has(diagnostic.offset))
            unresolved.set(diagnostic.offset, diagnostic);
    for (const link of links) {
        if (link.target.trim() || !link.location)
            continue;
        const text = link.location.trim();
        let index;
        const location = /^(\d+),(\d+),(.*)$/s.exec(text);
        if (location) {
            const id = Number(location[1]), number = Number(location[2]);
            index = byId.get(id);
            if (index === undefined && id === 0 && number >= 1 && number <= slides.length)
                index = number - 1;
        }
        else if (/^\d+$/.test(text)) {
            const value = Number(text);
            index = byId.get(value);
            if (index === undefined && value >= 1 && value <= slides.length)
                index = value - 1;
        }
        if (index === undefined)
            continue;
        const href = `#pptjs-slide=${index}`;
        link.href = href;
        link.blocked = false;
        targets.set(link.id, href);
        const prior = unresolved.get(link.sourceOffset);
        if (prior) {
            prior.code = 'INTERNAL_LINK_RESOLVED';
            prior.severity = 'info';
            prior.message = 'Internal hyperlink resolved against the current slide order';
            prior.details = { slideIndex: index, slideId: slides[index].id };
        }
    }
}
/** Bind shape actions and embedded sounds to their document-owned asset IDs. */
export function bindShapeInteractions(records, bytes, shapes, extras, targets, diagnostics, slideId) {
    const byOffset = new Map();
    for (const r of walkRecords(records))
        byOffset.set(r.offset, r);
    const mediaById = new Map(extras.media.map(m => [m.id, m])), soundById = new Map(extras.sounds.map(s => [s.id, s]));
    const visit = (items) => {
        for (const shape of items) {
            if (shape.children)
                visit(shape.children);
            const node = shape.source ? byOffset.get(shape.source.offset) : undefined;
            const clients = node?.children.filter(n => n.type === 0xf011) ?? [];
            for (const client of clients) {
                const click = client.children.find(r => r.type === 0x0ff2 && r.instance === 0), atom = click?.children.find(r => r.type === 0x0ff3);
                if (atom) {
                    shape.hyperlink = interactionHref(atom, bytes, targets);
                    if (!shape.hyperlink && atom.length >= 16) {
                        const action = bytes[atom.dataOffset + 8];
                        if (action && action !== 6)
                            diagnostics.push({ code: 'INTERACTION_UNSUPPORTED', severity: 'warning', message: 'The source click action is retained as metadata and has no preview action', slideId, shapeId: shape.id, offset: atom.offset, details: { action } });
                    }
                }
                const ref = client.children.find(r => r.type === 3009);
                if (!ref || ref.length < 4)
                    continue;
                const id = new DataView(bytes.buffer, bytes.byteOffset + ref.dataOffset, 4).getUint32(0, true), media = mediaById.get(id);
                if (!media)
                    continue;
                const sound = media.soundId === undefined ? undefined : soundById.get(media.soundId);
                shape.media = { mediaId: id, kind: media.kind, assetId: sound?.assetId, posterAssetId: shape.image?.assetId, loop: media.loop };
                if (!sound?.assetId)
                    diagnostics.push({ code: 'MEDIA_SOURCE_UNAVAILABLE', severity: 'warning', message: 'The media source is external or has no supported embedded payload', slideId, shapeId: shape.id, offset: ref.offset, details: { mediaId: id } });
            }
        }
    };
    visit(shapes);
}
