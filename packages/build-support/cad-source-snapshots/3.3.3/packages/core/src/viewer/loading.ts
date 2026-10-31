import {
  translateFileViewerMessage,
  type FileViewerI18nInput,
} from '../i18n/messages';
import type { FileViewerMessageKey, FileViewerStateTheme } from '../contracts/types';

export type FileViewerLoadingTheme = FileViewerStateTheme;

export interface FileViewerLoadingState {
  loading: boolean;
  error: string;
  message: string;
  theme: FileViewerLoadingTheme;
  styleVars: Record<'--viewer-accent' | '--viewer-soft', string>;
}

export type MutableFileViewerLoadingState = FileViewerLoadingState;

export interface FileViewerLoadingController {
  readonly state: FileViewerLoadingState;
  setExtension(nextExtend?: string): FileViewerLoadingState;
  setI18n(nextI18n?: FileViewerI18nInput): FileViewerLoadingState;
  startLoading(nextMessage: string): FileViewerLoadingState;
  setLoadingMessage(nextMessage: string): FileViewerLoadingState;
  stopLoading(): FileViewerLoadingState;
  showError(nextMessage: string): FileViewerLoadingState;
  clearError(): FileViewerLoadingState;
  resetLoading(): FileViewerLoadingState;
  getState(): FileViewerLoadingState;
}

export interface FileViewerLoadingControllerActionHandlers {
  setExtension(nextExtend?: string): FileViewerLoadingState;
  setI18n(nextI18n?: FileViewerI18nInput): FileViewerLoadingState;
  startLoading(nextMessage: string): FileViewerLoadingState;
  setLoadingMessage(nextMessage: string): FileViewerLoadingState;
  stopLoading(): FileViewerLoadingState;
  showError(nextMessage: string): FileViewerLoadingState;
  clearError(): FileViewerLoadingState;
  resetLoading(): FileViewerLoadingState;
  syncLoadingState(): FileViewerLoadingState;
}

export interface RunFileViewerLoadingExtensionSyncInput<
  Target extends MutableFileViewerLoadingState = MutableFileViewerLoadingState,
> {
  target: Target;
  controller: Pick<FileViewerLoadingController, 'setExtension'>;
  extension?: string;
}

export const FALLBACK_FILE_VIEWER_LOADING_THEME: FileViewerLoadingTheme = {
  accent: '#5f6f82',
  soft: 'rgba(95, 111, 130, 0.12)',
  badge: 'DOC',
  label: '文件内容',
  hint: '正在整理内容结构并生成预览。'
};

