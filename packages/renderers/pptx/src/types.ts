import type { PptxPresentationLabels, PptxPresentationState } from './presentation';

export type PptxFitMode = 'contain' | 'none';

export interface PptxZipLimits {
  maxFileBytes?: number;
}

export interface PptxListOptions {
  windowed?: boolean;
  initialSlides?: number;
  batchSize?: number;
  overscanViewport?: number;
}

export interface PptxWorkerFactoryOptions {
  workerFactory?: () => Worker;
  workerUrl?: string | URL;
  workerType?: WorkerType;
}

export interface NativePptxEngineOptions {
  slidesScale?: string;
  slideMode?: boolean;
  slideType?: string;
  revealjsPath?: string;
  keyBoardShortCut?: boolean;
  mediaProcess?: boolean;
  jsZipV2?: boolean;
  themeProcess?: boolean | 'colorsAndImageOnly';
  incSlide?: {
    width: number;
    height: number;
  };
  slideModeConfig?: Record<string, unknown>;
  revealjsConfig?: Record<string, unknown>;
}

export interface PptxSlideSize {
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export type PptxDiagnosticErrorCode =
  | 'PPTX_FILE_EMPTY'
  | 'PPTX_FILE_TOO_LARGE'
  | 'PPTX_INVALID_ZIP'
  | 'PPTX_MISSING_CONTENT_TYPES'
  | 'PPTX_MISSING_PRESENTATION'
  | 'PPTX_NO_SLIDES'
  | 'PPTX_MISSING_SLIDE'
  | 'PPTX_SLIDE_RENDER_FAILED'
  | 'PPTX_NO_RENDERABLE_SLIDES'
  | 'PPTX_WORKER_FAILED'
  | 'PPTX_PARSE_FAILED'
  | (string & {});

export interface PptxDiagnosticError {
  name: 'PptxDiagnosticError';
  code: PptxDiagnosticErrorCode;
  stage?: string;
  message: string;
  detail?: string;
  hint?: string;
}

export interface PptxViewerOptions extends PptxWorkerFactoryOptions {
  styleRoot?: ShadowRoot;
  fitMode?: PptxFitMode;
  zoomPercent?: number;
  zipLimits?: PptxZipLimits;
  engineOptions?: Partial<NativePptxEngineOptions>;
  lazySlides?: boolean;
  lazyMedia?: boolean;
  listOptions?: PptxListOptions;
  onProgress?: (progress: number, message: unknown) => void;
  onThumbnail?: (base64Jpeg: string) => void;
  onSlideSize?: (size: PptxSlideSize) => void;
  onSlideRendered?: (slideIndex: number, element: Element | null) => void;
  onSlideError?: (slideIndex: number, error: unknown) => void;
  onRenderComplete?: () => void;
  onWarning?: (warning: unknown) => void;
  onError?: (error: unknown) => void;
  presentationLabels?: PptxPresentationLabels;
  presentationFullscreen?: boolean;
  onPresentationChange?: (state: PptxPresentationState) => void;
}

export interface PptxWorkerMessage {
  type: string;
  data?: unknown;
  slide_num?: number;
  file_name?: string;
  charts?: unknown;
}
