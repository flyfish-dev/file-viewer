import type { Document as XmlDocument, Element as XmlElement } from '@xmldom/xmldom'
import JSZip from 'jszip'
import { utils } from 'styled-exceljs'
import type { SheetCellImage } from '../type.js'
import {
  childElements,
  elementsByLocal,
  loadRelationships,
  loadXml,
  localName,
  relationById,
  relationshipId,
  type Relationship
} from './chartParser.js'

const WORKBOOK_PART = 'xl/workbook.xml'
const CONTENT_TYPES_PART = '[Content_Types].xml'
const WORKSHEET_RELATIONSHIP_SUFFIX = '/worksheet'
const METADATA_RELATIONSHIP_SUFFIX = '/sheetmetadata'
const RICH_VALUE_RELATIONSHIP_SUFFIX = '/rdrichvalue'
const RICH_VALUE_STRUCTURE_RELATIONSHIP_SUFFIX = '/rdrichvaluestructure'
const RICH_VALUE_RELATION_LIST_SUFFIX = '/richvaluerel'
const WPS_CELL_IMAGE_RELATIONSHIP = 'http://www.wps.cn/officeDocument/2017/relationships/cellimage'
const RICH_VALUE_METADATA_NAME = 'XLRICHVALUE'
const LOCAL_IMAGE_STRUCTURE_TYPE = '_localImage'
const LOCAL_IMAGE_KEY_SUFFIX = 'LocalImageIdentifier'

type RichValueStructure = {
  type: string
  keys: string[]
}

type RichValueImage = {
  id: string
  src: string
  contentType: string
}

type ContentTypes = {
  defaults: Map<string, string>
  overrides: Map<string, string>
}

const textContent = (element: XmlElement | undefined) => element?.textContent?.trim() || ''

const directChildrenByLocal = (node: XmlElement | XmlDocument | null | undefined, name: string) => (
  childElements(node).filter((child) => localName(child) === name)
)

const firstDescendantByLocal = (node: XmlElement | null | undefined, name: string) => (
  elementsByLocal(node, name)[0]
)

const relationshipBySuffix = (relationships: Relationship[], suffix: string) => (
  relationships.find((relationship) => relationship.type.toLowerCase().endsWith(suffix))
)

const parseContentTypes = (document: XmlDocument | null): ContentTypes => {
  const defaults = new Map<string, string>()
  const overrides = new Map<string, string>()
  if (!document) {
    return { defaults, overrides }
  }

  elementsByLocal(document.documentElement, 'Default').forEach((element) => {
    const extension = (element.getAttribute('Extension') || '').toLowerCase()
    const contentType = element.getAttribute('ContentType') || ''
    if (extension && contentType) {
      defaults.set(extension, contentType)
    }
  })
  elementsByLocal(document.documentElement, 'Override').forEach((element) => {
    const partName = (element.getAttribute('PartName') || '').replace(/^\//, '')
    const contentType = element.getAttribute('ContentType') || ''
    if (partName && contentType) {
      overrides.set(partName, contentType)
    }
  })

  return { defaults, overrides }
}

const fallbackImageContentType = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase() || ''
  switch (extension) {
    case 'bmp':
      return 'image/bmp'
    case 'gif':
      return 'image/gif'
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'svg':
      return 'image/svg+xml'
    case 'webp':
      return 'image/webp'
    default:
      return ''
  }
}

const getContentType = (path: string, contentTypes: ContentTypes) => {
  const override = contentTypes.overrides.get(path)
  if (override) {
    return override
  }
  const extension = path.split('.').pop()?.toLowerCase() || ''
  return contentTypes.defaults.get(extension) || fallbackImageContentType(path)
}

const parseRichValueStructures = (document: XmlDocument | null): RichValueStructure[] => {
  if (!document) {
    return []
  }
  return directChildrenByLocal(document.documentElement, 's').map((structure) => ({
    type: structure.getAttribute('t') || '',
    keys: directChildrenByLocal(structure, 'k').map((key) => key.getAttribute('n') || '')
  }))
}

