import type { Plugin } from 'vite'

interface ComponentDemoOfflineAssetOptions {
  label?: string
  log?: boolean
  sourceRoot?: string
}

export declare function createComponentDemoOfflineAssetSanitizerPlugin(
  outputDir: string,
  options?: ComponentDemoOfflineAssetOptions
): Plugin
