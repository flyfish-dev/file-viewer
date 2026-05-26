export interface EdaStreamView {
    path: string;
    name: string;
    size: number;
    kind: 'text' | 'binary' | 'storage';
    sample?: string;
}
export interface EdaParseResult {
    type: 'olb' | 'dra';
    parser: 'cfb' | 'binary';
    title: string;
    byteLength: number;
    streamCount: number;
    totalStreamBytes: number;
    streams: EdaStreamView[];
    strings: string[];
    warnings: string[];
}
export declare const parseEdaFile: (buffer: ArrayBuffer, type?: string) => Promise<EdaParseResult>;
