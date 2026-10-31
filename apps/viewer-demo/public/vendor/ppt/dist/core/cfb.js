import { PptError } from './errors.js';
const FREE = 0xffffffff, END = 0xfffffffe, FAT = 0xfffffffd, DIF = 0xfffffffc;
const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
export function toBytes(input) {
    if (input instanceof ArrayBuffer)
        return new Uint8Array(input);
    if (ArrayBuffer.isView(input))
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError('Expected an ArrayBuffer or ArrayBufferView');
}
export class CompoundFile {
    entries = [];
    sectorSize;
    version;
    bytes;
    view;
    sectorCount;
    fat;
    miniFat;
    root;
    cache = new Map();
    paths = new Map();
    limits;
    constructor(input, limits, diagnostics = [], strict = false) {
        this.bytes = toBytes(input);
        this.limits = limits;
        if (this.bytes.length > limits.maxFileBytes)
            throw new PptError('LIMIT_FILE', 'File exceeds the configured byte limit');
        if (this.bytes.length < 512 || signature.some((v, i) => this.bytes[i] !== v))
            throw new PptError('NOT_CFB', 'Expected a PowerPoint 97–2003 .ppt compound file');
        this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
        this.version = this.view.getUint16(26, true);
        const shift = this.view.getUint16(30, true);
        if (this.view.getUint16(28, true) !== 0xfffe || !((this.version === 3 && shift === 9) || (this.version === 4 && shift === 12)) || this.view.getUint16(32, true) !== 6)
            throw new PptError('CFB_HEADER', 'Unsupported or invalid CFB header');
        this.sectorSize = 2 ** shift;
        this.sectorCount = Math.ceil(this.bytes.length / this.sectorSize) - 1;
        if (this.bytes.length < this.sectorSize || this.view.getUint32(56, true) !== 4096)
            throw new PptError('CFB_HEADER', 'Invalid CFB sector size or mini stream cutoff');
        const fatCount = this.view.getUint32(44, true), difCount = this.view.getUint32(72, true);
        if (fatCount > this.sectorCount || difCount > this.sectorCount)
            throw new PptError('CFB_FAT', 'FAT allocation exceeds physical file');
        const fatSectors = [];
        const addFat = (id) => { if (id !== FREE) {
            this.checkSector(id);
            if (fatSectors.length >= fatCount)
                throw new PptError('CFB_FAT', 'DIFAT lists more FAT sectors than the header declares');
            fatSectors.push(id);
        } };
        for (let i = 0; i < 109; i++)
            addFat(this.view.getUint32(76 + i * 4, true));
        let next = this.view.getUint32(68, true);
        const seenDif = new Set();
        for (let i = 0; i < difCount; i++) {
            if (seenDif.has(next))
                throw new PptError('CFB_CYCLE', 'Cycle in DIFAT chain');
            seenDif.add(next);
            const sector = this.sector(next);
            const dv = new DataView(sector.buffer, sector.byteOffset, sector.length);
            for (let j = 0; j < this.sectorSize / 4 - 1; j++)
                addFat(dv.getUint32(j * 4, true));
            next = dv.getUint32(this.sectorSize - 4, true);
        }
        // MS-CFB 2.5 requires ENDOFCHAIN. Some otherwise readable producers use
        // FREESECT only at the final declared DIFAT sector. Accept that bounded
        // terminal variant for preview, while retaining strict conformance checks.
        if (difCount > 0 && next !== END) {
            if (next === FREE && !strict)
                diagnostics.push({ code: 'CFB_DIFAT_FREE_TERMINATOR', severity: 'warning', message: 'The final declared DIFAT sector uses FREESECT instead of the required ENDOFCHAIN; the declared FAT count and all sector bounds are still checked.' });
            else
                throw new PptError('CFB_DIFAT', 'DIFAT does not terminate at declared sector count');
        }
        if (fatSectors.length < fatCount)
            throw new PptError('CFB_FAT', 'FAT sector list is truncated');
        if (new Set(fatSectors.slice(0, fatCount)).size !== fatCount)
            throw new PptError('CFB_FAT', 'Duplicate FAT sectors');
        const entriesPerSector = this.sectorSize / 4;
        if (fatCount * entriesPerSector * 4 > limits.maxStreamBytes)
            throw new PptError('LIMIT_STREAM', 'FAT exceeds configured stream budget');
        this.fat = new Uint32Array(fatCount * entriesPerSector);
        for (let i = 0; i < fatCount; i++) {
            const s = this.sector(fatSectors[i]);
            const v = new DataView(s.buffer, s.byteOffset, s.length);
            for (let j = 0; j < entriesPerSector; j++)
                this.fat[i * entriesPerSector + j] = v.getUint32(j * 4, true);
        }
        const dir = this.readChain(this.view.getUint32(48, true), undefined, this.fat, this.sectorSize);
        const dv = new DataView(dir.buffer, dir.byteOffset, dir.length);
        const utf16 = new TextDecoder('utf-16le');
        for (let p = 0; p + 128 <= dir.length; p += 128) {
            const type = dv.getUint8(p + 66), nameLen = dv.getUint16(p + 64, true);
            if (type !== 0 && (nameLen < 2 || nameLen > 64 || (nameLen & 1)))
                throw new PptError('CFB_DIRECTORY', 'Invalid directory name length', p);
            const size = dv.getUint32(p + 120, true) + (this.version === 4 ? dv.getUint32(p + 124, true) * 2 ** 32 : 0);
            if (!Number.isSafeInteger(size) || size > limits.maxStreamBytes)
                throw new PptError('LIMIT_STREAM', 'Directory declares an oversized stream', p);
            this.entries.push({ id: p / 128, name: type === 0 ? '' : utf16.decode(dir.subarray(p, p + nameLen - 2)), type, left: dv.getUint32(p + 68, true), right: dv.getUint32(p + 72, true), child: dv.getUint32(p + 76, true), start: dv.getUint32(p + 116, true), size, parent: null, path: '' });
        }
        const root = this.entries[0];
        if (!root || root.type !== 5)
            throw new PptError('CFB_ROOT', 'Compound file root entry is missing');
        this.root = root;
        this.attachDirectory(root, 0, new Set());
        const miniCount = this.view.getUint32(64, true);
        if (miniCount > this.sectorCount || miniCount * this.sectorSize > limits.maxStreamBytes)
            throw new PptError('CFB_MINIFAT', 'Invalid MiniFAT count');
        const mb = miniCount ? this.readChain(this.view.getUint32(60, true), miniCount * this.sectorSize, this.fat, this.sectorSize) : new Uint8Array(0);
        this.miniFat = new Uint32Array(mb.length / 4);
        const mv = new DataView(mb.buffer, mb.byteOffset, mb.byteLength);
        for (let i = 0; i < this.miniFat.length; i++)
            this.miniFat[i] = mv.getUint32(i * 4, true);
        if (this.bytes.length % this.sectorSize)
            diagnostics.push({ code: 'CFB_PARTIAL_TAIL', severity: 'warning', message: 'The final physical sector is partial; each logical stream remains checked against its declared size.' });
    }
    checkSector(id) { if (!Number.isInteger(id) || id < 0 || id >= this.sectorCount)
        throw new PptError('CFB_SECTOR', `Sector ${id} is outside the file`); }
    sector(id, length = this.sectorSize) { this.checkSector(id); const p = (id + 1) * this.sectorSize; if (p + length > this.bytes.length)
        throw new PptError('CFB_TRUNCATED', 'Sector payload is truncated', p); return this.bytes.subarray(p, p + length); }
    readChain(start, size, table, unit, mini) {
        if (size === 0)
            return new Uint8Array(0);
        const chain = [];
        const visited = new Set();
        let id = start;
        const needed = size === undefined ? Infinity : Math.ceil(size / unit);
        while (id !== END) {
            if (id === FREE || id === FAT || id === DIF || id >= table.length)
                throw new PptError('CFB_CHAIN', 'Broken sector chain');
            if (visited.has(id))
                throw new PptError('CFB_CYCLE', 'Cycle in sector chain');
            visited.add(id);
            if (!mini)
                this.checkSector(id);
            else if (id * unit >= mini.length)
                throw new PptError('CFB_MINISTREAM', 'Mini sector outside root stream');
            chain.push(id);
            if (chain.length * unit > this.limits.maxStreamBytes + unit)
                throw new PptError('LIMIT_STREAM', 'Sector chain exceeds configured budget');
            id = table[id];
            if (chain.length === needed)
                break;
        }
        const length = size ?? chain.length * unit;
        if (length > this.limits.maxStreamBytes)
            throw new PptError('LIMIT_STREAM', 'Stream exceeds configured byte limit');
        if (chain.length * unit < length)
            throw new PptError('CFB_TRUNCATED', 'Sector chain is shorter than the declared stream');
        const out = new Uint8Array(length);
        let offset = 0;
        for (const sid of chain) {
            const count = Math.min(unit, length - offset);
            const chunk = mini ? mini.subarray(sid * unit, sid * unit + count) : this.sector(sid, count);
            if (chunk.length !== count)
                throw new PptError('CFB_TRUNCATED', 'Truncated mini stream');
            out.set(chunk, offset);
            offset += count;
        }
        return out;
    }
    attachDirectory(parent, depth, assigned) {
        if (depth > this.limits.maxDepth)
            throw new PptError('CFB_DEPTH', 'Directory nesting exceeds configured limit');
        const stack = [parent.child];
        const siblings = new Set();
        while (stack.length) {
            const id = stack.pop();
            if (id === FREE)
                continue;
            if (id >= this.entries.length || id === 0 || siblings.has(id) || assigned.has(id))
                throw new PptError('CFB_DIRECTORY_CYCLE', 'Invalid or cyclic directory tree');
            siblings.add(id);
            assigned.add(id);
            const entry = this.entries[id];
            if (entry.type !== 1 && entry.type !== 2)
                throw new PptError('CFB_DIRECTORY', 'Invalid directory object type');
            entry.parent = parent.id;
            entry.path = (parent.type === 5 ? '' : parent.path) + '/' + entry.name;
            if (this.paths.has(entry.path.toLowerCase()))
                throw new PptError('CFB_DIRECTORY', 'Duplicate stream path');
            this.paths.set(entry.path.toLowerCase(), entry);
            stack.push(entry.right, entry.left);
            if (entry.type === 1)
                this.attachDirectory(entry, depth + 1, assigned);
        }
    }
    getEntry(path) { return this.paths.get(('/' + path.replace(/^\/+/, '')).toLowerCase()); }
    getStream(path) {
        const entry = this.getEntry(path);
        if (!entry || entry.type !== 2)
            return undefined;
        const cached = this.cache.get(entry.id);
        if (cached)
            return cached;
        let result;
        if (entry.size < 4096 && entry.size > 0) {
            let root = this.cache.get(this.root.id);
            if (!root) {
                root = this.readChain(this.root.start, this.root.size, this.fat, this.sectorSize);
                this.cache.set(this.root.id, root);
            }
            result = this.readChain(entry.start, entry.size, this.miniFat, 64, root);
        }
        else
            result = this.readChain(entry.start, entry.size, this.fat, this.sectorSize);
        this.cache.set(entry.id, result);
        return result;
    }
}
