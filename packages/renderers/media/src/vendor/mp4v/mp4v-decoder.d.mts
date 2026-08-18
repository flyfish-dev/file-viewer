export interface Mp4vDecoderModule {
  HEAPU8: Uint8Array
  _malloc(size: number): number
  _free(pointer: number): void
  _mp4v_create(config: number, configSize: number, width: number, height: number): number
  _mp4v_decode(decoder: number, data: number, size: number, timestamp: number): number
  _mp4v_reset(decoder: number): number
  _mp4v_output(decoder: number): number
  _mp4v_width(decoder: number): number
  _mp4v_height(decoder: number): number
  _mp4v_buffer_width(decoder: number): number
  _mp4v_buffer_height(decoder: number): number
  _mp4v_destroy(decoder: number): void
}

declare const createDecoderModule: (options?: {
  locateFile?: (path: string, directory: string) => string
}) => Promise<Mp4vDecoderModule>

export default createDecoderModule
