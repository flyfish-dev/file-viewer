import { FileViewerOptions } from '../package/common/type';
type ListenCallback = (file?: File, url?: string, options?: FileViewerOptions) => void;
export declare function listenForFile(callback: ListenCallback): void;
export {};