export const FILE_VIEWER_LOADING_THEME_MAP: Record<string, FileViewerLoadingTheme> = {
  doc: {
    accent: '#2b78f6',
    soft: 'rgba(43, 120, 246, 0.12)',
    badge: 'W',
    label: 'Word 文档',
    hint: '正在准备分页、文本样式和文档结构。'
  },
  docx: {
    accent: '#2b78f6',
    soft: 'rgba(43, 120, 246, 0.12)',
    badge: 'W',
    label: 'Word 文档',
    hint: '正在通过 Worker 准备文档结构、文本样式和分页结果。'
  },
  xls: {
    accent: '#21a366',
    soft: 'rgba(33, 163, 102, 0.12)',
    badge: 'X',
    label: 'Excel 表格',
    hint: '正在准备工作表、样式和可视区数据。'
  },
  xlsx: {
    accent: '#21a366',
    soft: 'rgba(33, 163, 102, 0.12)',
    badge: 'X',
    label: 'Excel 表格',
    hint: '正在准备工作表、样式和可视区数据。'
  },
  csv: {
    accent: '#21a366',
    soft: 'rgba(33, 163, 102, 0.12)',
    badge: 'X',
    label: '表格数据',
    hint: '正在准备行列数据和基础样式。'
  },
  tsv: {
    accent: '#21a366',
    soft: 'rgba(33, 163, 102, 0.12)',
    badge: 'X',
    label: '表格数据',
    hint: '正在准备行列数据和基础样式。'
  },
  ppt: {
    accent: '#f28b27',
    soft: 'rgba(242, 139, 39, 0.12)',
    badge: 'P',
    label: 'PPT 演示文稿',
    hint: '正在构建幻灯片布局和媒体内容。'
  },
  pptx: {
    accent: '#f28b27',
    soft: 'rgba(242, 139, 39, 0.12)',
    badge: 'P',
    label: 'PPT 演示文稿',
    hint: '正在构建幻灯片布局和媒体内容。'
  },
  pdf: {
    accent: '#e5534b',
    soft: 'rgba(229, 83, 75, 0.12)',
    badge: 'PDF',
    label: 'PDF 文档',
    hint: '正在载入页面位图、文本层和缩放视图。'
  },
  ofd: {
    accent: '#c2410c',
    soft: 'rgba(194, 65, 12, 0.12)',
    badge: 'OFD',
    label: 'OFD 版式文件',
    hint: '正在解析国产版式文档和页面对象。'
  },
  zip: {
    accent: '#a15c07',
    soft: 'rgba(161, 92, 7, 0.12)',
    badge: 'ZIP',
    label: '压缩包',
    hint: '正在启动 Worker 并读取压缩包目录。'
  },
  rar: {
    accent: '#a15c07',
    soft: 'rgba(161, 92, 7, 0.12)',
    badge: 'RAR',
    label: '压缩包',
    hint: '正在启动 Worker 并读取压缩包目录。'
  },
  '7z': {
    accent: '#a15c07',
    soft: 'rgba(161, 92, 7, 0.12)',
    badge: '7Z',
    label: '压缩包',
    hint: '正在启动 Worker 并读取压缩包目录。'
  },
  tar: {
    accent: '#a15c07',
    soft: 'rgba(161, 92, 7, 0.12)',
    badge: 'TAR',
    label: '压缩包',
    hint: '正在启动 Worker 并读取压缩包目录。'
  },
  gz: {
    accent: '#a15c07',
    soft: 'rgba(161, 92, 7, 0.12)',
    badge: 'GZ',
    label: '压缩包',
    hint: '正在启动 Worker 并读取压缩包目录。'
  },
  eml: {
    accent: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)',
    badge: 'EML',
    label: '邮件文件',
    hint: '正在解析邮件头、正文和附件。'
  },
  msg: {
    accent: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)',
    badge: 'MSG',
    label: '邮件文件',
    hint: '正在解析 Outlook 邮件和附件。'
  },
  olb: {
    accent: '#0d7884',
    soft: 'rgba(13, 120, 132, 0.12)',
    badge: 'OLB',
    label: 'EDA 文件',
    hint: '正在读取 EDA 容器结构和可读属性。'
  },
  dra: {
    accent: '#0d7884',
    soft: 'rgba(13, 120, 132, 0.12)',
    badge: 'DRA',
    label: 'EDA 文件',
    hint: '正在读取 EDA 容器结构和可读属性。'
  },
  dxf: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'CAD',
    label: 'CAD 图纸',
    hint: '正在准备 CAD 图层、几何对象和画布视图。'
  },
  dwg: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'CAD',
    label: 'CAD 图纸',
    hint: '正在通过 Worker 加载 DWG 几何和 LibreDWG WASM。'
  },
  dwf: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'DWF',
    label: 'CAD 图纸',
    hint: '正在加载 DWF native renderer 与 W2D/W3D 图形。'
  },
  dwfx: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'DWFx',
    label: 'CAD 图纸',
    hint: '正在加载 DWFx/XPS native renderer 与页面图形。'
  },
  xps: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'XPS',
    label: 'CAD 图纸',
    hint: '正在加载 XPS native renderer 与嵌入字体。'
  },
  drawio: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'DIO',
    label: 'draw.io 图纸',
    hint: '正在解析图元、连线和 SVG 预览。'
  },
  dio: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'DIO',
    label: 'draw.io 图纸',
    hint: '正在解析图元、连线和 SVG 预览。'
  },
  excalidraw: {
    accent: '#6d28d9',
    soft: 'rgba(109, 40, 217, 0.12)',
    badge: 'EX',
    label: 'Excalidraw 图纸',
    hint: '正在解析手绘图元并生成安全 SVG。'
  },
  epub: {
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.12)',
    badge: 'EPUB',
    label: 'EPUB 电子书',
    hint: '正在解析目录、章节资源和阅读分页。'
  },
  umd: {
    accent: '#0284c7',
    soft: 'rgba(2, 132, 199, 0.12)',
    badge: 'UMD',
    label: 'UMD 电子书',
    hint: '正在解析移动电子书结构、目录和压缩正文。'
  },
  png: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  jpg: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  jpeg: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  gif: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  webp: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  svg: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  bmp: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  mp4: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  mp3: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  mpeg: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  wav: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  ogg: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  oga: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  opus: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  m4a: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  aac: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  flac: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  weba: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'AUD',
    label: '音频文件',
    hint: '正在准备音频资源和播放控件。'
  },
  mov: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  avi: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  webm: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  m4v: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  }
};

