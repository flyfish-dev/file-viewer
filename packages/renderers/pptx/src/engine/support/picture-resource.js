const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];

/**
 * Resolve only package-local picture parts. SVG-only DrawingML stores its
 * relationship in an extension instead of a:blip/@r:embed. Keep the bitmap
 * fallback available when the vector part or relationship is missing.
 */
export function getEmbeddedPictureCandidates(blip, resources, zip) {
  const ids = [];
  for (const extension of asArray(blip?.['a:extLst']?.['a:ext'])) {
    for (const [name, value] of Object.entries(extension || {})) {
      if (name.split(':').pop() !== 'svgBlip') continue;
      for (const svg of asArray(value)) ids.push(svg?.attrs?.['r:embed']);
    }
  }
  ids.push(blip?.attrs?.['r:embed']);
  const candidates = [];
  for (const id of new Set(ids)) {
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(resources || {}, id)) continue;
    const resource = resources[id];
    const target = resource?.target;
    if (resource?.external || typeof target !== 'string' || !target ||
        /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
    if (resource.type && resource.type !== 'image' && !resource.type.endsWith('/image')) continue;
    const entry = zip.file(target);
    if (entry) candidates.push({ target, entry });
  }
  return candidates;
}
