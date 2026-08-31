export const MAX_TRANSFERRED_LINE_CHART_POINTS = 4096

export const extremaPointIndexes = (values: number[], maxPoints: number) => {
  const pointLimit = Math.max(2, Math.floor(maxPoints))
  if (values.length <= pointLimit) {
    return values.map((_, index) => index)
  }

  const bucketCount = Math.max(1, Math.floor((pointLimit - 2) / 2))
  const bucketSize = (values.length - 2) / bucketCount
  const result = [0]

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.max(1, Math.floor(1 + bucket * bucketSize))
    const end = Math.min(values.length - 1, Math.ceil(1 + (bucket + 1) * bucketSize))
    let minIndex = start
    let maxIndex = start

    for (let index = start + 1; index < end; index += 1) {
      if (values[index] < values[minIndex]) {
        minIndex = index
      }
      if (values[index] > values[maxIndex]) {
        maxIndex = index
      }
    }

    if (minIndex <= maxIndex) {
      result.push(minIndex, maxIndex)
    } else {
      result.push(maxIndex, minIndex)
    }
  }

  result.push(values.length - 1)
  return Array.from(new Set(result))
}