const FILE_VIEWER_LOADING_COPY_KEYS: Record<string, { label: FileViewerMessageKey; hint: FileViewerMessageKey }> = {
  doc: { label: 'loading.word.label', hint: 'loading.word.hint' },
  docx: { label: 'loading.word.label', hint: 'loading.wordWorker.hint' },
  xls: { label: 'loading.sheet.label', hint: 'loading.sheet.hint' },
  xlsx: { label: 'loading.sheet.label', hint: 'loading.sheet.hint' },
  csv: { label: 'loading.csv.label', hint: 'loading.csv.hint' },
  tsv: { label: 'loading.csv.label', hint: 'loading.csv.hint' },
  ppt: { label: 'loading.presentation.label', hint: 'loading.presentation.hint' },
  pptx: { label: 'loading.presentation.label', hint: 'loading.presentation.hint' },
  pdf: { label: 'loading.pdf.label', hint: 'loading.pdf.hint' },
  ofd: { label: 'loading.ofd.label', hint: 'loading.ofd.hint' },
  zip: { label: 'loading.archive.label', hint: 'loading.archive.hint' },
  rar: { label: 'loading.archive.label', hint: 'loading.archive.hint' },
  '7z': { label: 'loading.archive.label', hint: 'loading.archive.hint' },
  tar: { label: 'loading.archive.label', hint: 'loading.archive.hint' },
  gz: { label: 'loading.archive.label', hint: 'loading.archive.hint' },
  eml: { label: 'loading.email.label', hint: 'loading.email.hint' },
  msg: { label: 'loading.email.label', hint: 'loading.msg.hint' },
  olb: { label: 'loading.eda.label', hint: 'loading.eda.hint' },
  dra: { label: 'loading.eda.label', hint: 'loading.eda.hint' },
  dxf: { label: 'loading.cad.label', hint: 'loading.cad.hint' },
  dwg: { label: 'loading.cad.label', hint: 'loading.dwg.hint' },
  dwf: { label: 'loading.cad.label', hint: 'loading.dwf.hint' },
  dwfx: { label: 'loading.cad.label', hint: 'loading.dwfx.hint' },
  xps: { label: 'loading.cad.label', hint: 'loading.xps.hint' },
  drawio: { label: 'loading.drawio.label', hint: 'loading.drawio.hint' },
  dio: { label: 'loading.drawio.label', hint: 'loading.drawio.hint' },
  excalidraw: { label: 'loading.excalidraw.label', hint: 'loading.excalidraw.hint' },
  epub: { label: 'loading.epub.label', hint: 'loading.epub.hint' },
  umd: { label: 'loading.umd.label', hint: 'loading.umd.hint' },
  png: { label: 'loading.image.label', hint: 'loading.image.hint' },
  jpg: { label: 'loading.image.label', hint: 'loading.image.hint' },
  jpeg: { label: 'loading.image.label', hint: 'loading.image.hint' },
  gif: { label: 'loading.image.label', hint: 'loading.image.hint' },
  webp: { label: 'loading.image.label', hint: 'loading.image.hint' },
  svg: { label: 'loading.image.label', hint: 'loading.image.hint' },
  bmp: { label: 'loading.image.label', hint: 'loading.image.hint' },
  mp4: { label: 'loading.video.label', hint: 'loading.video.hint' },
  mov: { label: 'loading.video.label', hint: 'loading.video.hint' },
  avi: { label: 'loading.video.label', hint: 'loading.video.hint' },
  webm: { label: 'loading.video.label', hint: 'loading.video.hint' },
  m4v: { label: 'loading.video.label', hint: 'loading.video.hint' },
  mp3: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  mpeg: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  wav: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  ogg: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  oga: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  opus: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  m4a: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  aac: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  flac: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
  weba: { label: 'loading.audio.label', hint: 'loading.audio.hint' },
};

