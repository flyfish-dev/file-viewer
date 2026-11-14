/** Optional, self-hosted XML Schema 1.0 / XSLT 1.0 profiles. */
export interface FileViewerXmlProfile {
  id: string
  match: {
    rootNamespace?: { enabled: boolean; root?: string; namespace?: string }
    xsd?: { enabled: boolean }
  }
  /** Relative to the manifest URL (or baseUrl for inline profiles). */
  xsd?: string
  xslt: string
}

export interface FileViewerXmlManifest {
  profiles: FileViewerXmlProfile[]
}

export type FileViewerXmlDiagnosticCode =
  | 'invalid-xml' | 'invalid-manifest' | 'resource-error' | 'unsafe-resource'
  | 'limit-exceeded' | 'timeout' | 'cancelled' | 'no-match' | 'ambiguous-profile'
  | 'root-mismatch' | 'xsd-invalid' | 'engine-error' | 'transform-error' | 'profile-selected'
  | 'capability-unavailable'

export interface FileViewerXmlDiagnostic {
  code: FileViewerXmlDiagnosticCode
  message: string
  profileId?: string
}

export interface FileViewerXmlOptions {
  /** Opt in with a same-origin HTTP(S) manifest. Redirects are rejected. */
  profilesUrl?: string
  /** Alternative to profilesUrl. Supplying both is a configuration error. */
  profiles?: FileViewerXmlProfile[]
  /** Base for inline profiles' resource paths; defaults to the document URL. */
  baseUrl?: string
  runtime?: {
    /** xmllint-wasm@5.3.0 browser worker; xmllint.wasm must be beside it. */
    xsdWorkerUrl?: string
    /** xslt-polyfill@1.0.29 dist/xslt-wasm.js, containing embedded WASM. */
    xsltModuleUrl?: string
  }
  /** Whole profile operation, including downloads; default 15s, ceiling 60s. */
  timeoutMs?: number
  /** Limits may lower the hard ceilings but cannot disable them. */
  limits?: {
    maxXmlBytes?: number
    maxResourceBytes?: number
    maxOutputBytes?: number
    maxProfiles?: number
    maxTotalResourceBytes?: number
  }
  initialView?: 'source' | 'rendered'
  /** Labels can be localized without replacing the source renderer. */
  labels?: { viewSource?: string; viewRendered?: string; diagnostics?: string }
  /** Also available on the rendered instance; never contains generated HTML. */
  onDiagnostic?: (diagnostic: FileViewerXmlDiagnostic) => void
}
