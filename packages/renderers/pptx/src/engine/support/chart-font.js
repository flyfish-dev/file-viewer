const many = value => value == null ? [] : Array.isArray(value) ? value : [value];
const flag = value => value == null ? undefined : ['1', 'true'].includes(String(value));

/** Bounded, serializable DrawingML text properties shared by main and Worker. */
export function extractChartFont(node, resolveColor, resolveFont) {
  const paragraph = many(node?.['a:p'])[0];
  const defaults = paragraph?.['a:pPr']?.['a:defRPr'];
  const run = many(paragraph?.['a:r'])[0]?.['a:rPr'];
  const properties = { ...defaults, ...run, attrs: { ...defaults?.attrs, ...run?.attrs } };
  if (!defaults && !run) return undefined;
  const size = Number(properties.attrs.sz);
  const color = properties['a:solidFill'] ? resolveColor?.(properties['a:solidFill']) : undefined;
  const family = node => {
    const value = typeof node?.attrs?.typeface === 'string' ? node.attrs.typeface.slice(0, 512) : undefined;
    if (!value) return undefined;
    const resolved = resolveFont?.(value, properties.attrs.lang);
    return typeof resolved === 'string' && resolved ? resolved.slice(0, 512) : value;
  };
  return {
    family: family(properties['a:latin']),
    eastAsianFamily: family(properties['a:ea']),
    complexScriptFamily: family(properties['a:cs']),
    sizePt: Number.isFinite(size) && size > 0 && size <= 400000 ? size / 100 : undefined,
    bold: flag(properties.attrs.b),
    italic: flag(properties.attrs.i),
    color: /^(?:[\da-f]{6}|[\da-f]{8})$/i.test(String(color)) ? `#${color}` : undefined,
  };
}
