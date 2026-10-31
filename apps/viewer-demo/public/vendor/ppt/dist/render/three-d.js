import { mapPathToBounds, presetGeometry } from './geometry.js';
import { color, finite, n } from './safe.js';
const rad = Math.PI / 180;
/** Bounded SVG path flattening, including endpoint-parameterized elliptical arcs. */
export function flattenPath(path, maxPoints = 4096) {
    const tokens = [];
    for (const match of path.matchAll(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)) {
        if (tokens.length > 100000)
            throw new RangeError('Path token limit');
        tokens.push(match[0]);
    }
    const contours = [];
    let current, point = { x: 0, y: 0 }, start = point, control, previous = '', command = '', at = 0, count = 0;
    const add = (p) => { if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || ++count > maxPoints)
        throw new RangeError('Path point limit'); if (!current) {
        current = { points: [], closed: false };
        contours.push(current);
    } current.points.push(p); point = p; };
    const read = () => { const value = Number(tokens[at++]); if (!Number.isFinite(value))
        throw new RangeError('Invalid path coordinate'); return value; };
    const counts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };
    while (at < tokens.length) {
        if (/^[a-zA-Z]$/.test(tokens[at]))
            command = tokens[at++];
        const upper = command.toUpperCase(), relative = command !== upper;
        if (upper === 'Z') {
            if (current) {
                current.closed = true;
                point = start;
            }
            current = undefined;
            control = undefined;
            previous = upper;
            command = '';
            continue;
        }
        const need = counts[upper];
        if (need == null || at + need > tokens.length)
            throw new RangeError('Invalid SVG path');
        const origin = point, coords = [];
        const xy = () => ({ x: read() + (relative ? origin.x : 0), y: read() + (relative ? origin.y : 0) });
        if (upper === 'M') {
            point = xy();
            current = { points: [], closed: false };
            contours.push(current);
            start = point;
            add(point);
            command = relative ? 'l' : 'L';
        }
        else if (upper === 'L')
            add(xy());
        else if (upper === 'H')
            add({ x: read() + (relative ? origin.x : 0), y: origin.y });
        else if (upper === 'V')
            add({ x: origin.x, y: read() + (relative ? origin.y : 0) });
        else if (upper === 'C' || upper === 'S') {
            const c1 = upper === 'C' ? xy() : previous === 'C' || previous === 'S' ? { x: 2 * origin.x - (control?.x ?? origin.x), y: 2 * origin.y - (control?.y ?? origin.y) } : origin, c2 = xy(), end = xy();
            for (let i = 1; i <= 16; i++) {
                const t = i / 16, s = 1 - t;
                coords.push({ x: s * s * s * origin.x + 3 * s * s * t * c1.x + 3 * s * t * t * c2.x + t * t * t * end.x, y: s * s * s * origin.y + 3 * s * s * t * c1.y + 3 * s * t * t * c2.y + t * t * t * end.y });
            }
            coords.forEach(add);
            control = c2;
        }
        else if (upper === 'Q' || upper === 'T') {
            const c = upper === 'Q' ? xy() : previous === 'Q' || previous === 'T' ? { x: 2 * origin.x - (control?.x ?? origin.x), y: 2 * origin.y - (control?.y ?? origin.y) } : origin, end = xy();
            for (let i = 1; i <= 16; i++) {
                const t = i / 16, s = 1 - t;
                add({ x: s * s * origin.x + 2 * s * t * c.x + t * t * end.x, y: s * s * origin.y + 2 * s * t * c.y + t * t * end.y });
            }
            control = c;
        }
        else if (upper === 'A') {
            let rx = Math.abs(read()), ry = Math.abs(read());
            const angle = read() * rad, large = read() !== 0, sweep = read() !== 0, end = xy();
            if (!rx || !ry || origin.x === end.x && origin.y === end.y)
                add(end);
            else {
                const cos = Math.cos(angle), sin = Math.sin(angle), dx = (origin.x - end.x) / 2, dy = (origin.y - end.y) / 2, xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
                const scale = xp * xp / (rx * rx) + yp * yp / (ry * ry);
                if (scale > 1) {
                    rx *= Math.sqrt(scale);
                    ry *= Math.sqrt(scale);
                }
                const q = Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp) / (rx * rx * yp * yp + ry * ry * xp * xp))) * (large === sweep ? -1 : 1);
                const cxp = q * rx * yp / ry, cyp = -q * ry * xp / rx, cx = cos * cxp - sin * cyp + (origin.x + end.x) / 2, cy = sin * cxp + cos * cyp + (origin.y + end.y) / 2;
                const a0 = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx), a1 = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx);
                let delta = a1 - a0;
                if (sweep && delta < 0)
                    delta += Math.PI * 2;
                if (!sweep && delta > 0)
                    delta -= Math.PI * 2;
                const steps = Math.max(1, Math.ceil(Math.abs(delta) * 16 / Math.PI));
                for (let i = 1; i <= steps; i++) {
                    const a = a0 + delta * i / steps;
                    add({ x: cx + cos * rx * Math.cos(a) - sin * ry * Math.sin(a), y: cy + sin * rx * Math.cos(a) + cos * ry * Math.sin(a) });
                }
            }
        }
        if (!['C', 'S', 'Q', 'T'].includes(upper))
            control = undefined;
        previous = upper;
    }
    return contours;
}
function shapePath(shape) {
    const w = shape.bounds.width, h = shape.bounds.height;
    if (shape.path)
        return mapPathToBounds(shape.path, shape.pathBounds ?? { x: 0, y: 0, width: w, height: h }, w, h);
    const geometry = presetGeometry(shape.preset, w, h, shape.source?.properties);
    if (geometry.tag === 'path')
        return /\bd="([^"]*)"/.exec(geometry.attrs)?.[1] ?? '';
    if (geometry.tag === 'ellipse')
        return `M${w} ${h / 2} A${w / 2} ${h / 2} 0 1 1 0 ${h / 2} A${w / 2} ${h / 2} 0 1 1 ${w} ${h / 2} Z`;
    const rx = Number(/\brx="([^"]*)"/.exec(geometry.attrs)?.[1] ?? 0);
    return rx ? `M${rx} 0 H${w - rx} A${rx} ${rx} 0 0 1 ${w} ${rx} V${h - rx} A${rx} ${rx} 0 0 1 ${w - rx} ${h} H${rx} A${rx} ${rx} 0 0 1 0 ${h - rx} V${rx} A${rx} ${rx} 0 0 1 ${rx} 0 Z` : `M0 0 H${w} V${h} H0 Z`;
}
class ExtrusionCameraError extends RangeError {
}
function extrusionProjector(e, width, height) {
    const yr = finite(e.rotationY) * rad, xr = finite(e.rotationX) * rad, cy = Math.cos(yr), sy = Math.sin(yr), cx = Math.cos(xr), sx = Math.sin(xr);
    const skew = e.skewAngle === 0 ? 0 : finite(e.skewAmount) / 100, kx = Math.cos(finite(e.skewAngle) * rad) * skew, ky = Math.sin(finite(e.skewAngle) * rad) * skew;
    const rotate = (point) => {
        const x = point.x - width / 2, y = point.y - height / 2, x1 = x * cy + point.z * sy, z1 = -x * sy + point.z * cy;
        return { x: width / 2 + x1, y: height / 2 + y * cx - z1 * sx, z: y * sx + z1 * cx };
    };
    let camera;
    if (!e.parallel) {
        if (!e.camera || ![e.camera.x, e.camera.y, e.camera.z].every(Number.isFinite) || e.camera.z <= 0)
            throw new ExtrusionCameraError('Perspective camera is missing or has a nonpositive distance');
        camera = { x: width / 2 + finite(e.origin?.x, .5) * width + e.camera.x, y: height / 2 + finite(e.origin?.y, -.5) * height + e.camera.y, z: e.camera.z };
    }
    const project = (point) => {
        const p = rotate(point);
        if (!camera)
            return { x: p.x + p.z * kx, y: p.y + p.z * ky, z: p.z };
        const distance = camera.z - p.z;
        if (distance <= Math.max(1e-6, camera.z * 1e-6))
            throw new ExtrusionCameraError('Perspective extrusion crosses the camera plane');
        const scale = camera.z / distance;
        return { x: camera.x + (p.x - camera.x) * scale, y: camera.y + (p.y - camera.y) * scale, z: p.z };
    };
    return { rotate, project, view: p => camera ? { x: camera.x - p.x, y: camera.y - p.y, z: camera.z - p.z } : { x: -kx, y: -ky, z: 1 } };
}
/** Constrained Y-then-X rotation followed by the selected projection. */
export function projectExtrusionPoint(point, e, width, height) {
    return extrusionProjector(e, width, height).project(point);
}
/** Closed contours produce true side quads; the original vector painting is the front face. */
export function buildExtrusionMesh(shape) {
    const e = shape.extrusion;
    if (!e)
        return undefined;
    const w = finite(shape.bounds.width), h = finite(shape.bounds.height), contours = flattenPath(shapePath(shape)), faces = [];
    const projector = extrusionProjector(e, w, h), project = (p, z) => projector.project({ ...p, z }), rotate = (p, z) => projector.rotate({ ...p, z }), forward = Math.max(0, finite(e.forward)), back = -Math.max(0, finite(e.depth));
    for (const contour of contours) {
        if (!contour.closed || contour.points.length < 3)
            continue;
        const points = contour.points, orientation = contours.length === 1 && points.reduce((area, a, i) => { const b = points[(i + 1) % points.length]; return area + a.x * b.y - b.x * a.y; }, 0) < 0 ? -1 : 1;
        for (let i = 0; i < points.length; i++) {
            const a = points[i], b = points[(i + 1) % points.length];
            if (a.x === b.x && a.y === b.y)
                continue;
            const p = [project(a, back), project(b, back), project(b, forward), project(a, forward)];
            // Projection changes screen-space slopes, not physical surface normals.
            const r0 = rotate(a, back), r1 = rotate(b, back), r3 = rotate(a, forward), ux = r1.x - r0.x, uy = r1.y - r0.y, uz = r1.z - r0.z, vx = r3.x - r0.x, vy = r3.y - r0.y, vz = r3.z - r0.z;
            const nx = (uy * vz - uz * vy) * orientation, ny = (uz * vx - ux * vz) * orientation, nz = (ux * vy - uy * vx) * orientation, length = Math.hypot(nx, ny, nz) || 1, light = Math.max(0, (-.4 * nx - .6 * ny + nz) / (length * Math.sqrt(1.52)));
            const intensity = Math.max(0, Math.min(1, finite(e.ambient, .3) + finite(e.diffuse, 1) * light));
            const view = projector.view({ x: r0.x + (ux + vx) / 2, y: r0.y + (uy + vy) / 2, z: r0.z + (uz + vz) / 2 });
            faces.push({ points: p, depth: p.reduce((sum, q) => sum + q.z, 0) / 4, intensity, visible: contours.length > 1 || nx * view.x + ny * view.y + nz * view.z > 1e-8 });
        }
    }
    faces.sort((a, b) => a.depth - b.depth);
    const dx = w || 1, dy = h || 1, p = project({ x: 0, y: 0 }, forward), x = project({ x: dx, y: 0 }, forward), y = project({ x: 0, y: dy }, forward);
    return { faces, frontMatrix: [(x.x - p.x) / dx, (x.y - p.y) / dx, (y.x - p.x) / dy, (y.y - p.y) / dy, p.x, p.y], contours };
}
function litColor(value, intensity) {
    const safe = color(value, '#808080');
    let rgb = safe.slice(1);
    if (rgb.length === 3)
        rgb = rgb.split('').map(v => v + v).join('');
    if (!/^[\da-f]{6,8}$/i.test(rgb))
        return '#808080';
    return '#' + [0, 2, 4].map(i => Math.round(parseInt(rgb.slice(i, i + 2), 16) * intensity).toString(16).padStart(2, '0')).join('');
}
export function renderExtrusion(shape, frontMarkup, ctx) {
    const e = shape.extrusion;
    if (!e || e.depth + e.forward <= 0)
        return frontMarkup;
    const warning = (code, message) => ctx.warnings?.push({ code, severity: 'warning', message, shapeId: shape.id, slideId: ctx.slideId });
    if (shape.wordArt) {
        warning('WORDART_EXTRUSION_UNSUPPORTED', 'WordArt envelope is rendered, but glyph contour extrusion requires font outline data');
        return frontMarkup;
    }
    let mesh;
    try {
        mesh = buildExtrusionMesh(shape);
    }
    catch (error) {
        if (error instanceof ExtrusionCameraError)
            warning('EXTRUSION_CAMERA_UNSUPPORTED', error.message + '; the saved foreground is retained');
        else
            warning('EXTRUSION_PATH_LIMIT', 'Extrusion contour is invalid or exceeds its 4,096-point rendering limit');
        return frontMarkup;
    }
    if (!mesh || !mesh.faces.length) {
        warning('EXTRUSION_OPEN_CONTOUR', '3D extrusion requires a supported closed shape contour');
        return frontMarkup;
    }
    if (!e.parallel && (e.rotationX !== 0 || e.rotationY !== 0))
        warning('EXTRUSION_PERSPECTIVE_APPROXIMATED', 'Rotated perspective side faces use the saved camera; the projective front plane uses a three-corner affine approximation');
    if (e.metallic)
        warning('EXTRUSION_MATERIAL_APPROXIMATED', 'Metallic material uses diffuse vector shading; specular highlights are not reproduced');
    if (mesh.contours.length > 1)
        warning('EXTRUSION_COMPLEX_CONTOUR_APPROXIMATED', 'Compound extrusion contours use sorted side faces; exact hidden-surface removal is not implemented');
    const c = ctx.resolveColor(e.color, e.colorIndex, shape.fill.color ?? '#808080');
    const sides = mesh.faces.filter(face => face.visible).map(face => `<polygon points="${face.points.map(p => `${n(p.x)},${n(p.y)}`).join(' ')}" fill="${litColor(c, face.intensity)}" stroke="${litColor(c, face.intensity)}" stroke-width=".25" stroke-linejoin="round"/>`).join('');
    return `<g data-ppt-extrusion="mesh">${sides}<g transform="matrix(${mesh.frontMatrix.map(n).join(' ')})">${frontMarkup}</g></g>`;
}
