import type { FileViewerWatermarkOptions } from '../contracts/types';

export type FileViewerWatermarkStyle = Record<string, string> & {
  backgroundImage: string;
};

export interface FileViewerWatermarkPresentationState {
  normalizedWatermark: FileViewerWatermarkOptions | null;
  watermarkStyle: FileViewerWatermarkStyle | undefined;
  watermarkInlineStyle: string;
}

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const encodeSvgDataUrl = (svg: string) => {
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const next = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, next));
};

export const normalizeFileViewerWatermark = (
  watermark?: boolean | FileViewerWatermarkOptions
): FileViewerWatermarkOptions | null => {
  if (!watermark) {
    return null;
  }
  if (watermark === true) {
    return {
      enabled: true,
      text: 'Flyfish Viewer',
    };
  }
  if (watermark.enabled === false) {
    return null;
  }
  if (!watermark.text && !watermark.image) {
    return null;
  }
  return {
    enabled: true,
    ...watermark,
  };
};

export const buildFileViewerWatermarkSvg = (watermark: FileViewerWatermarkOptions) => {
  const gapX = clampNumber(watermark.gapX, 260, 96, 800);
  const gapY = clampNumber(watermark.gapY, 180, 80, 800);
  const width = clampNumber(watermark.width, watermark.image ? 160 : 220, 32, gapX);
  const height = clampNumber(watermark.height, watermark.image ? 72 : 72, 24, gapY);
  const rotate = clampNumber(watermark.rotate, -24, -75, 75);
  const opacity = clampNumber(watermark.opacity, 0.18, 0.02, 0.8);
  const x = (gapX - width) / 2;
  const y = (gapY - height) / 2;
  const cx = gapX / 2;
  const cy = gapY / 2;

  if (watermark.image) {
    const href = escapeXml(watermark.image);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${gapX}" height="${gapY}" viewBox="0 0 ${gapX} ${gapY}"><g opacity="${opacity}" transform="rotate(${rotate} ${cx} ${cy})"><image href="${href}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></g></svg>`;
  }

  const text = escapeXml(watermark.text || 'Flyfish Viewer');
  const fontSize = clampNumber(watermark.fontSize, 20, 10, 72);
  const color = escapeXml(watermark.color || '#355070');
  const fontFamily = escapeXml(watermark.fontFamily || "Aptos, 'Segoe UI', sans-serif");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${gapX}" height="${gapY}" viewBox="0 0 ${gapX} ${gapY}"><g opacity="${opacity}" transform="rotate(${rotate} ${cx} ${cy})"><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="700">${text}</text></g></svg>`;
};

export const buildFileViewerWatermarkBackgroundImage = (
  watermark?: boolean | FileViewerWatermarkOptions
) => {
  const normalized = normalizeFileViewerWatermark(watermark);
  return normalized ? encodeSvgDataUrl(buildFileViewerWatermarkSvg(normalized)) : '';
};

export const buildFileViewerWatermarkStyle = (
  watermark?: boolean | FileViewerWatermarkOptions
): FileViewerWatermarkStyle | undefined => {
  const backgroundImage = buildFileViewerWatermarkBackgroundImage(watermark);
  return backgroundImage ? { backgroundImage } : undefined;
};

export const buildFileViewerWatermarkInlineStyle = (
  watermark?: boolean | FileViewerWatermarkOptions
) => {
  const backgroundImage = buildFileViewerWatermarkBackgroundImage(watermark);
  return backgroundImage
    ? `position:absolute;inset:0;pointer-events:none;background-image:${backgroundImage};background-repeat:repeat;z-index:20;`
    : '';
};

export const resolveFileViewerWatermarkPresentationState = (
  watermark?: boolean | FileViewerWatermarkOptions
): FileViewerWatermarkPresentationState => {
  const normalizedWatermark = normalizeFileViewerWatermark(watermark);
  const backgroundImage = normalizedWatermark
    ? encodeSvgDataUrl(buildFileViewerWatermarkSvg(normalizedWatermark))
    : '';

  return {
    normalizedWatermark,
    watermarkStyle: backgroundImage ? { backgroundImage } : undefined,
    watermarkInlineStyle: backgroundImage
      ? `position:absolute;inset:0;pointer-events:none;background-image:${backgroundImage};background-repeat:repeat;z-index:20;`
      : '',
  };
};
