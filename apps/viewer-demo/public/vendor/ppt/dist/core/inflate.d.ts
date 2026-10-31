/**
 * Small RFC1950/zlib + RFC1951/DEFLATE inflater.
 *
 * OfficeArt stores EMF/WMF BLIPs behind OfficeArtMetafileHeader.compression=0x00
 * using the zlib wrapper defined by RFC1950. Keeping this inflater dependency-free
 * preserves the browser-only build while still allowing the synchronous MS-DOC
 * parser to expose browser-displayable SVG assets.
 */
/** Raw RFC 1951 DEFLATE for ZIP entries; the caller verifies the container CRC. */
export declare function inflateRaw(bytes: Uint8Array, expectedLength: number, maxLength?: number): Uint8Array | null;
export declare function inflateZlib(bytes: Uint8Array, expectedLength?: number, maxLength?: number): Uint8Array | null;
