import { n } from './safe.js';
/** Remap geometry coordinates, preserving CSS-pixel line widths under a custom path. */
export function mapPathToBounds(path, source, width, height) {
    const tokens = path.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
    const sx = source.width ? width / source.width : 1, sy = source.height ? height / source.height : 1;
    const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
    let command = '', position = 0;
    const out = [];
    for (const token of tokens) {
        if (/^[a-zA-Z]$/.test(token)) {
            command = token;
            position = 0;
            out.push(token);
            continue;
        }
        const upper = command.toUpperCase(), count = counts[upper];
        if (count == null || count === 0)
            return path;
        const relative = command !== upper, index = position++ % count, value = Number(token);
        let mapped = value;
        if (upper === 'A') {
            if (index === 0)
                mapped = value * Math.abs(sx);
            else if (index === 1)
                mapped = value * Math.abs(sy);
            else if (index === 5)
                mapped = (value - (relative ? 0 : source.x)) * sx;
            else if (index === 6)
                mapped = (value - (relative ? 0 : source.y)) * sy;
        }
        else if (upper === 'H')
            mapped = (value - (relative ? 0 : source.x)) * sx;
        else if (upper === 'V')
            mapped = (value - (relative ? 0 : source.y)) * sy;
        else
            mapped = index % 2 ? (value - (relative ? 0 : source.y)) * sy : (value - (relative ? 0 : source.x)) * sx;
        out.push(n(mapped));
    }
    return out.join(' ');
}
/** OfficeArt MSOSPT values; shapes with an explicit geometry path bypass these defaults. */
export function presetGeometry(preset, width, height, properties = {}) {
    const w = width, h = height, x = (p) => n(w * p), y = (p) => n(h * p);
    const path = (d, open = false) => ({ tag: 'path', attrs: `d="${d}"`, supported: true, open });
    const polygon = (pts) => path(`M${pts.map(p => `${x(p[0])} ${y(p[1])}`).join('L')}Z`);
    switch (preset ?? 1) {
        case 1:
        case 75:
        case 109:
        case 202: return { tag: 'rect', attrs: `width="${n(w)}" height="${n(h)}"`, supported: true };
        // Same source adjustment convention as msdoc-viewer's officeArtRoundRectRadius.
        case 2: return { tag: 'rect', attrs: `width="${n(w)}" height="${n(h)}" rx="${n(Math.min(w, h) * Math.max(0, Math.min(properties['327'] ?? 2592, 10800)) / 21600)}"`, supported: true };
        case 3: return { tag: 'ellipse', attrs: `cx="${x(.5)}" cy="${y(.5)}" rx="${x(.5)}" ry="${y(.5)}"`, supported: true };
        case 4: return polygon([[.5, 0], [1, .5], [.5, 1], [0, .5]]);
        case 5: return polygon([[.5, 0], [1, 1], [0, 1]]);
        case 6: return polygon([[0, 0], [1, 1], [0, 1]]);
        case 7: return polygon([[.2, 0], [1, 0], [.8, 1], [0, 1]]);
        case 8: return polygon([[.2, 0], [.8, 0], [1, 1], [0, 1]]);
        case 9: return polygon([[.25, 0], [.75, 0], [1, .5], [.75, 1], [.25, 1], [0, .5]]);
        case 10: return polygon([[.3, 0], [.7, 0], [1, .3], [1, .7], [.7, 1], [.3, 1], [0, .7], [0, .3]]);
        case 11: return polygon([[.333, 0], [.667, 0], [.667, .333], [1, .333], [1, .667], [.667, .667], [.667, 1], [.333, 1], [.333, .667], [0, .667], [0, .333], [.333, .333]]);
        case 12:
        case 58:
        case 59:
        case 60:
        case 92: {
            const count = preset === 58 ? 8 : preset === 59 ? 16 : preset === 60 ? 32 : preset === 92 ? 24 : 5;
            const points = [];
            for (let i = 0; i < count * 2; i++) {
                const a = -Math.PI / 2 + i * Math.PI / count, r = i % 2 ? .21 : .5;
                points.push([.5 + Math.cos(a) * r, .5 + Math.sin(a) * r]);
            }
            return polygon(points);
        }
        case 13: return polygon([[0, .25], [.75, .25], [.75, 0], [1, .5], [.75, 1], [.75, .75], [0, .75]]);
        case 14: return polygon([[0, .25], [.4, .25], [.4, 0], [1, .5], [.4, 1], [.4, .75], [0, .75], [.2, .5]]);
        case 15: return polygon([[0, 0], [.7, 0], [1, .5], [.7, 1], [0, 1]]);
        case 16: return path(`M${x(.2)} 0H${x(1)}V${y(.8)}L${x(.8)} ${y(1)}H0V${y(.2)}Z M0 ${y(.2)}H${x(.8)}V${y(1)} M${x(.8)} ${y(.2)}L${x(1)} 0`);
        case 17:
        case 61: return polygon([[0, 0], [1, 0], [1, .75], [.5, .75], [.25, 1], [.3, .75], [0, .75]]);
        case 22:
        case 132: return path(`M0 ${y(.12)}C0 ${y(-.04)} ${x(1)} ${y(-.04)} ${x(1)} ${y(.12)}V${y(.88)}C${x(1)} ${y(1.04)} 0 ${y(1.04)} 0 ${y(.88)}Z M0 ${y(.12)}C0 ${y(.28)} ${x(1)} ${y(.28)} ${x(1)} ${y(.12)}`);
        case 23: return { tag: 'path', attrs: `d="M${x(.5)} 0A${x(.5)} ${y(.5)} 0 1 1 ${x(.4999)} 0Z M${x(.5)} ${y(.25)}A${x(.25)} ${y(.25)} 0 1 1 ${x(.4999)} ${y(.25)}Z" fill-rule="evenodd"`, supported: true };
        case 19: return path(`M0 ${y(1)}A${n(w)} ${n(h)} 0 0 1 ${x(1)} 0`, true);
        case 20:
        case 32: return path(`M0 0L${n(w)} ${n(h)}`, true);
        case 33: return path(`M0 0H${n(w)}V${n(h)}`, true);
        case 34: return path(`M0 0H${x(.5)}V${n(h)}H${n(w)}`, true);
        case 35:
        case 36: return path(`M0 0H${x(.333)}V${y(.5)}H${x(.667)}V${n(h)}H${n(w)}`, true);
        case 37:
        case 38:
        case 39:
        case 40: return path(`M0 0C${x(.5)} 0 ${x(.5)} ${n(h)} ${n(w)} ${n(h)}`, true);
        case 55: return polygon([[0, 0], [.75, 0], [1, .5], [.75, 1], [0, 1], [.25, .5]]);
        case 56: return polygon([[.5, 0], [1, .382], [.809, 1], [.191, 1], [0, .382]]);
        case 64:
        case 122: return path(`M0 ${y(.15)}Q${x(.25)} 0 ${x(.5)} ${y(.15)}T${x(1)} ${y(.15)}L${x(1)} ${y(.85)}Q${x(.75)} ${y(1)} ${x(.5)} ${y(.85)}T0 ${y(.85)}Z`);
        case 65: return path(`M0 0H${n(w)}V${y(.8)}L${x(.8)} ${n(h)}H0Z M${n(w)} ${y(.8)}H${x(.8)}V${n(h)}`);
        case 66: return polygon([[1, .25], [.35, .25], [.35, 0], [0, .5], [.35, 1], [.35, .75], [1, .75]]);
        case 68: return polygon([[.25, 1], [.25, .35], [0, .35], [.5, 0], [1, .35], [.75, .35], [.75, 1]]);
        case 67: return polygon([[.25, 0], [.25, .65], [0, .65], [.5, 1], [1, .65], [.75, .65], [.75, 0]]);
        case 69: return polygon([[0, .5], [.25, 0], [.25, .3], [.75, .3], [.75, 0], [1, .5], [.75, 1], [.75, .7], [.25, .7], [.25, 1]]);
        case 70: return polygon([[.5, 0], [1, .25], [.7, .25], [.7, .75], [1, .75], [.5, 1], [0, .75], [.3, .75], [.3, .25], [0, .25]]);
        case 73: return polygon([[.4, 0], [.8, 0], [.6, .4], [1, .4], [.2, 1], [.4, .6], [0, .6]]);
        case 74: return path(`M${x(.5)} ${y(1)}C${x(.4)} ${y(.75)} 0 ${y(.5)} 0 ${y(.25)}C0 ${y(-.05)} ${x(.35)} ${y(-.1)} ${x(.5)} ${y(.2)}C${x(.65)} ${y(-.1)} ${x(1)} ${y(-.05)} ${x(1)} ${y(.25)}C${x(1)} ${y(.5)} ${x(.6)} ${y(.75)} ${x(.5)} ${y(1)}Z`);
        case 85: return path(`M${x(.15)} 0Q0 0 0 ${y(.2)}V${y(.8)}Q0 ${y(1)} ${x(.15)} ${y(1)}`, true);
        case 86: return path(`M${x(.85)} 0Q${x(1)} 0 ${x(1)} ${y(.2)}V${y(.8)}Q${x(1)} ${y(1)} ${x(.85)} ${y(1)}`, true);
        case 87: return path(`M${x(.8)} 0Q${x(.5)} 0 ${x(.5)} ${y(.2)}V${y(.35)}Q${x(.5)} ${y(.5)} 0 ${y(.5)}Q${x(.5)} ${y(.5)} ${x(.5)} ${y(.65)}V${y(.8)}Q${x(.5)} ${y(1)} ${x(.8)} ${y(1)}`, true);
        case 88: return path(`M${x(.2)} 0Q${x(.5)} 0 ${x(.5)} ${y(.2)}V${y(.35)}Q${x(.5)} ${y(.5)} ${x(1)} ${y(.5)}Q${x(.5)} ${y(.5)} ${x(.5)} ${y(.65)}V${y(.8)}Q${x(.5)} ${y(1)} ${x(.2)} ${y(1)}`, true);
        case 110: return polygon([[.5, 0], [1, .5], [.5, 1], [0, .5]]);
        case 111: return polygon([[.2, 0], [1, 0], [.8, 1], [0, 1]]);
        case 112: return path(`M0 0H${n(w)}V${n(h)}H0Z M${x(.15)} 0V${n(h)} M${x(.85)} 0V${n(h)}`);
        case 113: return path(`M0 0H${n(w)}V${n(h)}H0Z M${x(.15)} 0V${n(h)} M0 ${y(.15)}H${n(w)}`);
        case 114: return path(`M0 0H${n(w)}V${y(.85)}Q${x(.75)} ${y(.65)} ${x(.5)} ${y(.85)}T0 ${y(.85)}Z`);
        case 116:
        case 176: return { tag: 'rect', attrs: `width="${n(w)}" height="${n(h)}" rx="${n(Math.min(w, h) * .5)}"`, supported: true };
        case 117: return polygon([[.2, 0], [.8, 0], [1, .5], [.8, 1], [.2, 1], [0, .5]]);
        case 118: return polygon([[0, .2], [1, 0], [1, 1], [0, 1]]);
        case 119: return polygon([[0, 0], [1, 0], [.8, 1], [.2, 1]]);
        case 120: return { tag: 'ellipse', attrs: `cx="${x(.5)}" cy="${y(.5)}" rx="${x(.5)}" ry="${y(.5)}"`, supported: true };
        case 121: return polygon([[.25, 0], [1, 0], [1, 1], [0, 1], [0, .25]]);
        case 125: return polygon([[0, 0], [1, 0], [0, 1], [1, 1]]);
        case 126: return path(`M${x(.5)} 0L${x(1)} ${y(.5)}L${x(.5)} ${y(1)}L0 ${y(.5)}Z M0 ${y(.5)}H${n(w)}`);
        case 127: return polygon([[.5, 0], [1, 1], [0, 1]]);
        case 128: return polygon([[0, 0], [1, 0], [.5, 1]]);
        case 135: return path(`M0 0H${x(.5)}A${x(.5)} ${y(.5)} 0 0 1 ${x(.5)} ${y(1)}H0Z`);
        case 177: return polygon([[0, 0], [1, 0], [1, .6], [.5, 1], [0, .6]]);
        default: return { tag: 'rect', attrs: `width="${n(w)}" height="${n(h)}"`, supported: false };
    }
}
