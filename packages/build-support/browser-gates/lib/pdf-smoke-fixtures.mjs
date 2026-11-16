import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

export const syntheticPdfIdentityFontRepairSample = 'pdf-identity-font-repair.pdf'
export const syntheticPdfIdentityFontRepairText = 'PDF0123456789'

export const createSyntheticPdfIdentityFontRepair = () => {
  const fontBytes = readFileSync(resolve(
    sourceRoot,
    'packages/renderers/typst/assets/fonts/DejaVuSansMono.ttf'
  ))
  // DejaVu Sans Mono maps PDF to 51/39/41 and digits 0-9 to glyph IDs 19-28.
  // Identity-H without ToUnicode exposes the digit IDs as control characters.
  const glyphIds = [51, 39, 41, ...Array.from({ length: 10 }, (_value, index) => index + 19)]
  const encodedText = glyphIds
    .map(glyphId => glyphId.toString(16).padStart(4, '0'))
    .join('')
  const pageContent = `BT /F1 36 Tf 54 420 Td <${encodedText}> Tj ET`
  const stream = data => {
    const body = Buffer.isBuffer(data) ? data.toString('binary') : data
    return `<< /Length ${Buffer.byteLength(body, 'binary')} >>\nstream\n${body}\nendstream`
  }
  const fontFileStream = `<< /Length ${fontBytes.byteLength} /Length1 ${fontBytes.byteLength} >>\nstream\n${fontBytes.toString('binary')}\nendstream`
  const widths = glyphIds.map(() => '600').join(' ')
  const descriptorMetrics = '/Flags 4 /FontBBox [-600 -400 1400 1200] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 729 /StemV 80'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 540] /Resources << /Font << /F1 7 0 R /F2 10 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 540] /Resources << /Font << /F1 7 0 R /F2 10 0 R >> >> /Contents 6 0 R >>',
    stream(pageContent),
    stream(pageContent),
    '<< /Type /Font /Subtype /Type0 /BaseFont /MicrosoftYaHei,Bold /Encoding /Identity-H /DescendantFonts [8 0 R] >>',
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /MicrosoftYaHei,Bold /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 9 0 R /DW 600 /W [19 [${widths}]] /CIDToGIDMap /Identity >>`,
    `<< /Type /FontDescriptor /FontName /MicrosoftYaHei,Bold /FontFamily (MicrosoftYaHei) ${descriptorMetrics} >>`,
    '<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+MicrosoftYaHei /Encoding /Identity-H /DescendantFonts [11 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+MicrosoftYaHei /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 12 0 R /DW 600 /CIDToGIDMap /Identity >>',
    `<< /Type /FontDescriptor /FontName /AAAAAA+MicrosoftYaHei /FontFamily (MicrosoftYaHei) ${descriptorMetrics} /FontFile2 13 0 R >>`,
    fontFileStream
  ]
  let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf, 'binary')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'binary')
}
