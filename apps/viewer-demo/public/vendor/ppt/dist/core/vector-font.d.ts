import { BinaryReader } from '../core/binary.js';
export interface VectorFont {
    family: string;
    size: number;
    weight?: number;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    escapement?: number;
}
export declare function readEmfFont(record: BinaryReader): VectorFont | null;
export declare function readWmfFont(record: BinaryReader): VectorFont | null;
