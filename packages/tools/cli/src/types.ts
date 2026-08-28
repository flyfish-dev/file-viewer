export type FileViewerFramework =
  | 'web'
  | 'vue3'
  | 'vue2.7'
  | 'vue2.6'
  | 'react'
  | 'react-legacy'
  | 'svelte'
  | 'jquery'

export type FileViewerProfile =
  | 'standard'
  | 'lite'
  | 'office'
  | 'engineering'
  | 'all'
  | 'full'
  | 'custom'
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'
export type FileViewerCliLocale = 'en' | 'zh-CN' | 'ja-JP' | 'de-DE'
export type FileViewerInstallSource =
  | { kind: 'registry'; registry?: string; cacheDir?: string; concurrency?: number }
  | { kind: 'offline-directory'; directory: string; cacheDir?: string; concurrency?: number }

export interface FileViewerCapabilityAssetDeclaration {
  rendererIds: string[]
  packageName?: string
  packageVersion?: string
  installerPackageName?: string
  installerPackageVersion?: string
  bin?: string
  apiExport?: string
  target?: string
  copyGroups?: string[]
  copyMode?: 'profile-pack' | 'capability-pack' | 'renderer-groups'
  receiptFilename?: string
  notice?: string
}

export interface FileViewerCapabilityCatalogEntry {
  id: string
  packageName: string
  version: string
  activation?: {
    kind: 'renderer-export' | 'side-effect-import' | 'loader-registration'
    import: string
    export?: string
  }
  rendererIds: string[]
  formats: string[]
  assets: FileViewerCapabilityAssetDeclaration
  license: {
    spdx: string
    policy: 'permissive' | 'separately-licensed' | 'review-required'
    notices?: Array<{ packageName: string; spdx: string; notice?: string }>
  }
  weight: 'light' | 'standard' | 'heavy'
  profiles: string[]
}

export interface FileViewerCapabilityListEntry {
  id: string
  packageSpec: string
  formats: string[]
  rendererIds: string[]
  weight: FileViewerCapabilityCatalogEntry['weight']
  license: FileViewerCapabilityCatalogEntry['license']
  profiles: string[]
  availability: string
  assetPackageSpec: string | null
}

export interface FileViewerCapabilityList {
  schemaVersion: 1
  coreVersion: string
  capabilities: FileViewerCapabilityListEntry[]
}

export interface FileViewerProfileCatalogEntry {
  id: string
  packageName: string
  version: string
  capabilityPackages: string[]
  assetPackageName?: string
  profileManifestSha256?: string
  estimates?: {
    packedClosureBytes: number
    unpackedClosureBytes: number
    staticAssetBytes: number
  }
}

export interface FileViewerCliCatalog {
  schemaVersion: 1
  core: { packageName: '@file-viewer/core'; version: string }
  frameworks: Record<FileViewerFramework, { packageName: string; version: string }>
  frameworkOverrides?: Partial<
    Record<
      FileViewerProfile,
      Partial<Record<FileViewerFramework, { packageName: string; version: string }>>
    >
  >
  frameworkTemplates?: Record<
    FileViewerFramework,
    {
      defaultVersion: string
      runtimeDependencies: Record<string, string>
      viteVersion: string
      validatedVersions: Record<
        string,
        {
          runtimeDependencies: Record<string, string>
          viteVersion: string
          vitePluginSvelteVersion?: string
          templateVariant?: string
        }
      >
    }
  >
  profiles: FileViewerProfileCatalogEntry[]
  capabilities: FileViewerCapabilityCatalogEntry[]
  assetTool: { packageName: string; version: string }
  legacyFull?: {
    release: string
    policy: 'legacy-compatible-frozen'
    baselineSha256: string
    excludedFutureCapabilities: string[]
    referenceColdInstall: {
      measuredAt: string
      packageCountRange: [number, number]
      packedBytesRange: [number, number]
      unpackedBytesRange: [number, number]
      registry: string
    }
  }
}

export interface FileViewerCommandStep {
  id: string
  kind: 'install' | 'assets'
  command: string
  args: string[]
  cwd: string
  env?: Record<string, string>
  expectedExecutableVersion?: string
  executableOwner?: {
    packageName: string
    packageVersion: string
    bin: string
  }
  assetOwner?: {
    packageName: string
    packageVersion: string
    target: string
    copyGroups: string[]
    receiptFilename: string
    expectedProfileManifestSha256?: string
  }
}

export interface FileViewerProjectConfig {
  schemaVersion: 1
  framework: FileViewerFramework
  profile: FileViewerProfile
  formats: string[]
  capabilities: string[]
  assetTarget: string
  generatedModule: string
  entry?: string
  packageManager?: PackageManager
  packageManagerVersion?: string
  managedPackages?: string[]
  locale?: FileViewerCliLocale
  source?: FileViewerInstallSource
  frameworkVersion?: string
  assetBaseUrl?: string
}

export interface FileViewerInstallPlan {
  schemaVersion: 1
  framework: FileViewerFramework
  profile: FileViewerProfile
  packageManager: PackageManager
  packageManagerVersion?: string
  packages: string[]
  packageSpecs: string[]
  requiredPackages: Array<{ packageName: string; version: string }>
  capabilityPackages: string[]
  heavyCapabilities: string[]
  licenseNotices: Array<{ packageName: string; spdx: string; policy: string }>
  assetPackages: string[]
  assetRendererIds: string[]
  missingAssetRendererIds: string[]
  estimates: FileViewerProfileCatalogEntry['estimates'] | null
  legacyFullEstimate?: NonNullable<FileViewerCliCatalog['legacyFull']>['referenceColdInstall']
  steps: FileViewerCommandStep[]
  command: string
  assetCommands: string[]
  assetCommand: string
  assetTarget: string
  generatedModule: string
  integrationImport: string
}

export interface FileViewerDoctorResult {
  ok: boolean
  configPath: string
  errors: string[]
  warnings: string[]
  plan: FileViewerInstallPlan
}

export interface FileViewerCommandExecutionResult {
  executed: boolean
  step: FileViewerCommandStep
  status: number | null
}