const parseRichValues = (document: XmlDocument | null) => {
  if (!document) {
    return []
  }
  return directChildrenByLocal(document.documentElement, 'rv').map((richValue) => ({
    structureIndex: Number(richValue.getAttribute('s')),
    values: directChildrenByLocal(richValue, 'v').map((value) => Number(textContent(value)))
  }))
}

const parseRichValueRelationshipIds = (document: XmlDocument | null) => {
  if (!document) {
    return []
  }
  return directChildrenByLocal(document.documentElement, 'rel').map(relationshipId)
}

const parseMetadataRichValueIndexes = (document: XmlDocument | null) => {
  if (!document) {
    return []
  }

  const metadataTypes = firstDescendantByLocal(document.documentElement, 'metadataTypes')
  const richValueMetadataType = directChildrenByLocal(metadataTypes, 'metadataType')
    .findIndex((metadataType) => metadataType.getAttribute('name') === RICH_VALUE_METADATA_NAME) + 1
  if (richValueMetadataType <= 0) {
    return []
  }

  const futureMetadata = elementsByLocal(document.documentElement, 'futureMetadata')
    .find((element) => element.getAttribute('name') === RICH_VALUE_METADATA_NAME)
  const futureRichValueIndexes = directChildrenByLocal(futureMetadata, 'bk').map((block) => {
    const richValueBlock = firstDescendantByLocal(block, 'rvb')
    const value = Number(richValueBlock?.getAttribute('i'))
    return Number.isInteger(value) && value >= 0 ? value : undefined
  })

  const valueMetadata = firstDescendantByLocal(document.documentElement, 'valueMetadata')
  return directChildrenByLocal(valueMetadata, 'bk').map((block) => {
    const reference = directChildrenByLocal(block, 'rc').find(
      (element) => Number(element.getAttribute('t')) === richValueMetadataType
    )
    const futureIndex = Number(reference?.getAttribute('v'))
    return Number.isInteger(futureIndex) && futureIndex >= 0
      ? futureRichValueIndexes[futureIndex]
      : undefined
  })
}