/**
 * 根据扩展名返回统一的加载主题。
 * 这样不同预览器可以复用同一套视觉语义，避免颜色、图标和文案各写一份。
 */
const localizeFileViewerLoadingTheme = (
  theme: FileViewerLoadingTheme,
  extend = '',
  i18n?: FileViewerI18nInput
): FileViewerLoadingTheme => {
  const normalized = extend.trim().toLowerCase();
  const keys = FILE_VIEWER_LOADING_COPY_KEYS[normalized] || {
    label: 'loading.generic.label',
    hint: 'loading.generic.hint',
  } satisfies { label: FileViewerMessageKey; hint: FileViewerMessageKey };
  return {
    ...theme,
    label: translateFileViewerMessage(i18n, keys.label),
    hint: translateFileViewerMessage(i18n, keys.hint),
  };
};

export const resolveFileViewerLoadingTheme = (extend = '', i18n?: FileViewerI18nInput): FileViewerLoadingTheme => {
  const normalized = extend.trim().toLowerCase();
  return localizeFileViewerLoadingTheme(
    FILE_VIEWER_LOADING_THEME_MAP[normalized] || FALLBACK_FILE_VIEWER_LOADING_THEME,
    normalized,
    i18n
  );
};

export const createFileViewerLoadingStyleVars = (theme: FileViewerLoadingTheme) => ({
  '--viewer-accent': theme.accent,
  '--viewer-soft': theme.soft,
});

export const createFileViewerLoadingState = (extend = '', i18n?: FileViewerI18nInput): FileViewerLoadingState => {
  const theme = resolveFileViewerLoadingTheme(extend, i18n);
  return {
    loading: false,
    error: '',
    message: '',
    theme,
    styleVars: createFileViewerLoadingStyleVars(theme),
  };
};

export const cloneFileViewerLoadingState = (
  state: FileViewerLoadingState
): FileViewerLoadingState => ({
  loading: state.loading,
  error: state.error,
  message: state.message,
  theme: { ...state.theme },
  styleVars: { ...state.styleVars },
});

export const applyFileViewerLoadingState = <Target extends MutableFileViewerLoadingState>(
  target: Target,
  source: FileViewerLoadingState
) => {
  target.loading = source.loading;
  target.error = source.error;
  target.message = source.message;
  target.theme = { ...source.theme };
  target.styleVars = { ...source.styleVars };

  return target;
};

export const syncFileViewerLoadingControllerState = <Target extends MutableFileViewerLoadingState>(
  target: Target,
  controller: Pick<FileViewerLoadingController, 'getState'>,
  source = controller.getState()
) => {
  return applyFileViewerLoadingState(target, source);
};

