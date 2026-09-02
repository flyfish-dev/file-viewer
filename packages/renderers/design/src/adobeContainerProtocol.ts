import type { AdobePaletteDocument, AdobePaletteFormat, AdobePaletteParseLimits } from './designResourceParser.js'
import type { FlaContainerLimits, FlaDocumentPreview } from './flaContainer.js'
import type { InDesignContainerLimits, InDesignDocumentPreview } from './indesignContainer.js'
import type {
  InDesignExchangeDocument,
  InDesignExchangeFormat,
  InDesignExchangeLimits,
} from './indesignExchangeProtocol.js'
import type { XdContainerLimits, XdDocumentPreview } from './xdContainer.js'

export type AdobeContainerWorkerPayload =
  | {
      type: 'parse'
      format: 'xd'
      limits?: Partial<XdContainerLimits>
    }
  | {
      type: 'parse'
      format: 'indd' | 'indt'
      limits?: Partial<InDesignContainerLimits>
    }
  | {
      type: 'parse'
      format: AdobePaletteFormat
      limits: AdobePaletteParseLimits
    }
  | {
      type: 'parse'
      format: 'fla' | 'xfl'
      limits?: Partial<FlaContainerLimits>
    }
  | {
      type: 'parse'
      format: InDesignExchangeFormat
      limits?: Partial<InDesignExchangeLimits>
    }

export type AdobeContainerWorkerRequest = AdobeContainerWorkerPayload & {
  id: number
  buffer: ArrayBuffer
}

export type AdobeContainerWorkerResult =
  | XdDocumentPreview
  | InDesignDocumentPreview
  | AdobePaletteDocument
  | FlaDocumentPreview
  | InDesignExchangeDocument

export type AdobeContainerWorkerResponse =
  | { id: number; ok: true; result: AdobeContainerWorkerResult }
  | { id: number; ok: false; error: { name: string; message: string } }
