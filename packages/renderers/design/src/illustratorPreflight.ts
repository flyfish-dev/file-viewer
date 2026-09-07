const startsWithAscii = (buffer: ArrayBuffer, value: string) => {
  if (buffer.byteLength < value.length) return false
  const bytes = new Uint8Array(buffer, 0, value.length)
  return value.split('').every((character, index) => bytes[index] === character.charCodeAt(0))
}

const hasIllustratorNamespace = (source: string) => {
  for (const attribute of source.matchAll(/(?:^|[\s<])xmlns(?::[a-z_][a-z0-9_.-]*)?\s*=\s*["']/g)) {
    const start = attribute.index! + attribute[0].length
    const end = source.indexOf(attribute[0].charAt(attribute[0].length - 1), start)
    if (end < start || end - start > 256) continue
    if (source.slice(start, end) === 'http://ns.adobe.com/illustrator/') return true
  }
  return false
}

export const inspectIllustratorPdfSurface = (buffer: ArrayBuffer) => {
  const pdfHeader = startsWithAscii(buffer, '%PDF-')
  if (!pdfHeader) {
    return { pdfHeader, illustratorEvidence: false, noPdfCompatibilityWarning: false }
  }
  const probeLength = Math.min(buffer.byteLength, 4 * 1024 * 1024)
  const probe = new TextDecoder('latin1').decode(new Uint8Array(buffer, 0, probeLength)).toLowerCase()
  const noPdfCompatibilityWarning =
    probe.includes('saved without pdf content') ||
    probe.includes('create pdf compatible file') && probe.includes('illustrator') && probe.includes('without pdf')
  const illustratorEvidence =
    // This is a local format hint, never a network URL allowlist.
    hasIllustratorNamespace(probe) ||
    probe.includes('/aiprivatedata') ||
    probe.includes('application/vnd.adobe.illustrator') ||
    probe.includes('adobe illustrator')
  return { pdfHeader, illustratorEvidence, noPdfCompatibilityWarning }
}
