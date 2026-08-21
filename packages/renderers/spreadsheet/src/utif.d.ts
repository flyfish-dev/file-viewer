declare module 'utif' {
  interface TiffImageFileDirectory {
    [key: string]: unknown;
  }

  const UTIF: {
    decode(buffer: ArrayBuffer): TiffImageFileDirectory[];
    decodeImage(buffer: ArrayBuffer, ifd: TiffImageFileDirectory): void;
    toRGBA8(ifd: TiffImageFileDirectory): Uint8Array;
  };

  export default UTIF;
}
