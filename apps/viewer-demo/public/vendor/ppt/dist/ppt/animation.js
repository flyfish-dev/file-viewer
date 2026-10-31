import { walkRecords } from './records.js';
/** MS-PPT 2.8.2 legacy whole-object builds. Modern TimeNode trees take precedence. */
export function parseLegacyAnimations(records, bytes, shapes, diagnostics, slideId, hasModernTiming = false) {
    if (hasModernTiming) {
        diagnostics.push({ code: 'ANIMATION_MODERN_TIMING_UNSUPPORTED', severity: 'warning', message: 'The modern binary TimeNode tree is retained but is not executed; a legacy fallback is not substituted for its effects', slideId });
        return [];
    }
    const byOffset = new Map();
    for (const record of walkRecords(records))
        byOffset.set(record.offset, record);
    const result = [];
    const warning = (code, message, shape, offset, details) => diagnostics.push({ code, severity: code === 'ANIMATION_DURATION_DEFAULT' ? 'info' : 'warning', message, shapeId: shape.id, slideId, offset, details });
    const visit = (list) => {
        for (const shape of list) {
            if (shape.children)
                visit(shape.children);
            const node = shape.source ? byOffset.get(shape.source.offset) : undefined, client = node?.children.find(r => r.type === 0xF011);
            if (!client)
                continue;
            const atom = [...walkRecords(client.children)].find(r => r.type === 0x0FF1);
            if (!atom)
                continue;
            if (atom.length !== 28 || atom.version !== 1) {
                warning('ANIMATION_ATOM_INVALID', 'Legacy animation atom has an invalid version or payload size', shape, atom.offset);
                continue;
            }
            const v = new DataView(bytes.buffer, bytes.byteOffset + atom.dataOffset, 28), flags = v.getUint32(4, true), order = v.getInt16(16, true), build = v.getUint8(20), kind = v.getUint8(21), direction = v.getUint8(22), after = v.getUint8(23), sub = v.getUint8(24), automatic = (flags >>> 2 & 3) === 1;
            if (build === 0)
                continue;
            if ([0, 2, 4, 6, 8, 10, 12, 14].some(shift => (flags >>> shift & 3) > 1)) {
                warning('ANIMATION_FLAG_INVALID', 'A legacy animation two-bit Boolean contains an invalid value', shape, atom.offset);
                continue;
            }
            if (build !== 1 || order < 0 || sub !== 0 || (flags & 3) !== 0) {
                warning('ANIMATION_BUILD_UNSUPPORTED', 'Only forward, whole-object legacy builds with explicit ordering are mapped', shape, atom.offset, { build, order, subEffect: sub, reverse: flags & 3 });
                continue;
            }
            if (shape.text && !shape.wordArt && (flags >>> 14 & 3) !== 1 && (shape.fill.kind !== 'none' || (shape.line?.width ?? 0) > 0)) {
                warning('ANIMATION_TEXT_ONLY_UNSUPPORTED', 'This legacy build animates text independently of its visible shape background', shape, atom.offset);
                continue;
            }
            let effect;
            const base = { targetShapeId: shape.id, phase: 'entrance', trigger: automatic ? 'afterPrevious' : 'click', delayMs: automatic ? Math.max(0, v.getInt32(12, true)) : 0, durationMs: 500 };
            if (kind === 0 && (direction === 0 || direction === 2))
                effect = { ...base, kind: 'appear', durationMs: 0 };
            else if (kind === 6 && direction === 0)
                effect = { ...base, kind: 'fade' };
            else if (kind === 12 && direction <= 3)
                effect = { ...base, kind: 'fly', direction: ['left', 'up', 'right', 'down'][direction] };
            else if (kind === 12 && direction >= 16 && direction <= 19)
                effect = { ...base, kind: 'zoom', fromScale: [0, .5, 4, 1.5][direction - 16], toScale: 1 };
            if (!effect) {
                warning('ANIMATION_EFFECT_UNSUPPORTED', 'The legacy animation effect or direction is retained but has no playback mapping', shape, atom.offset, { effect: kind, direction });
                continue;
            }
            result.push({ order, effect });
            if (effect.durationMs)
                warning('ANIMATION_DURATION_DEFAULT', 'The legacy record has no duration; this viewer uses a 500 ms application default', shape, atom.offset, { durationMs: 500 });
            if (after !== 0)
                warning('ANIMATION_AFTER_EFFECT_UNSUPPORTED', 'The legacy after-effect is not applied by the supported playback subset', shape, atom.offset, { afterEffect: after });
            if ((flags >>> 4 & 3) === 1 || (flags >>> 6 & 3) === 1)
                warning('ANIMATION_SOUND_MANUAL', 'Animation sound commands are retained; embedded media playback requires a user gesture', shape, atom.offset, { soundId: v.getUint32(8, true) });
        }
    };
    visit(shapes);
    return result.sort((a, b) => a.order - b.order).map(item => item.effect);
}
