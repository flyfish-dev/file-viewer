/** Chart-family metadata, kept separate from the existing cache message contract. */
const many = value => value == null ? [] : Array.isArray(value) ? value : [value];
const valueOf = (node, key) => node?.[key]?.attrs?.val;
const unsigned = (value, min, max, fallback) => {
  if (!/^\d+$/.test(String(value))) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

export function extractChartOptions(group, chart, resolveColor) {
  const grouping = valueOf(group, 'c:grouping');
  const legend = chart?.['c:legend'];
  const position = valueOf(legend, 'c:legendPos');
  const safeColor = properties => {
    if (properties?.['a:noFill'] != null) return 'transparent';
    if (!properties?.['a:solidFill']) return undefined;
    const color = resolveColor?.(properties['a:solidFill']);
    return /^(?:[\da-f]{6}|[\da-f]{8})$/i.test(String(color)) ? `#${color}` : undefined;
  };
  return {
    grouping: ['standard', 'clustered', 'stacked', 'percentStacked'].includes(grouping) ? grouping : undefined,
    holeSize: unsigned(valueOf(group, 'c:holeSize'), 10, 90, 50),
    firstSliceAngle: unsigned(valueOf(group, 'c:firstSliceAng'), 0, 360, 0),
    legend: { show: legend != null, position: ['l', 'r', 't', 'b', 'tr'].includes(position) ? position : 'r' },
    // Indexed point fills must not move when labels are repeated or blank.
    series: many(group?.['c:ser']).map(series => ({
      color: safeColor(series?.['c:spPr']),
      points: Object.fromEntries(many(series?.['c:dPt']).flatMap(point => {
        const index = unsigned(valueOf(point, 'c:idx'), 0, Number.MAX_SAFE_INTEGER, undefined);
        const color = safeColor(point?.['c:spPr']);
        return index == null || !color ? [] : [[index, color]];
      })),
    })),
  };
}
