export declare function concatBytes(...items: Uint8Array[]): Uint8Array;
export declare function little32(value: number): Uint8Array;
export declare function passwordBytes(password: string): Uint8Array;
export declare function equalBytes(a: Uint8Array, b: Uint8Array): boolean;
export declare function sha1(data: Uint8Array): Uint8Array;
export declare class Rc4 {
    private readonly state;
    private i;
    private j;
    constructor(key: Uint8Array);
    crypt(bytes: Uint8Array): Uint8Array;
}
