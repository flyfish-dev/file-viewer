/** An OfficeArt complex array includes its six-byte IMsoArray header. */
export function officeArray(bytes) {
    if (bytes.length < 6)
        return undefined;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint16(0, true), rawSize = view.getUint16(4, true), size = rawSize === 0xFFF0 ? 4 : rawSize;
    if (!size || count > view.getUint16(2, true) || 6 + count * size > bytes.length)
        return undefined;
    return { view, count, size };
}
/** Evaluate the 17 SG operations; references are limited to preceding guides. */
export function evaluateGuides(bytes, values, geometry, bounds) {
    const arr = officeArray(bytes);
    if (!arr || arr.size !== 8 || arr.count > 128)
        return undefined;
    const guides = [], rad = Math.PI / (180 * 65536);
    const reference = (n) => {
        if (n >= 0x400 && n <= 0x47F)
            return guides[n - 0x400];
        if (n >= 327 && n <= 334)
            return (values.get(n) ?? 0) | 0;
        if (n === 339 || n === 340)
            return (values.get(n) ?? 0x80000000) | 0;
        switch (n) {
            case 320: return geometry.x + geometry.width / 2;
            case 321: return geometry.y + geometry.height / 2;
            case 322: return geometry.width;
            case 323: return geometry.height;
            case 508: {
                const b = values.get(511);
                return b !== undefined && (b & 0x80000) ? (b & 8 ? 1 : 0) : 1;
            }
            case 1271: return (values.get(0x01CB) ?? 9525) / 9525;
            case 1272: return bounds?.width;
            case 1273: return bounds?.height;
            case 1276: return bounds ? bounds.width * 9525 : undefined;
            case 1277: return bounds ? bounds.height * 9525 : undefined;
            case 1278: return bounds ? bounds.width * 9525 / 2 : undefined;
            case 1279: return bounds ? bounds.height * 9525 / 2 : undefined;
            default: return undefined;
        }
    };
    for (let i = 0; i < arr.count; i++) {
        const at = 6 + i * 8, flags = arr.view.getUint16(at, true), params = [];
        for (let p = 0; p < 3; p++) {
            const raw = arr.view.getUint16(at + 2 + p * 2, true), value = flags & (1 << (13 + p)) ? reference(raw) : raw;
            if (value === undefined)
                return undefined;
            params.push(value);
        }
        const [a, b, c] = params;
        let result;
        switch (flags & 0x1FFF) {
            case 0:
                result = a + b - c;
                break;
            case 1:
                result = a * b / c;
                break;
            case 2:
                result = (a + b) / 2;
                break;
            case 3:
                result = Math.abs(a);
                break;
            case 4:
                result = Math.min(a, b);
                break;
            case 5:
                result = Math.max(a, b);
                break;
            case 6:
                result = a > 0 ? b : c;
                break;
            case 7:
                result = Math.hypot(a, b, c);
                break;
            case 8:
                result = Math.atan2(b, a) / rad;
                break;
            case 9:
                result = a * Math.sin(b * rad);
                break;
            case 10:
                result = a * Math.cos(b * rad);
                break;
            case 11:
                result = a * Math.cos(Math.atan2(c, b));
                break;
            case 12:
                result = a * Math.sin(Math.atan2(c, b));
                break;
            case 13:
                result = Math.sqrt(a);
                break;
            case 14:
                result = a + (b + c) * 65536;
                break;
            case 15:
                result = c * Math.sqrt(1 - (a / b) ** 2);
                break;
            case 16:
                result = a * Math.tan(b * rad);
                break;
            default: return undefined;
        }
        if (!Number.isFinite(result))
            return undefined;
        guides.push(result);
    }
    return guides;
}
/** Stored vertices, SG guides, common path opcodes and elliptical arc escapes. */
export function customGeometry(values, complex, diagnostics, shapeId, offset, bounds) {
    const raw = complex.get(325);
    if (!raw)
        return {};
    const arr = officeArray(raw);
    if (!arr || arr.size !== 4 && arr.size !== 8) {
        diagnostics.push({ code: 'GEOMETRY_VERTICES', severity: 'warning', message: 'Invalid OfficeArt vertices array', shapeId, offset });
        return {};
    }
    const left = (values.get(320) ?? 0) | 0, top = (values.get(321) ?? 0) | 0;
    const right = (values.get(322) ?? 21600) | 0, bottom = (values.get(323) ?? 21600) | 0;
    const pathBounds = { x: left, y: top, width: right - left || 21600, height: bottom - top || 21600 };
    const recoverX = right === left, recoverY = bottom === top, recover = recoverX || recoverY;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const include = (p) => { if (recover) {
        minX = Math.min(minX, p[0]);
        maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
    } };
    const guidesBytes = complex.get(342), guides = guidesBytes ? evaluateGuides(guidesBytes, values, pathBounds, bounds) : undefined;
    const resolveCoordinate = (n) => n >= -2147483648 && n <= -2147483521 ? guides?.[n + 0x80000000] : n;
    const points = [];
    for (let i = 0; i < arr.count; i++) {
        const p = 6 + i * arr.size;
        const x = resolveCoordinate(arr.size === 4 ? arr.view.getInt16(p, true) : arr.view.getInt32(p, true));
        const y = resolveCoordinate(arr.size === 4 ? arr.view.getInt16(p + 2, true) : arr.view.getInt32(p + 4, true));
        if (x === undefined || y === undefined) {
            diagnostics.push({ code: 'GEOMETRY_GUIDE', severity: 'warning', message: 'Custom path references an invalid or unsupported formula guide', shapeId, offset });
            return {};
        }
        points.push([x, y]);
    }
    if (!points.length)
        return {};
    const segBytes = complex.get(326), segments = segBytes ? officeArray(segBytes) : undefined;
    if (segBytes && !segments) {
        diagnostics.push({ code: 'GEOMETRY_SEGMENTS', severity: 'warning', message: 'Invalid OfficeArt segment array; custom path is not guessed from vertices alone', shapeId, offset });
        return {};
    }
    let parts = [];
    let index = 0, noFill = false, noLine = false, valid = true;
    const pathParts = [];
    let current, start;
    const finish = () => {
        if (parts.length)
            pathParts.push({ path: parts.join(' '), noFill, noLine });
        parts = [];
        noFill = false;
        noLine = false;
        current = undefined;
        start = undefined;
    };
    const next = () => { const p = points[index++]; if (!p) {
        valid = false;
        return [0, 0];
    } return p; };
    const format = (p) => `${Math.round(p[0] * 1e6) / 1e6} ${Math.round(p[1] * 1e6) / 1e6}`;
    const point = () => { current = next(); include(current); return format(current); };
    const begin = (p, connect = false) => {
        if (connect && current)
            parts.push(`L${format(p)}`);
        else {
            parts.push(`M${format(p)}`);
            start = p;
        }
        current = p;
        include(p);
    };
    const cubic = () => {
        const a = next(), b = next(), end = next(), origin = current;
        if (!origin) {
            valid = false;
            return;
        }
        include(end);
        if (recover)
            for (let axis = 0; axis < 2; axis++) {
                const p0 = origin[axis], p1 = a[axis], p2 = b[axis], p3 = end[axis], aa = -p0 + 3 * p1 - 3 * p2 + p3, bb = 2 * (p0 - 2 * p1 + p2), cc = p1 - p0;
                const discriminant = bb * bb - 4 * aa * cc;
                const roots = Math.abs(aa) < 1e-12 ? (Math.abs(bb) > 1e-12 ? [-cc / bb] : []) : discriminant >= 0 ? [(-bb - Math.sqrt(discriminant)) / (2 * aa), (-bb + Math.sqrt(discriminant)) / (2 * aa)] : [];
                for (const t of roots)
                    if (t > 0 && t < 1) {
                        const s = 1 - t;
                        include([s * s * s * origin[0] + 3 * s * s * t * a[0] + 3 * s * t * t * b[0] + t * t * t * end[0], s * s * s * origin[1] + 3 * s * s * t * a[1] + 3 * s * t * t * b[1] + t * t * t * end[1]]);
                    }
            }
        parts.push(`C${format(a)} ${format(b)} ${format(end)}`);
        current = end;
    };
    const arc = (escape, count) => {
        if (escape >= 3 && escape <= 6) {
            if (count % 4) {
                valid = false;
                return;
            }
            for (let j = 0; j < count / 4; j++) {
                const p0 = next(), p1 = next(), a = next(), b = next(), cx = (p0[0] + p1[0]) / 2, cy = (p0[1] + p1[1]) / 2, rx = Math.abs(p1[0] - p0[0]) / 2, ry = Math.abs(p1[1] - p0[1]) / 2;
                if (!rx || !ry) {
                    valid = false;
                    return;
                }
                const t0 = Math.atan2((a[1] - cy) / ry, (a[0] - cx) / rx), t1 = Math.atan2((b[1] - cy) / ry, (b[0] - cx) / rx);
                const start = [cx + rx * Math.cos(t0), cy + ry * Math.sin(t0)], end = [cx + rx * Math.cos(t1), cy + ry * Math.sin(t1)];
                const clockwise = escape >= 5, sweep = clockwise ? 1 : 0, tau = Math.PI * 2, delta = ((clockwise ? t1 - t0 : t0 - t1) % tau + tau) % tau;
                begin(start, escape === 3 || escape === 5);
                include(end);
                if (recover)
                    for (let k = 0; k < 4; k++) {
                        const angle = k * Math.PI / 2, distance = ((clockwise ? angle - t0 : t0 - angle) % tau + tau) % tau;
                        if (delta < 1e-9 || distance <= delta + 1e-9)
                            include([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
                    }
                if (delta < 1e-9) {
                    const middle = [2 * cx - start[0], 2 * cy - start[1]];
                    parts.push(`A${rx} ${ry} 0 0 ${sweep} ${format(middle)}`);
                    parts.push(`A${rx} ${ry} 0 0 ${sweep} ${format(end)}`);
                }
                else
                    parts.push(`A${rx} ${ry} 0 ${delta > Math.PI ? 1 : 0} ${sweep} ${format(end)}`);
                current = end;
            }
        }
        else if (escape === 7 || escape === 8) {
            for (let j = 0; j < count; j++) {
                if (!current) {
                    valid = false;
                    return;
                }
                const end = next(), dx = end[0] - current[0], dy = end[1] - current[1];
                const sweep = escape === 7 ? (dx * dy > 0 ? 1 : 0) : (dx * dy < 0 ? 1 : 0);
                if (dx === 0 || dy === 0)
                    parts.push(`L${format(end)}`);
                else
                    parts.push(`A${Math.abs(dx)} ${Math.abs(dy)} 0 0 ${sweep} ${format(end)}`);
                current = end;
                include(end);
            }
        }
        else if (escape === 9) {
            // A quadratic chain contains control points followed by one terminal point.
            // Consecutive off-curve controls have an implicit midpoint, as documented
            // for Microsoft's VML quadraticbezier command and MS-ODRAW's escape 9.
            if (count < 2 || index + count > points.length) {
                valid = false;
                return;
            }
            const vertices = points.slice(index, index + count);
            index += count;
            const end = vertices[count - 1], closed = !current;
            if (closed)
                begin(end);
            for (let j = 0; j < count - 1; j++) {
                const control = vertices[j], following = vertices[j + 1];
                const endpoint = j === count - 2 ? end : [(control[0] + following[0]) / 2, (control[1] + following[1]) / 2];
                include(endpoint);
                if (recover && current)
                    for (let axis = 0; axis < 2; axis++) {
                        const divisor = current[axis] - 2 * control[axis] + endpoint[axis], t = divisor ? (current[axis] - control[axis]) / divisor : 0;
                        if (t > 0 && t < 1) {
                            const s = 1 - t;
                            include([s * s * current[0] + 2 * s * t * control[0] + t * t * endpoint[0], s * s * current[1] + 2 * s * t * control[1] + t * t * endpoint[1]]);
                        }
                    }
                parts.push(`Q${format(control)} ${format(endpoint)}`);
                current = endpoint;
            }
            if (closed) {
                parts.push('Z');
                current = start;
            }
        }
        else
            valid = false;
    };
    if (!segments) {
        begin(next());
        const pathType = values.get(324) ?? 1;
        if (pathType === 2 || pathType === 3) {
            if ((points.length - index) % 3)
                valid = false;
            else
                while (index + 2 < points.length)
                    cubic();
        }
        else if (pathType === 0 || pathType === 1)
            while (index < points.length)
                parts.push(`L${point()}`);
        else {
            diagnostics.push({ code: 'GEOMETRY_SEGMENTS', severity: 'warning', message: 'A complex shapePath requires its segment array; geometry is not inferred from vertices alone', shapeId, offset });
            valid = false;
        }
        if (pathType === 1 || pathType === 3)
            parts.push('Z');
    }
    else if (segments.size === 2) {
        for (let i = 0; i < segments.count && valid; i++) {
            const segment = segments.view.getUint16(6 + i * 2, true), op = segment >>> 13, count = segment & 0x1FFF;
            if (op === 0)
                for (let n = 0; n < count; n++)
                    parts.push(`L${point()}`);
            else if (op === 1)
                for (let n = 0; n < count && valid; n++)
                    cubic();
            else if (op === 2)
                begin(next());
            else if (op === 3) {
                parts.push('Z');
                current = start;
            }
            else if (op === 4)
                finish();
            else if (op === 5 && ((segment >>> 8) & 31) === 10)
                noFill = true;
            else if (op === 5 && ((segment >>> 8) & 31) === 11)
                noLine = true;
            else if (op === 5 && ((segment >>> 8) & 31) >= 3 && ((segment >>> 8) & 31) <= 9)
                arc((segment >>> 8) & 31, segment & 255);
            else if (op === 5 && ((segment >>> 8) & 31) >= 12 && ((segment >>> 8) & 31) <= 20) { /* Editing tangent metadata; geometry comes from following path segments. */ }
            else {
                diagnostics.push({ code: 'GEOMETRY_SEGMENT', severity: 'warning', message: `Custom path opcode ${op}/${(segment >>> 8) & 31} requires an unsupported geometry escape`, shapeId, offset });
                valid = false;
            }
        }
    }
    else
        valid = false;
    if (!valid) {
        diagnostics.push({ code: 'GEOMETRY_INCOMPLETE', severity: 'warning', message: 'Custom path could not be rendered completely; shape geometry fallback will be used', shapeId, offset });
        return {};
    }
    if (recover) {
        // MS-ODRAW defines scaling through the geometry rectangle, but does not
        // define a zero-size rectangle. Preserve usable producer output by fitting
        // only its degenerate axes to exact path extrema, with an explicit warning.
        if (recoverX && Number.isFinite(minX) && maxX > minX) {
            pathBounds.x = minX;
            pathBounds.width = maxX - minX;
        }
        if (recoverY && Number.isFinite(minY) && maxY > minY) {
            pathBounds.y = minY;
            pathBounds.height = maxY - minY;
        }
        diagnostics.push({ code: 'GEOMETRY_BOUNDS_RECOVERED', severity: 'warning', message: 'Zero-size geometry axes use the saved path extent; the original coordinate-system mapping is not specified', shapeId, offset, details: { x: recoverX, y: recoverY } });
    }
    finish();
    return { path: pathParts.map(p => p.path).join(' '), pathParts, pathBounds, noFill: pathParts.every(p => p.noFill), noLine: pathParts.every(p => p.noLine) };
}
/** Saved adjustment handles use the 21,600-unit OfficeArt geometry space.
 * Right-arrow construction is independently described by Microsoft's VML handles example.
 * Other analytic envelopes remain explicitly labelled where their complete Office recipe
 * is not published in MS-ODRAW. A stored pVertices/pGuides path always takes precedence.
 */
export function adjustedPresetGeometry(preset, values, bounds) {
    if (!Array.from({ length: 8 }, (_, i) => values.has(327 + i)).some(Boolean))
        return undefined;
    const size = 21600, half = 10800, clamp = (v, min = 0, max = size) => Math.max(min, Math.min(max, v));
    const a = (i, fallback, min = 0, max = size) => clamp((values.get(327 + i) ?? fallback) | 0, min, max);
    const pathBounds = { x: 0, y: 0, width: size, height: size };
    const result = (path, approximate = true) => ({ path, pathBounds, approximate });
    const polygon = (points, approximate = true) => result('M' + points.map(p => p.join(' ')).join(' L') + ' Z', approximate);
    if (preset === 2) {
        const amount = a(0, 2592, 0, half), min = Math.max(0, Math.min(bounds.width, bounds.height)), rx = bounds.width ? amount * min / bounds.width : amount, ry = bounds.height ? amount * min / bounds.height : amount;
        return result(`M${rx} 0 H${size - rx} A${rx} ${ry} 0 0 1 ${size} ${ry} V${size - ry} A${rx} ${ry} 0 0 1 ${size - rx} ${size} H${rx} A${rx} ${ry} 0 0 1 0 ${size - ry} V${ry} A${rx} ${ry} 0 0 1 ${rx} 0 Z`, false);
    }
    if (preset === 5)
        return polygon([[a(0, half), 0], [size, size], [0, size]]);
    if (preset === 7) {
        const x = a(0, 5400, 0, half);
        return polygon([[x, 0], [size, 0], [size - x, size], [0, size]]);
    }
    if (preset === 8) {
        const x = a(0, 5400, 0, half);
        return polygon([[x, 0], [size - x, 0], [size, size], [0, size]]);
    }
    if (preset === 9) {
        const x = a(0, 5400, 0, half);
        return polygon([[x, 0], [size - x, 0], [size, half], [size - x, size], [x, size], [0, half]]);
    }
    if (preset === 10) {
        const x = a(0, 6326, 0, half);
        return polygon([[x, 0], [size - x, 0], [size, x], [size, size - x], [size - x, size], [x, size], [0, size - x], [0, x]]);
    }
    if (preset === 11) {
        const x = a(0, 5400, 0, half), r = size - x;
        return polygon([[x, 0], [r, 0], [r, x], [size, x], [size, r], [r, r], [r, size], [x, size], [x, r], [0, r], [0, x], [x, x]]);
    }
    if (preset === 13) {
        const neck = a(0, 16200), shaft = a(1, 5400, 0, half);
        return polygon([[neck, 0], [neck, shaft], [0, shaft], [0, size - shaft], [neck, size - shaft], [neck, size], [size, half]], false);
    }
    if (preset === 15) {
        const neck = a(0, 16200);
        return polygon([[0, 0], [neck, 0], [size, half], [neck, size], [0, size]]);
    }
    if (preset === 66) {
        const neck = a(0, 5400), shaft = a(1, 5400, 0, half);
        return polygon([[neck, 0], [neck, shaft], [size, shaft], [size, size - shaft], [neck, size - shaft], [neck, size], [0, half]]);
    }
    if (preset === 67) {
        const neck = a(0, 16200), shaft = a(1, 5400, 0, half);
        return polygon([[shaft, 0], [size - shaft, 0], [size - shaft, neck], [size, neck], [half, size], [0, neck], [shaft, neck]]);
    }
    if (preset === 68) {
        const neck = a(0, 5400), shaft = a(1, 5400, 0, half);
        return polygon([[shaft, size], [size - shaft, size], [size - shaft, neck], [size, neck], [half, 0], [0, neck], [shaft, neck]]);
    }
    if (preset === 69) {
        const neck = a(0, 5400, 0, half), shaft = a(1, 5400, 0, half);
        return polygon([[0, half], [neck, 0], [neck, shaft], [size - neck, shaft], [size - neck, 0], [size, half], [size - neck, size], [size - neck, size - shaft], [neck, size - shaft], [neck, size]]);
    }
    if (preset === 70) {
        const shaft = a(0, 5400, 0, half), neck = a(1, 5400, 0, half);
        return polygon([[half, 0], [size, neck], [size - shaft, neck], [size - shaft, size - neck], [size, size - neck], [half, size], [0, size - neck], [shaft, size - neck], [shaft, neck], [0, neck]]);
    }
    if (preset === 55) {
        const x = a(0, 5400, 0, half);
        return polygon([[0, 0], [size - x, 0], [size, half], [size - x, size], [0, size], [x, half]]);
    }
    if (preset === 23) {
        const inset = a(0, 5400, 0, half), r = half - inset;
        if (!r)
            return result(`M${half} 0 A${half} ${half} 0 1 1 ${half} ${size} A${half} ${half} 0 1 1 ${half} 0 Z`);
        return result(`M${half} 0 A${half} ${half} 0 1 1 ${half} ${size} A${half} ${half} 0 1 1 ${half} 0 Z M${half} ${inset} A${r} ${r} 0 1 0 ${half} ${size - inset} A${r} ${r} 0 1 0 ${half} ${inset} Z`);
    }
    if (preset >= 34 && preset <= 36) {
        const x = a(0, half, -size, size * 2), y = a(1, half, -size, size * 2), z = a(2, half, -size, size * 2);
        return result(preset === 34 ? `M0 0 H${x} V${size} H${size}` : preset === 35 ? `M0 0 H${x} V${y} H${size} V${size}` : `M0 0 H${x} V${y} H${z} V${size} H${size}`);
    }
    if (preset === 37 || preset === 38) {
        const x = a(0, half, -size, size * 2);
        return result(`M0 0 C${x} 0 ${x} ${size} ${size} ${size}`);
    }
    return undefined;
}
