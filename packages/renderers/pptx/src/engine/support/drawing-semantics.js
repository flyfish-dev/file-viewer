const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];

const timingId = value => /^(?:0|[0-9]+)$/.test(String(value ?? '')) && Number(value) <= 0xffffffff
  ? String(Number(value)) : undefined;

function timingChildren(node) {
  return Object.entries(node || {}).filter(([name]) => name !== 'attrs')
    .flatMap(([name, value]) => asArray(value).filter(child => child && typeof child === 'object').map(child => [name, child]))
    .sort((a, b) => (Number(a[1].attrs?.order) || 0) - (Number(b[1].attrs?.order) || 0));
}

function walkTiming(node, visit) {
  const stack = [['', node]];
  let remaining = 100000;
  while (stack.length && remaining-- > 0) {
    const [name, current] = stack.pop();
    if (!current || typeof current !== 'object' || current.attrs?.nodeType === 'interactiveSeq') continue;
    if (visit(name, current) === false) continue;
    stack.push(...timingChildren(current).reverse());
  }
  return stack.length === 0;
}

/** Static previews show the held final visibility of the main click sequence.
 * This is not an animation player: retain content for partial-shape targets,
 * repeated timelines, non-held setters and conflicting simultaneous changes.
 * In particular, never infer replacement from geometry or equal-looking math.
 */
export function getFinalSlideHiddenShapeIds(slide) {
  const main = [];
  const complete = walkTiming(slide?.['p:sld']?.['p:timing']?.['p:tnLst'], (_name, node) => {
    if (node.attrs?.nodeType === 'mainSeq') { main.push(node); return false; }
  });
  if (!complete || main.length !== 1) return new Set();
  let repeated = false;
  if (!walkTiming(main[0], (_name, node) => {
    if (node.attrs?.repeatCount != null || node.attrs?.repeatDur != null) repeated = true;
  }) || repeated) return new Set();
  const final = new Map();
  for (const [, group] of timingChildren(main[0]['p:childTnLst'])) {
    const states = new Map();
    if (!walkTiming(group, (name, node) => {
      if (name !== 'p:set') return;
      const behavior = node['p:cBhvr'], target = behavior?.['p:tgtEl']?.['p:spTgt'];
      const id = timingId(target?.attrs?.spid);
      const properties = asArray(behavior?.['p:attrNameLst']?.['p:attrName']);
      if (id === undefined || !properties.includes('style.visibility')) return;
      const value = node['p:to']?.['p:strVal']?.attrs?.val;
      const wholeShape = Object.keys(target).every(key => key === 'attrs') &&
        Object.keys(target.attrs || {}).every(key => key === 'spid' || key === 'order' || key === 'xmlns' || key.startsWith('xmlns:'));
      const state = wholeShape && ['hold', 'freeze'].includes(behavior?.['p:cTn']?.attrs?.fill) && ['visible', 'hidden'].includes(value) ? value : undefined;
      states.set(id, states.has(id) && states.get(id) !== state ? undefined : state);
    })) return new Set();
    for (const [id, state] of states) final.set(id, state);
  }
  return new Set([...final].filter(([, state]) => state === 'hidden').map(([id]) => id));
}

export function isFinalSlideShapeHidden(hidden, id) {
  const key = timingId(id);
  return key !== undefined && Boolean(hidden?.has(key));
}

/** Restore the mixed DrawingML paragraph sequence from the keyed XML model.
 * Field properties belong to the field run; retain both a:rPr and its type.
 * Do not mutate cached layout/master nodes, which are shared by later slides.
 */
export function getDrawingTextRuns(paragraph) {
  const runs = [];
  for (const [name, value] of Object.entries(paragraph || {})) {
    if (!['a:r', 'a:fld', 'a:br'].includes(name)) continue;
    for (const node of asArray(value)) {
      if (!node || typeof node !== 'object') continue;
      runs.push(name === 'a:fld' ? { ...node, 'a:fld': node }
        : name === 'a:br' ? { ...node, type: 'br' } : node);
    }
  }
  // order is produced by the XML parser, not the identifier or cached text.
  // Stable sorting also preserves insertion order for programmatic model nodes.
  return runs.sort((a, b) => (Number(a.attrs?.order) || 0) - (Number(b.attrs?.order) || 0));
}

/** Display numbering is independent of one-based navigation and part names. */
export function getFirstSlideNumber(value) {
  const text = String(value ?? '').trim();
  if (!/^[+-]?\d+$/.test(text)) return 1;
  const number = Number(text);
  return Number.isInteger(number) && number >= -0x80000000 && number <= 0x7fffffff ? number : 1;
}

function percentage(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const match = /^\+?(\d+(?:\.\d*)?|\.\d+)(%)?$/.exec(String(value).trim());
  if (!match) return undefined;
  const result = Number(match[1]) / (match[2] ? 100 : 100000);
  return Number.isFinite(result) ? result : undefined;
}

/** Apply picture alpha to the image, not to the shape's text or sibling paint.
 * Multipliers <= 1 are exactly expressible as CSS opacity. Amplification needs
 * SVG alpha transfer (opacity:2 would clamp the multiplier before the pixels).
 * Keep repeated effects as individual stages when amplification is involved.
 */
export function getPictureEffects(blip, id) {
  const factors = asArray(blip?.['a:alphaModFix'])
    .map(effect => percentage(effect?.attrs?.amt)).filter(value => value !== undefined);
  const filters = blip?.['a:duotone'] != null ? ['grayscale(1)'] : [];
  let style = '', definitions = '';
  if (factors.some(value => value > 1)) {
    // id is assembled from internal numeric/context values, never XML markup.
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    definitions = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" style="position:absolute;pointer-events:none;"><defs><filter id="${safeId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
      factors.map(slope => `<feComponentTransfer><feFuncA type="linear" slope="${slope}" intercept="0"/></feComponentTransfer>`).join('') + '</filter></defs></svg>';
    filters.unshift(`url(#${safeId})`);
  } else if (factors.length) {
    style += `opacity:${factors.reduce((result, value) => result * value, 1)};`;
  }
  if (filters.length) style += `filter:${filters.join(' ')};`;
  return { style, definitions };
}
