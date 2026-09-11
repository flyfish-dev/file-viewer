/** OOXML chart caches and literals share the same indexed c:pt representation. */
const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];

const readPoints = source => {
  const cache = source?.['c:strRef']?.['c:strCache'] ?? source?.['c:strLit'] ??
    source?.['c:numRef']?.['c:numCache'] ?? source?.['c:numLit'];
  const points = new Map();
  for (const point of asArray(cache?.['c:pt'])) {
    const rawIndex = point?.attrs?.idx;
    const index = typeof rawIndex === 'number' || /^\d+$/.test(String(rawIndex))
      ? Number(rawIndex) : NaN;
    if (Number.isSafeInteger(index) && index >= 0) {
      points.set(index, point['c:v']);
    }
  }
  return points;
};

const asNumber = value => {
  if (value == null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function extractChartData(seriesNode) {
  const series = asArray(seriesNode);
  if (!series.length) return [];

  // Preserve the existing scatter message contract, while accepting numLit too.
  if (series.length === 1 && series[0]?.['c:xVal']) {
    const xs = readPoints(series[0]['c:xVal']);
    const ys = readPoints(series[0]['c:yVal']);
    const indices = [...new Set([...xs.keys(), ...ys.keys()])].sort((a, b) => a - b);
    return [indices.map(index => asNumber(xs.get(index))), indices.map(index => asNumber(ys.get(index)))];
  }

  const rows = series.map((item, index) => {
    const tx = item?.['c:tx'];
    return {
      key: tx?.['c:v'] ?? readPoints(tx).get(0) ?? index,
      categories: readPoints(item?.['c:cat']),
      numbers: readPoints(item?.['c:val']),
    };
  });
  // Align every series on the same category slots. Never allocate from untrusted
  // ptCount or idx: a sparse index of 2^32 must not create a giant JS array.
  const labels = new Map();
  const indices = new Set();
  for (const row of rows) {
    for (const [index, label] of row.categories) {
      if (!labels.has(index)) labels.set(index, label);
      indices.add(index);
    }
    for (const index of row.numbers.keys()) indices.add(index);
  }
  const ordered = [...indices].sort((a, b) => a - b);
  const xlabels = Object.fromEntries(ordered.map((index, position) => [position, labels.get(index) ?? String(index)]));
  return rows.map(row => ({
    key: row.key,
    values: ordered.map(index => ({ x: String(index), y: asNumber(row.numbers.get(index)) })),
    xlabels,
  }));
}
