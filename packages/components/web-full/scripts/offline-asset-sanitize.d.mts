export interface OfflineAssetSanitizationResult {
  root: string
  checkedFiles: number
  touchedFiles: string[]
  replacementCount: number
}

export declare function isRetainedNativeNoticeBook(original: string, file: string): boolean
export declare function isRetainedPackageManifest(original: string, file: string): boolean
export declare function sanitizeOfflineAssetText(original: string, file: string): {
  output: string
  replacementCount: number
}

export interface OfflineAssetSanitizerPluginOptions {
  label?: string
  log?: boolean
}

export interface OfflineAssetSanitizerPlugin {
  name: string
  apply: 'build'
  enforce: 'post'
  closeBundle(): Promise<void>
}

export declare function sanitizeOfflineViewerAssetTree(
  root: string
): Promise<OfflineAssetSanitizationResult>

export declare function createOfflineAssetSanitizerPlugin(
  outputDir: string,
  options?: OfflineAssetSanitizerPluginOptions
): OfflineAssetSanitizerPlugin