const attributeValue = (tag: string, name: string) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = tag.match(new RegExp(
    `(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    'i'
  ))
  return match?.[1] ?? match?.[2] ?? ''
}

const parseWorksheetCellMetadata = (xml: string) => {
  const result: Array<{ ref: string; metadataIndex: number }> = []
  const cellTagPattern = /<(?:[A-Za-z_][\w.-]*:)?c\b[^>]*>/gi
  for (const match of xml.matchAll(cellTagPattern)) {
    const tag = match[0]
    const ref = attributeValue(tag, 'r')
    const metadataText = attributeValue(tag, 'vm')
    const metadataValue = Number(metadataText)
    if (!ref || !metadataText || !Number.isInteger(metadataValue) || metadataValue < 0) {
      continue
    }
    // Cell metadata indexes are one-based in OOXML. Accept zero as a
    // producer-tolerance fallback without shifting it below zero.
    result.push({ ref, metadataIndex: metadataValue > 0 ? metadataValue - 1 : 0 })
  }
  return result
}

const decodeFormulaText = (value: string) => value
  .replace(/&quot;/gi, '"')
  .replace(/&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')

const parseWorksheetDispImages = (xml: string) => {
  const result: Array<{ ref: string; imageId: string }> = []
  const cellPattern = /<(?:[A-Za-z_][\w.-]*:)?c\b[^>]*>[\s\S]*?<\/(?:[A-Za-z_][\w.-]*:)?c\s*>/gi
  for (const match of xml.matchAll(cellPattern)) {
    const cellXml = match[0]
    const startTag = cellXml.slice(0, cellXml.indexOf('>') + 1)
    const ref = attributeValue(startTag, 'r')
    const formulaMatch = cellXml.match(
      /<(?:[A-Za-z_][\w.-]*:)?f\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?f\s*>/i
    )
    const formula = decodeFormulaText(formulaMatch?.[1]?.trim() || '')
    const imageId = formula.match(
      /(?:_xlfn\.)?(?:_xlws\.)?DISPIMG\s*\(\s*["']([^"']+)["']/i
    )?.[1]
    if (ref && imageId) {
      result.push({ ref, imageId })
    }
  }
  return result
}

const embeddedRelationshipId = (element: XmlElement | undefined) => {
  if (!element) {
    return ''
  }
  return (
    element.getAttribute('r:embed') ||
    element.getAttributeNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'embed'
    ) ||
    element.getAttribute('embed') ||
    ''
  )
}

const loadWpsCellImages = async (
  zip: JSZip,
  relationship: Relationship | undefined,
  contentTypes: ContentTypes
) => {
  const result = new Map<string, RichValueImage>()
  if (!relationship) {
    return result
  }
  const [document, relationships] = await Promise.all([
    loadXml(zip, relationship.target),
    loadRelationships(zip, relationship.target)
  ])
  if (!document) {
    return result
  }

  await Promise.all(elementsByLocal(document.documentElement, 'cellImage').map(async (cellImage) => {
    const nonVisualProperties = firstDescendantByLocal(cellImage, 'cNvPr')
    const imageId = nonVisualProperties?.getAttribute('name') || ''
    const blip = firstDescendantByLocal(cellImage, 'blip')
    const imageRelationship = relationById(relationships, embeddedRelationshipId(blip))
    if (!imageId || !imageRelationship) {
      return
    }
    const contentType = getContentType(imageRelationship.target, contentTypes)
    const imageFile = zip.file(imageRelationship.target)
    if (!imageFile || !contentType.startsWith('image/')) {
      return
    }
    result.set(imageId, {
      id: imageId,
      src: `data:${contentType};base64,${await imageFile.async('base64')}`,
      contentType
    })
  }))

  return result
}

const loadRichValueImages = async (
  zip: JSZip,
  structures: RichValueStructure[],
  richValues: ReturnType<typeof parseRichValues>,
  relationshipIds: string[],
  relationships: Relationship[],
  contentTypes: ContentTypes
) => {
  const result = new Map<number, RichValueImage>()

  await Promise.all(richValues.map(async (richValue, richValueIndex) => {
    const structure = structures[richValue.structureIndex]
    if (!structure || structure.type !== LOCAL_IMAGE_STRUCTURE_TYPE) {
      return
    }
    const imageKeyIndex = structure.keys.findIndex((key) => key.endsWith(LOCAL_IMAGE_KEY_SUFFIX))
    const imageRelationshipIndex = richValue.values[imageKeyIndex]
    if (imageKeyIndex < 0 || !Number.isInteger(imageRelationshipIndex) || imageRelationshipIndex < 0) {
      return
    }

    const imageRelationshipId = relationshipIds[imageRelationshipIndex]
    const imageRelationship = relationById(relationships, imageRelationshipId)
    if (!imageRelationship) {
      return
    }
    const contentType = getContentType(imageRelationship.target, contentTypes)
    const imageFile = zip.file(imageRelationship.target)
    if (!imageFile || !contentType.startsWith('image/')) {
      return
    }
    const base64 = await imageFile.async('base64')
    result.set(richValueIndex, {
      id: imageRelationship.id,
      src: `data:${contentType};base64,${base64}`,
      contentType
    })
  }))

  return result
}

export const parseSpreadsheetCellImages = async (data: ArrayBuffer) => {
  const zip = await JSZip.loadAsync(data)
  const [workbookDocument, workbookRelationships, contentTypesDocument] = await Promise.all([
    loadXml(zip, WORKBOOK_PART),
    loadRelationships(zip, WORKBOOK_PART),
    loadXml(zip, CONTENT_TYPES_PART)
  ])
  const result: Record<string, SheetCellImage[]> = {}
  if (!workbookDocument) {
    return result
  }

  const metadataRelationship = relationshipBySuffix(
    workbookRelationships,
    METADATA_RELATIONSHIP_SUFFIX
  )
  const richValueRelationship = relationshipBySuffix(
    workbookRelationships,
    RICH_VALUE_RELATIONSHIP_SUFFIX
  )
  const richValueStructureRelationship = relationshipBySuffix(
    workbookRelationships,
    RICH_VALUE_STRUCTURE_RELATIONSHIP_SUFFIX
  )
  const richValueRelationListRelationship = relationshipBySuffix(
    workbookRelationships,
    RICH_VALUE_RELATION_LIST_SUFFIX
  )
  const contentTypes = parseContentTypes(contentTypesDocument)
  let metadataRichValueIndexes: Array<number | undefined> = []
  let richValueImages = new Map<number, RichValueImage>()
  if (
    metadataRelationship &&
    richValueRelationship &&
    richValueStructureRelationship &&
    richValueRelationListRelationship
  ) {
    const [
      metadataDocument,
      richValueDocument,
      richValueStructureDocument,
      richValueRelationListDocument,
      richValueRelationships
    ] = await Promise.all([
      loadXml(zip, metadataRelationship.target),
      loadXml(zip, richValueRelationship.target),
      loadXml(zip, richValueStructureRelationship.target),
      loadXml(zip, richValueRelationListRelationship.target),
      loadRelationships(zip, richValueRelationListRelationship.target)
    ])
    metadataRichValueIndexes = parseMetadataRichValueIndexes(metadataDocument)
    richValueImages = await loadRichValueImages(
      zip,
      parseRichValueStructures(richValueStructureDocument),
      parseRichValues(richValueDocument),
      parseRichValueRelationshipIds(richValueRelationListDocument),
      richValueRelationships,
      contentTypes
    )
  }

  const wpsCellImageRelationship = workbookRelationships.find(
    (relationship) => (
      relationship.type.toLowerCase() === WPS_CELL_IMAGE_RELATIONSHIP.toLowerCase()
    )
  )
  const wpsCellImages = await loadWpsCellImages(
    zip,
    wpsCellImageRelationship,
    contentTypes
  )
  if (!richValueImages.size && !wpsCellImages.size) {
    return result
  }

  for (const sheet of elementsByLocal(workbookDocument.documentElement, 'sheet')) {
    const name = sheet.getAttribute('name') || ''
    const worksheetRelationship = relationById(workbookRelationships, relationshipId(sheet))
    const worksheetFile = worksheetRelationship?.type.toLowerCase().endsWith(
      WORKSHEET_RELATIONSHIP_SUFFIX
    )
      ? zip.file(worksheetRelationship.target)
      : null
    if (!name || !worksheetFile) {
      continue
    }

    const worksheetXml = await worksheetFile.async('text')
    const imagesByRef = new Map<string, RichValueImage>()
    parseWorksheetCellMetadata(worksheetXml).forEach(({ ref, metadataIndex }) => {
      const richValueIndex = metadataRichValueIndexes[metadataIndex]
      const image = richValueIndex === undefined ? undefined : richValueImages.get(richValueIndex)
      if (image) {
        imagesByRef.set(ref, image)
      }
    })
    parseWorksheetDispImages(worksheetXml).forEach(({ ref, imageId }) => {
      const image = wpsCellImages.get(imageId)
      if (image && !imagesByRef.has(ref)) {
        imagesByRef.set(ref, image)
      }
    })

    const images = Array.from(imagesByRef).flatMap(([ref, image]): SheetCellImage[] => {
      try {
        const cell = utils.decode_cell(ref)
        return [{
          ...image,
          id: `cell-image-${ref}-${image.id}`,
          row: cell.r,
          col: cell.c
        }]
      } catch {
        return []
      }
    })
    if (images.length) {
      result[name] = images
    }
  }

  return result
}
