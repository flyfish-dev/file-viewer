import {
  DOMParser,
  type Element as XmlElement,
  type Node as XmlNode
} from '@xmldom/xmldom'
import type { CellObject } from 'styled-exceljs'
import type { SheetRichTextRun } from '../type.js'
import { indexedColors } from './color.js'

const SPREADSHEETML_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const MAX_RICH_TEXT_XML_LENGTH = 1_000_000
const MAX_RICH_TEXT_RUNS = 10_000
const SYMBOL_FONT_FAMILY = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", sans-serif'
const richTextCache = new WeakMap<object, SheetRichTextRun[] | null>()

const localName = (node: XmlNode) => {
  const name = node.localName || node.nodeName
  return name.split(':').pop() || name
}

const childElements = (node: XmlNode | null | undefined): XmlElement[] => {
  if (!node) {
    return []
  }
  return Array.from(node.childNodes).filter((child): child is XmlElement => child.nodeType === 1)
}

const firstChild = (node: XmlNode | null | undefined, name: string) => {
  return childElements(node).find(child => localName(child) === name)
}

const hasEnabledProperty = (element: XmlElement | undefined) => {
  if (!element) {
    return false
  }
  const value = element.getAttribute('val')
  return value === null || !['0', 'false', 'off', 'none'].includes(value.toLowerCase())
}

const normalizeHexColor = (value: string | null) => {
  if (!value) {
    return undefined
  }
  const clean = value.replace(/^#/, '')
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(clean)) {
    return undefined
  }
  return `#${clean.length === 8 ? clean.slice(2) : clean}`
}

const parseColor = (element: XmlElement | undefined) => {
  const rgb = normalizeHexColor(element?.getAttribute('rgb') || null)
  if (rgb) {
    return rgb
  }

  const indexedAttribute = element?.getAttribute('indexed')
  const indexed = indexedAttribute === null || indexedAttribute === undefined || indexedAttribute === ''
    ? undefined
    : Number(indexedAttribute)
  const indexedValue = Number.isInteger(indexed) ? indexedColors[indexed as number] : undefined
  return indexedValue ? `#${indexedValue.slice(-6)}` : undefined
}

const parseFontSize = (element: XmlElement | undefined) => {
  const value = Number(element?.getAttribute('val'))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const normalizeSymbolText = (text: string, fontFamily: string | undefined) => {
  if (fontFamily?.trim().toLowerCase() !== 'wingdings 2') {
    return { text, fontFamily }
  }

  let converted = false
  const normalized = Array.from(text, character => {
    if (character === '\u00a3') {
      converted = true
      return '\u2610'
    }
    return character
  }).join('')

  return {
    text: normalized,
    fontFamily: converted ? SYMBOL_FONT_FAMILY : fontFamily
  }
}

const parseRun = (element: XmlElement): SheetRichTextRun | undefined => {
  const properties = firstChild(element, 'rPr')
  const rawText = firstChild(element, 't')?.textContent || ''
  if (!rawText) {
    return undefined
  }

  const rawFontFamily = firstChild(properties, 'rFont')?.getAttribute('val') || undefined
  const normalized = normalizeSymbolText(rawText, rawFontFamily)
  const fontSize = parseFontSize(firstChild(properties, 'sz'))
  const color = parseColor(firstChild(properties, 'color'))
  const verticalAlign = firstChild(properties, 'vertAlign')?.getAttribute('val')

  return {
    text: normalized.text,
    ...(normalized.fontFamily ? { fontFamily: normalized.fontFamily } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(color ? { color } : {}),
    ...(hasEnabledProperty(firstChild(properties, 'b')) ? { bold: true } : {}),
    ...(hasEnabledProperty(firstChild(properties, 'i')) ? { italic: true } : {}),
    ...(hasEnabledProperty(firstChild(properties, 'u')) ? { underline: true } : {}),
    ...(hasEnabledProperty(firstChild(properties, 'strike')) ? { strike: true } : {}),
    ...(verticalAlign === 'superscript' ? { verticalAlign: 'super' as const } : {}),
    ...(verticalAlign === 'subscript' ? { verticalAlign: 'sub' as const } : {})
  }
}

export const parseCellRichText = (cell?: CellObject): SheetRichTextRun[] | undefined => {
  if (!cell) {
    return undefined
  }

  const cached = richTextCache.get(cell)
  if (cached !== undefined) {
    return cached || undefined
  }

  const raw = (cell as CellObject & { r?: unknown }).r
  if (typeof raw !== 'string' || !raw.includes('<r') || raw.length > MAX_RICH_TEXT_XML_LENGTH) {
    richTextCache.set(cell, null)
    return undefined
  }

  try {
    const document = new DOMParser().parseFromString(
      `<si xmlns="${SPREADSHEETML_NAMESPACE}">${raw}</si>`,
      'application/xml'
    )
    const root = document.documentElement
    if (!root || localName(root) === 'parsererror') {
      richTextCache.set(cell, null)
      return undefined
    }

    const runElements = childElements(root).filter(child => localName(child) === 'r')
    if (runElements.length > MAX_RICH_TEXT_RUNS) {
      richTextCache.set(cell, null)
      return undefined
    }

    const runs = runElements
      .map(parseRun)
      .filter((run): run is SheetRichTextRun => !!run)

    const result = runs.length ? runs : undefined
    richTextCache.set(cell, result || null)
    return result
  } catch {
    richTextCache.set(cell, null)
    return undefined
  }
}

export const richTextToPlainText = (runs: SheetRichTextRun[] | undefined) => {
  return runs?.map(run => run.text).join('') || ''
}
