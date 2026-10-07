/** DrawingML built-in Medium Style 2, Accent 1–6. A producer may reference a
 * built-in GUID without serializing its definition. Unknown styles are not
 * guessed; an explicit definition in tableStyles.xml always takes precedence.
 * Return fresh records because the table renderer adds per-instance flags. */
const MEDIUM_STYLE_2_ACCENTS = new Map([
  ['{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}', 'accent1'],
  ['{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}', 'accent2'],
  ['{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}', 'accent3'],
  ['{00A15C55-8517-42AA-B614-E9B94910E393}', 'accent4'],
  ['{7DF18680-E054-41AD-8BC1-D1AEF772440D}', 'accent5'],
  ['{93296810-A885-4BE3-A3E7-6D5BEEA58F35}', 'accent6']
])

export function createBuiltinDrawingMlTableStyle(styleId) {
  const accent = MEDIUM_STYLE_2_ACCENTS.get(
    String(styleId || '')
      .trim()
      .toUpperCase()
  )
  if (!accent) return undefined
  const color = (value, tint) => ({
    'a:schemeClr': {
      attrs: { val: value },
      ...(tint === undefined ? {} : { 'a:tint': { attrs: { val: String(tint) } } })
    }
  })
  const border = (width = 12700) => ({
    'a:ln': {
      attrs: { w: String(width), cmpd: 'sng' },
      'a:solidFill': color('lt1')
    }
  })
  const fill = (tint) => ({ 'a:solidFill': color(accent, tint) })
  const text = (value, bold = false) => ({
    ...(bold ? { attrs: { b: 'on' } } : {}),
    'a:fontRef': { attrs: { idx: 'minor' }, 'a:prstClr': { attrs: { val: 'black' } } },
    ...color(value)
  })
  const band = () => ({ 'a:tcStyle': { 'a:tcBdr': {}, 'a:fill': fill(40000) } })
  const edge = (side) => ({
    'a:tcTxStyle': text('lt1', true),
    'a:tcStyle': { 'a:fill': fill(), 'a:tcBdr': side ? { [`a:${side}`]: border(38100) } : {} }
  })
  return {
    attrs: { styleId, styleName: `Medium Style 2 - ${accent}` },
    'a:wholeTbl': {
      'a:tcTxStyle': text('dk1'),
      'a:tcStyle': {
        'a:fill': fill(20000),
        'a:tcBdr': Object.fromEntries(
          ['left', 'right', 'top', 'bottom', 'insideH', 'insideV'].map((side) => [
            `a:${side}`,
            border()
          ])
        )
      }
    },
    'a:band1H': band(),
    'a:band2H': { 'a:tcStyle': { 'a:tcBdr': {} } },
    'a:band1V': band(),
    'a:band2V': { 'a:tcStyle': { 'a:tcBdr': {} } },
    'a:firstCol': edge(),
    'a:lastCol': edge(),
    'a:firstRow': edge('bottom'),
    'a:lastRow': edge('top')
  }
}
