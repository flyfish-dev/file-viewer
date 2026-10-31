/** CFB/OLE foundation follows msdoc-viewer's lazy stream architecture, hardened for PPT limits.
 * Layout: Microsoft [MS-CFB] 2.2, 2.3, 2.6. All sectors are bounded before allocation.
 */
import type { BinaryInput, Diagnostic, ParseLimits } from '../types.js';
export interface CompoundEntry {
    id: number;
    name: string;
    type: number;
    left: number;
    right: number;
    child: number;
    start: number;
    size: number;
    parent: number | null;
    path: string;
}
export declare function toBytes(input: BinaryInput): Uint8Array;
export declare class CompoundFile {
    readonly entries: CompoundEntry[];
    readonly sectorSize: number;
    readonly version: number;
    private readonly bytes;
    private readonly view;
    private readonly sectorCount;
    private readonly fat;
    private readonly miniFat;
    private readonly root;
    private readonly cache;
    private readonly paths;
    private readonly limits;
    constructor(input: BinaryInput, limits: ParseLimits, diagnostics?: Diagnostic[], strict?: boolean);
    private checkSector;
    private sector;
    private readChain;
    private attachDirectory;
    getEntry(path: string): CompoundEntry | undefined;
    getStream(path: string): Uint8Array | undefined;
}
