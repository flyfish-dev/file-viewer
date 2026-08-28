export type FileViewerMermaidModule = {
  default: {
    initialize(options: Record<string, unknown>): void;
    render(id: string, source: string): Promise<{ svg: string }>;
  };
};

export type FileViewerMermaidLoader = () => Promise<FileViewerMermaidModule>;
export type FileViewerDiffToHtml = (
  input: string,
  options: Record<string, unknown>
) => string;
export type FileViewerPakoModule = typeof import('pako');

let mermaidLoader: FileViewerMermaidLoader | null = null;
let diffToHtml: FileViewerDiffToHtml | null = null;
let pakoLoader: (() => Promise<FileViewerPakoModule>) | null = null;

/**
 * Enables embedded Mermaid blocks without making Mermaid part of the base text
 * renderer dependency closure. Capability packs call this once at startup.
 */
export const registerFileViewerMermaidLoader = (
  loader: FileViewerMermaidLoader | null
) => {
  mermaidLoader = loader;
};

export const getFileViewerMermaidLoader = () => mermaidLoader;

export const registerFileViewerDiffToHtml = (renderer: FileViewerDiffToHtml | null) => {
  diffToHtml = renderer;
};

export const getFileViewerDiffToHtml = () => diffToHtml;

export const registerFileViewerPakoLoader = (
  loader: (() => Promise<FileViewerPakoModule>) | null
) => {
  pakoLoader = loader;
};

export const getFileViewerPakoLoader = () => pakoLoader;
