import type { FileRenderContext, FileViewerRenderedInstance } from '@file-viewer/core'

export { inspectIllustratorPdfSurface } from './illustratorPreflight.js'

export default async function renderDesignAsset(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'psd',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const normalizedType = type.toLowerCase()
  if (normalizedType === 'psd' || normalizedType === 'psb' || normalizedType === 'pdd' || normalizedType === 'psdt') {
    const { default: renderPhotoshop } = await import('./photoshop.js')
    return renderPhotoshop(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'ai' || normalizedType === 'ait') {
    const { default: renderIllustrator } = await import('./illustrator.js')
    return renderIllustrator(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'ase' || normalizedType === 'aco') {
    const { default: renderAdobeDesignResource } = await import('./designResources.js')
    return renderAdobeDesignResource(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'abr' || normalizedType === 'csh') {
    const { default: renderAdobeBrushResource } = await import('./adobeBrushResources.js')
    return renderAdobeBrushResource(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'pat' || normalizedType === 'grd' || normalizedType === 'asl') {
    const { default: renderAdobePreset } = await import('./adobePresets.js')
    return renderAdobePreset(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'idml') {
    const { default: renderIdml } = await import('./idml.js')
    return renderIdml(buffer, target, context)
  }
  if (normalizedType === 'icml' || normalizedType === 'idms' || normalizedType === 'inx') {
    const { default: renderInDesignExchange } = await import('./indesignExchange.js')
    return renderInDesignExchange(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'fla' || normalizedType === 'xfl') {
    const { default: renderAdobeAnimate } = await import('./fla.js')
    return renderAdobeAnimate(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'xd') {
    const { default: renderAdobeXd } = await import('./xd.js')
    return renderAdobeXd(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'indd' || normalizedType === 'indt') {
    const { default: renderAdobeInDesign } = await import('./indesign.js')
    return renderAdobeInDesign(buffer, target, normalizedType, context)
  }
  if (normalizedType === 'eps' || normalizedType === 'ps') {
    const { default: renderPostscript } = await import('./postscript.js')
    return renderPostscript(buffer, target, normalizedType, context)
  }
  throw new Error(`Unsupported Adobe design container .${normalizedType}.`)
}
