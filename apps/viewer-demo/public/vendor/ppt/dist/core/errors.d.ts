export declare class PptError extends Error {
    readonly code: string;
    readonly offset?: number;
    constructor(code: string, message: string, offset?: number);
}
