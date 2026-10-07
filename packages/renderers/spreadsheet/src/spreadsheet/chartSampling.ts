export const MAX_TRANSFERRED_LINE_CHART_POINTS = 4096

const sampleExtrema = (values: number[], maxPoints: number) => {
  const pointLimit = Math.max(2, Math.floor(maxPoints))
  if (values.length <= pointLimit) {
    return values.map((_, index) => index)
  }

  if (pointLimit < 4) return [0, values.length - 1]

  const bucketCount = Math.max(1, Math.floor((pointLimit - 2) / 2))
  const bucketSize = (values.length - 2) / bucketCount
  const result = [0]

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.max(1, Math.floor(1 + bucket * bucketSize))
    const end = Math.min(values.length - 1, Math.ceil(1 + (bucket + 1) * bucketSize))
    let minIndex = -1
    let maxIndex = -1

    for (let index = start; index < end; index += 1) {
      if (!Number.isFinite(values[index])) continue
      if (minIndex < 0 || values[index] < values[minIndex]) {
        minIndex = index
      }
      if (maxIndex < 0 || values[index] > values[maxIndex]) {
        maxIndex = index
      }
    }

    if (minIndex < 0) continue
    if (minIndex <= maxIndex) {
      result.push(minIndex, maxIndex)
    } else {
      result.push(maxIndex, minIndex)
    }
  }

  result.push(values.length - 1)
  return Array.from(new Set(result))
}

/** Keep absent points as explicit separators through both transfer and SVG
 * sampling. Otherwise an omitted gap becomes an invented connecting segment.
 * Reserve at most one separator per retained interval, keeping a strict budget.
 */
export const extremaPointIndexes = (values: number[], maxPoints: number, spanBlankIndexes: number[] = []) => {
  const limit = Math.max(2, Number.isFinite(maxPoints) ? Math.floor(maxPoints) : 2)
  if (values.length <= limit) return Array.from({length: values.length}, (_, i) => i)
  const hasGaps = values.some(value => !Number.isFinite(value))
  if (!hasGaps) return sampleExtrema(values, limit)
  const spanning = new Set(spanBlankIndexes)
  const hardGap = (index: number) => !Number.isFinite(values[index]) && !spanning.has(index)
  if (limit === 2) {
    // There is no room for both endpoints and a separator. Prefer dropping one
    // endpoint over inventing a connecting line across an absent interval.
    const gap = values.findIndex((_, index) => hardGap(index))
    return gap > 0 && gap < values.length - 1 ? [0, gap] : [0, values.length - 1]
  }
  const anchors = sampleExtrema(values, Math.max(2, Math.floor((limit + 1) / 2)))
  const result = [anchors[0]]
  for (let i = 1; i < anchors.length; i++) {
    const left = anchors[i - 1], right = anchors[i]
    if (!hardGap(left) && !hardGap(right)) {
      let blank = -1
      for (let j = left + 1; j < right; j++) {
        if (hardGap(j)) { blank = j; break }
        if (blank < 0 && !Number.isFinite(values[j])) blank = j
      }
      if (blank >= 0) result.push(blank)
    }
    result.push(right)
  }
  return result
}
