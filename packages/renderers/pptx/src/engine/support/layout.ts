const CSS_PX_PER_INCH = 96
const EMU_PER_INCH = 914_400

const emuToPx = (value: number) => value * CSS_PX_PER_INCH / EMU_PER_INCH

export const DRAWINGML_SINGLE_LINE_HEIGHT = 1.2

export const DRAWINGML_TABLE_CELL_DEFAULT_INSETS = Object.freeze({
  top: emuToPx(45_720),
  right: emuToPx(91_440),
  bottom: emuToPx(45_720),
  left: emuToPx(91_440),
})

export type DrawingMlTableCellInsetAttributes = Partial<Record<
  'marT' | 'marR' | 'marB' | 'marL',
  string | number
>>

const resolveInset = (value: string | number | undefined, fallback: number) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? emuToPx(numeric) : fallback
}

/** Resolve the CT_TableCellProperties insets, including ECMA-376 defaults. */
export const resolveDrawingMlTableCellInsets = (
  attributes: DrawingMlTableCellInsetAttributes = {},
) => ({
  top: resolveInset(attributes.marT, DRAWINGML_TABLE_CELL_DEFAULT_INSETS.top),
  right: resolveInset(attributes.marR, DRAWINGML_TABLE_CELL_DEFAULT_INSETS.right),
  bottom: resolveInset(attributes.marB, DRAWINGML_TABLE_CELL_DEFAULT_INSETS.bottom),
  left: resolveInset(attributes.marL, DRAWINGML_TABLE_CELL_DEFAULT_INSETS.left),
})

export type DrawingMlTextDirection =
  | 'horz'
  | 'vert'
  | 'vert270'
  | 'eaVert'
  | 'mongolianVert'
  | 'wordArtVert'
  | 'wordArtVertRtl'
  | string

export interface DrawingMlTextRotationOptions {
  shapeRotation?: number
  textTransformRotation?: number
  bodyRotation?: number
  direction?: DrawingMlTextDirection
  upright?: boolean
}

export const normalizeDrawingMlRotation = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

const directionRotation = (direction: DrawingMlTextDirection | undefined) => {
  switch (direction) {
    case 'vert270':
      return 270
    case 'vert':
    case 'eaVert':
    case 'mongolianVert':
    case 'wordArtVert':
    case 'wordArtVertRtl':
      return 90
    default:
      return 0
  }
}

/**
 * Compose the text frame, body and writing-direction rotations. `txXfrm`
 * replaces the shape transform for SmartArt text; it never implies 90 degrees
 * by itself. `upright` removes the inherited shape rotation while preserving
 * explicit text/body direction.
 */
export const resolveDrawingMlTextRotation = ({
  shapeRotation = 0,
  textTransformRotation,
  bodyRotation = 0,
  direction = 'horz',
  upright = false,
}: DrawingMlTextRotationOptions) => {
  const frameRotation = textTransformRotation ?? (upright ? 0 : shapeRotation)
  return normalizeDrawingMlRotation(frameRotation + bodyRotation + directionRotation(direction))
}
