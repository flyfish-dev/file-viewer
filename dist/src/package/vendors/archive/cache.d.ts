interface CachedArchiveEntry {
    key: string;
    filename: string;
    size: number;
    updatedAt: number;
    buffer: ArrayBuffer;
}
export declare const readArchiveCache: (key: string) => Promise<CachedArchiveEntry | null>;
export declare const writeArchiveCache: (entry: CachedArchiveEntry) => Promise<void>;
export {};