export const runFileViewerLoadingControllerAction = <Target extends MutableFileViewerLoadingState>(
  target: Target,
  action: () => FileViewerLoadingState
) => {
  return applyFileViewerLoadingState(target, action());
};

export const runFileViewerLoadingExtensionSync = <Target extends MutableFileViewerLoadingState>({
  target,
  controller,
  extension,
}: RunFileViewerLoadingExtensionSyncInput<Target>) => {
  return runFileViewerLoadingControllerAction(target, () => controller.setExtension(extension));
};

export const createFileViewerLoadingControllerActionHandlers = <
  Target extends MutableFileViewerLoadingState,
>(
  target: Target,
  controller: FileViewerLoadingController
): FileViewerLoadingControllerActionHandlers => {
  return {
    setExtension(nextExtend?: string) {
      return runFileViewerLoadingExtensionSync({
        target,
        controller,
        extension: nextExtend,
      });
    },
    setI18n(nextI18n?: FileViewerI18nInput) {
      return runFileViewerLoadingControllerAction(target, () => controller.setI18n(nextI18n));
    },
    startLoading(nextMessage: string) {
      return runFileViewerLoadingControllerAction(target, () => controller.startLoading(nextMessage));
    },
    setLoadingMessage(nextMessage: string) {
      return runFileViewerLoadingControllerAction(target, () => controller.setLoadingMessage(nextMessage));
    },
    stopLoading() {
      return runFileViewerLoadingControllerAction(target, () => controller.stopLoading());
    },
    showError(nextMessage: string) {
      return runFileViewerLoadingControllerAction(target, () => controller.showError(nextMessage));
    },
    clearError() {
      return runFileViewerLoadingControllerAction(target, () => controller.clearError());
    },
    resetLoading() {
      return runFileViewerLoadingControllerAction(target, () => controller.resetLoading());
    },
    syncLoadingState() {
      return syncFileViewerLoadingControllerState(target, controller);
    },
  };
};

/**
 * 统一管理加载、错误、文案和主题色。
 * wrapper 只负责把这个加载状态映射到各自框架的响应式系统。
 */
export const createFileViewerLoadingController = (
  extend = '',
  initialI18n?: FileViewerI18nInput
): FileViewerLoadingController => {
  let currentExtend = extend;
  let currentI18n = initialI18n;
  const state = createFileViewerLoadingState(extend, initialI18n);

  const updateTheme = (nextExtend: string) => {
    currentExtend = nextExtend;
    state.theme = resolveFileViewerLoadingTheme(nextExtend, currentI18n);
    state.styleVars = createFileViewerLoadingStyleVars(state.theme);
  };

  return {
    state,
    setExtension(nextExtend = '') {
      updateTheme(nextExtend);
      return cloneFileViewerLoadingState(state);
    },
    setI18n(nextI18n?: FileViewerI18nInput) {
      currentI18n = nextI18n;
      updateTheme(currentExtend);
      return cloneFileViewerLoadingState(state);
    },
    startLoading(nextMessage: string) {
      state.loading = true;
      state.message = nextMessage;
      state.error = '';
      return cloneFileViewerLoadingState(state);
    },
    setLoadingMessage(nextMessage: string) {
      state.message = nextMessage;
      return cloneFileViewerLoadingState(state);
    },
    stopLoading() {
      state.loading = false;
      state.message = '';
      return cloneFileViewerLoadingState(state);
    },
    showError(nextMessage: string) {
      state.loading = false;
      state.message = '';
      state.error = nextMessage;
      return cloneFileViewerLoadingState(state);
    },
    clearError() {
      state.error = '';
      return cloneFileViewerLoadingState(state);
    },
    resetLoading() {
      state.loading = false;
      state.message = '';
      state.error = '';
      return cloneFileViewerLoadingState(state);
    },
    getState() {
      return cloneFileViewerLoadingState(state);
    },
  };
};
