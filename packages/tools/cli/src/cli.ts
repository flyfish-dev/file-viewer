#!/usr/bin/env node
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { existsSync } from 'node:fs'
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  rmdir,
  writeFile
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createInterface } from 'node:readline/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  assertFileViewerProjectAdapterCanWrite,
  inspectFileViewerProjectAdapter
} from './project-adapters.js'
import {
  createFileViewerCarrierCommand,
  createFileViewerRegistryEnvironment,
  detectYarnGeneration
} from './carrier-command.js'
import {
  DEFAULT_FILE_VIEWER_CONFIG,
  createFileViewerInstallPlan,
  doctorFileViewerProject,
  detectPackageManager,
  executeFileViewerPlanStep,
  initializeFileViewerProject,
  inferFileViewerLocalAssetBaseUrl,
  normalizeFileViewerConfig,
  readFileViewerProjectConfig,
  updateFileViewerProjectSelection,
  generateFileViewerIntegrationModule,
  listFileViewerCapabilities,
  renderFileViewerCapabilityList,
  reconcileFileViewerAssetOwners,
  reconcileFileViewerManagedDependencies,
  scaffoldFileViewerQuickstart,
  patchFileViewerApplicationEntry,
  listFileViewerApplicationEntries,
  loadFileViewerCliCatalog,
  normalizeFileViewerRegistryUrl,
  prepareFileViewerOfflineDirectory,
  resolveFileViewerOfflinePackages
} from './index.js'
import type {
  FileViewerCliLocale,
  FileViewerFramework,
  FileViewerInstallSource,
  FileViewerProfile,
  PackageManager
} from './types.js'

type ParsedArgs = {
  command: string
  projectRoot: string
  configFile: string
  framework?: FileViewerFramework
  profile?: FileViewerProfile
  formats: string[]
  capabilities: string[]
  packageManager?: PackageManager
  packageManagerVersion?: string
  dryRun: boolean
  json: boolean
  write: boolean
  yes: boolean
  force: boolean
  token?: string
  assetTarget?: string
  assetTargetSpecified: boolean
  output?: string
  locale: FileViewerCliLocale
  nonInteractive: boolean
  registry?: string
  offlineDirectory?: string
  cacheDir?: string
  concurrency?: number
  fileViewerVersion?: string
  frameworkVersion?: string
  assetBaseUrl?: string
  sourceSpecified: boolean
  assetBaseUrlSpecified: boolean
  entry?: string
  version: boolean
  passthrough: string[]
  positionals: string[]
}

const primaryHelpCommands = [
  'create',
  'add',
  'config add <token>',
  'config remove <token>'
] as const
const advancedHelpCommands = [
  'list',
  'plan',
  'init',
  'generate',
  'install',
  'assets',
  'prepare',
  'cache',
  'copy-assets',
  'doctor',
  'verify'
] as const
const helpOptions = [
  '--project <dir>',
  '--config <file>',
  '--framework <name>',
  '--profile <name>',
  '--formats <csv>',
  '--capabilities <csv>',
  '--asset-target <dir>',
  '--output <file>',
  '--entry <file>',
  '--package-manager <name>',
  '--package-manager-version <v>',
  '--registry <url>',
  '--offline-dir <dir>',
  '--cache-dir <dir>',
  '--concurrency <n>',
  '--lang <en|zh-CN|ja-JP|de-DE>',
  '--locale <en|zh-CN|ja-JP|de-DE>',
  '--file-viewer-version <ver>',
  '--framework-version <ver>',
  '--asset-base-url <url>',
  '--write',
  '--yes',
  '--force',
  '--json',
  '--non-interactive',
  '--dry-run',
  '--version',
  '--help'
] as const

type HelpCopy = {
  usage: string
  primary: string
  advanced: string
  options: string
  offline: string
  offlineDescription: string
  commands: Record<
    (typeof primaryHelpCommands)[number] | (typeof advancedHelpCommands)[number],
    string
  >
  flags: Record<(typeof helpOptions)[number], string>
}

const helpCopy: Record<FileViewerCliLocale, HelpCopy> = {
  en: {
    usage: 'file-viewer <create|add> [options]',
    primary: 'Primary commands',
    advanced: 'Advanced commands',
    options: 'Options',
    offline: 'Offline preparation',
    offlineDescription:
      'Downloads the exact File Viewer-owned closure atomically. Air-gapped installs also need a package-manager cache for third-party framework dependencies.',
    commands: {
      create: 'Create a runnable File Viewer project.',
      add: 'Detect and integrate an existing package.json project.',
      'config add <token>': 'Add a format or renderer capability.',
      'config remove <token>': 'Remove an explicitly selected capability.',
      list: 'List supported formats and explicit capabilities.',
      plan: 'Print pinned packages, assets, licenses, weight, and commands.',
      init: 'Create file-viewer.config.json without installing packages.',
      generate: 'Generate the deterministic renderer registration module.',
      install: 'Install pinned packages and required modular assets.',
      assets: 'Install or repair modular assets; without config, use the legacy contract.',
      prepare: 'Prepare a verified offline tgz closure from an explicit registry.',
      cache: 'Alias of prepare for a reusable verified offline directory.',
      'copy-assets': 'Run the complete legacy copy-assets compatibility command.',
      doctor: 'Inspect dependency, generated-entry, receipt, and asset drift.',
      verify: 'Run doctor and exit non-zero when errors are present.'
    },
    flags: {
      '--project <dir>': 'Project root (default: current directory).',
      '--config <file>': 'Config filename (default: file-viewer.config.json).',
      '--framework <name>': 'web, vue3, vue2.7, vue2.6, react, react-legacy, svelte, or jquery.',
      '--profile <name>': 'standard, lite, office, engineering, all, full, or custom.',
      '--formats <csv>': 'Extra file extensions to enable.',
      '--capabilities <csv>': 'Extra capability IDs to enable.',
      '--asset-target <dir>': 'Contained project-relative asset directory.',
      '--output <file>': 'Generated integration module path.',
      '--entry <file>': 'Contained client entry to integrate.',
      '--package-manager <name>': 'npm, pnpm, yarn, or bun.',
      '--package-manager-version <v>': 'Exact package-manager version; distinguishes Yarn 1 and 4.',
      '--registry <url>': 'Explicit npm/private registry used during installation.',
      '--offline-dir <dir>': 'Verified exact-catalog tgz directory.',
      '--cache-dir <dir>': 'Controlled package-manager cache/store directory.',
      '--concurrency <n>': 'prepare/cache: 1-8; install network/script work: 1-32.',
      '--lang <en|zh-CN|ja-JP|de-DE>': 'CLI language (default: system language).',
      '--locale <en|zh-CN|ja-JP|de-DE>': 'Alias of --lang.',
      '--file-viewer-version <ver>': 'Require an exact CLI catalog version.',
      '--framework-version <ver>': 'Exact validated scaffold runtime version.',
      '--asset-base-url <url>': 'Approved self-hosted/CDN asset base; local assets remain default.',
      '--write': 'Allow init/config/generate/modular-assets writes.',
      '--yes': 'Allow create/add/install/prepare to invoke package managers or downloads.',
      '--force': 'Replace conflicting CLI-managed scaffold/config/generated files.',
      '--json': 'Emit machine-readable JSON with stable English keys.',
      '--non-interactive': 'Disable prompts for reproducible CI.',
      '--dry-run': 'Force mutating workflows to perform no writes, installs, or downloads.',
      '--version': 'Print the installed CLI catalog version.',
      '--help': 'Show localized help.'
    }
  },
  'zh-CN': {
    usage: 'file-viewer <create|add> [选项]',
    primary: '主要命令',
    advanced: '高级命令',
    options: '选项',
    offline: '离线准备',
    offlineDescription:
      '原子下载精确的 File Viewer 自有依赖闭包。完全隔离安装还需要为第三方框架依赖准备包管理器缓存。',
    commands: {
      create: '创建可运行的 File Viewer 项目。',
      add: '检测并接入已有 package.json 项目。',
      'config add <token>': '添加格式或 renderer 能力。',
      'config remove <token>': '移除显式选择的能力。',
      list: '列出支持格式和显式能力。',
      plan: '显示精确包、资产、许可证、体积和命令。',
      init: '创建 file-viewer.config.json，不安装依赖。',
      generate: '生成确定性的 renderer 注册模块。',
      install: '安装精确依赖和必需的模块化资产。',
      assets: '安装或修复模块化资产；无配置时使用旧兼容契约。',
      prepare: '从显式 registry 准备经过校验的离线 tgz 闭包。',
      cache: 'prepare 的别名，用于生成可复用的已校验离线目录。',
      'copy-assets': '执行完整的旧版 copy-assets 兼容命令。',
      doctor: '检查依赖、生成入口、回执和资产漂移。',
      verify: '执行 doctor；存在错误时以非零状态退出。'
    },
    flags: {
      '--project <dir>': '项目根目录（默认当前目录）。',
      '--config <file>': '配置文件名（默认 file-viewer.config.json）。',
      '--framework <name>': 'web、vue3、vue2.7、vue2.6、react、react-legacy、svelte 或 jquery。',
      '--profile <name>': 'standard、lite、office、engineering、all、full 或 custom。',
      '--formats <csv>': '额外启用的文件扩展名。',
      '--capabilities <csv>': '额外启用的 capability ID。',
      '--asset-target <dir>': '项目边界内的相对资产目录。',
      '--output <file>': '生成的集成模块路径。',
      '--entry <file>': '需要接入的项目内客户端入口。',
      '--package-manager <name>': 'npm、pnpm、yarn 或 bun。',
      '--package-manager-version <v>': '精确包管理器版本，用于区分 Yarn 1 与 Yarn 4。',
      '--registry <url>': '安装阶段使用的显式 npm/私有源。',
      '--offline-dir <dir>': '经过校验的精确目录 tgz 目录。',
      '--cache-dir <dir>': '受控包管理器 cache/store 目录。',
      '--concurrency <n>': 'prepare/cache 为 1-8；安装网络/脚本并发为 1-32。',
      '--lang <en|zh-CN|ja-JP|de-DE>': 'CLI 语言（默认跟随系统）。',
      '--locale <en|zh-CN|ja-JP|de-DE>': '--lang 的别名。',
      '--file-viewer-version <ver>': '要求精确匹配 CLI 能力目录版本。',
      '--framework-version <ver>': '精确且已校验的脚手架运行时版本。',
      '--asset-base-url <url>': '批准的自托管/CDN 资产根地址；默认仍使用本地资产。',
      '--write': '允许 init/config/generate/模块化 assets 写入。',
      '--yes': '允许 create/add/install/prepare 调用包管理器或下载。',
      '--force': '替换冲突的 CLI 管理脚手架、配置或生成文件。',
      '--json': '输出稳定英文键的机器可读 JSON。',
      '--non-interactive': '关闭提示，供可复现 CI 使用。',
      '--dry-run': '强制所有变更流程不写入、不安装、不下载。',
      '--version': '显示已安装 CLI 能力目录版本。',
      '--help': '显示本地化帮助。'
    }
  },
  'ja-JP': {
    usage: 'file-viewer <create|add> [オプション]',
    primary: '主要コマンド',
    advanced: '高度なコマンド',
    options: 'オプション',
    offline: 'オフライン準備',
    offlineDescription:
      'File Viewer 所有の正確な依存クロージャを原子的に取得します。完全な隔離環境では、外部フレームワーク依存用のパッケージマネージャーキャッシュも必要です。',
    commands: {
      create: '実行可能な File Viewer プロジェクトを作成します。',
      add: '既存の package.json プロジェクトを検出して統合します。',
      'config add <token>': '形式または renderer 機能を追加します。',
      'config remove <token>': '明示的に選択した機能を削除します。',
      list: '対応形式と明示機能を一覧表示します。',
      plan: '固定パッケージ、アセット、ライセンス、サイズ、コマンドを表示します。',
      init: '依存をインストールせず file-viewer.config.json を作成します。',
      generate: '決定的な renderer 登録モジュールを生成します。',
      install: '固定依存と必要なモジュール式アセットをインストールします。',
      assets: 'モジュール式アセットを修復します。設定がなければ旧互換契約です。',
      prepare: '明示 Registry から検証済みオフライン tgz クロージャを準備します。',
      cache: '再利用可能な検証済みオフラインディレクトリを作る prepare の別名です。',
      'copy-assets': '従来の copy-assets 互換コマンドを完全に実行します。',
      doctor: '依存、生成 entry、receipt、アセットのずれを検査します。',
      verify: 'doctor を実行し、エラーがあれば非ゼロで終了します。'
    },
    flags: {
      '--project <dir>': 'プロジェクトルート（既定は現在のディレクトリ）。',
      '--config <file>': '設定ファイル名（既定は file-viewer.config.json）。',
      '--framework <name>': 'web、vue3、vue2.7、vue2.6、react、react-legacy、svelte、jquery。',
      '--profile <name>': 'standard、lite、office、engineering、all、full、custom。',
      '--formats <csv>': '追加で有効にする拡張子。',
      '--capabilities <csv>': '追加で有効にする capability ID。',
      '--asset-target <dir>': 'プロジェクト内の相対アセットディレクトリ。',
      '--output <file>': '生成する統合モジュールのパス。',
      '--entry <file>': '統合対象のプロジェクト内クライアント entry。',
      '--package-manager <name>': 'npm、pnpm、yarn、bun。',
      '--package-manager-version <v>': '正確なバージョン。Yarn 1 と Yarn 4 を区別します。',
      '--registry <url>': 'インストール時に使う明示 npm/プライベート Registry。',
      '--offline-dir <dir>': '検証済みの正確なカタログ tgz ディレクトリ。',
      '--cache-dir <dir>': '管理されたキャッシュ/ストアディレクトリ。',
      '--concurrency <n>': 'prepare/cache は 1-8、インストールのネットワーク/スクリプトは 1-32。',
      '--lang <en|zh-CN|ja-JP|de-DE>': 'CLI 言語（既定はシステム言語）。',
      '--locale <en|zh-CN|ja-JP|de-DE>': '--lang の別名。',
      '--file-viewer-version <ver>': 'CLI カタログの正確なバージョンを要求します。',
      '--framework-version <ver>': '検証済み scaffold runtime の正確なバージョン。',
      '--asset-base-url <url>': '承認済み self-hosted/CDN 基底 URL。既定はローカルです。',
      '--write': 'init/config/generate/モジュール式 assets の書き込みを許可します。',
      '--yes': 'create/add/install/prepare のパッケージ処理または取得を許可します。',
      '--force': '競合する CLI 管理 scaffold/config/生成ファイルを置換します。',
      '--json': '安定した英語キーの JSON を出力します。',
      '--non-interactive': '再現可能な CI のためプロンプトを無効にします。',
      '--dry-run': '変更処理の書き込み、インストール、取得をすべて無効にします。',
      '--version': 'インストール済み CLI カタログのバージョンを表示します。',
      '--help': 'ローカライズされたヘルプを表示します。'
    }
  },
  'de-DE': {
    usage: 'file-viewer <create|add> [Optionen]',
    primary: 'Hauptbefehle',
    advanced: 'Erweiterte Befehle',
    options: 'Optionen',
    offline: 'Offline-Vorbereitung',
    offlineDescription:
      'Lädt den exakten File-Viewer-eigenen Abschluss atomar. Für vollständig isolierte Installationen ist zusätzlich ein Paketmanager-Cache für externe Framework-Abhängigkeiten nötig.',
    commands: {
      create: 'Erstellt ein lauffähiges File-Viewer-Projekt.',
      add: 'Erkennt und integriert ein vorhandenes package.json-Projekt.',
      'config add <token>': 'Fügt ein Format oder eine Renderer-Fähigkeit hinzu.',
      'config remove <token>': 'Entfernt eine explizit gewählte Fähigkeit.',
      list: 'Listet unterstützte Formate und explizite Fähigkeiten.',
      plan: 'Zeigt fixierte Pakete, Assets, Lizenzen, Größe und Befehle.',
      init: 'Erstellt file-viewer.config.json ohne Paketinstallation.',
      generate: 'Erzeugt das deterministische Renderer-Registrierungsmodul.',
      install: 'Installiert fixierte Pakete und erforderliche modulare Assets.',
      assets: 'Repariert modulare Assets; ohne Konfiguration gilt der alte Vertrag.',
      prepare: 'Bereitet einen geprüften Offline-tgz-Abschluss aus einer expliziten Registry vor.',
      cache: 'Alias von prepare für ein wiederverwendbares geprüftes Offline-Verzeichnis.',
      'copy-assets': 'Führt den vollständigen alten copy-assets-Kompatibilitätsbefehl aus.',
      doctor: 'Prüft Abhängigkeiten, generierten Entry, Receipts und Asset-Abweichungen.',
      verify: 'Führt doctor aus und endet bei Fehlern ungleich null.'
    },
    flags: {
      '--project <dir>': 'Projektwurzel (Standard: aktuelles Verzeichnis).',
      '--config <file>': 'Konfigurationsdatei (Standard: file-viewer.config.json).',
      '--framework <name>': 'web, vue3, vue2.7, vue2.6, react, react-legacy, svelte oder jquery.',
      '--profile <name>': 'standard, lite, office, engineering, all, full oder custom.',
      '--formats <csv>': 'Zusätzlich zu aktivierende Dateiendungen.',
      '--capabilities <csv>': 'Zusätzlich zu aktivierende Fähigkeits-IDs.',
      '--asset-target <dir>': 'Projektinternes relatives Asset-Verzeichnis.',
      '--output <file>': 'Pfad des erzeugten Integrationsmoduls.',
      '--entry <file>': 'Projektinterner Client-Entry für die Integration.',
      '--package-manager <name>': 'npm, pnpm, yarn oder bun.',
      '--package-manager-version <v>': 'Exakte Version; unterscheidet Yarn 1 und Yarn 4.',
      '--registry <url>': 'Explizite npm/private Registry für die Installation.',
      '--offline-dir <dir>': 'Geprüftes tgz-Verzeichnis des exakten Katalogs.',
      '--cache-dir <dir>': 'Kontrolliertes Cache-/Store-Verzeichnis.',
      '--concurrency <n>': 'prepare/cache: 1-8; Installation Netzwerk/Skripte: 1-32.',
      '--lang <en|zh-CN|ja-JP|de-DE>': 'CLI-Sprache (Standard: Systemsprache).',
      '--locale <en|zh-CN|ja-JP|de-DE>': 'Alias für --lang.',
      '--file-viewer-version <ver>': 'Fordert eine exakte CLI-Katalogversion.',
      '--framework-version <ver>': 'Exakte validierte Scaffold-Runtime-Version.',
      '--asset-base-url <url>':
        'Freigegebene Self-hosted/CDN-Basis; lokale Assets bleiben Standard.',
      '--write': 'Erlaubt Schreibzugriffe von init/config/generate/modularen Assets.',
      '--yes': 'Erlaubt Paketmanager- oder Download-Schritte von create/add/install/prepare.',
      '--force': 'Ersetzt kollidierende CLI-verwaltete Scaffold-/Config-/Generatordateien.',
      '--json': 'Gibt maschinenlesbares JSON mit stabilen englischen Schlüsseln aus.',
      '--non-interactive': 'Deaktiviert Prompts für reproduzierbare CI.',
      '--dry-run': 'Erzwingt für Änderungen: keine Schreibzugriffe, Installationen oder Downloads.',
      '--version': 'Zeigt die installierte CLI-Katalogversion.',
      '--help': 'Zeigt lokalisierte Hilfe.'
    }
  }
}

const renderUsage = (locale: FileViewerCliLocale) => {
  const copy = helpCopy[locale]
  const rows = (items: readonly string[], descriptions: Record<string, string>) =>
    items.map((item) => `  ${item.padEnd(36)}${descriptions[item]}`).join('\n')
  return `${copy.usage}

${copy.primary}:
${rows(primaryHelpCommands, copy.commands)}

${copy.advanced}:
${rows(advancedHelpCommands, copy.commands)}

${copy.options}:
${rows(helpOptions, copy.flags)}

${copy.offline}:
  file-viewer prepare --profile <name> --registry <url> --offline-dir <dir> --yes
  ${copy.offlineDescription}
`
}

const localizedUsage = Object.fromEntries(
  (Object.keys(helpCopy) as FileViewerCliLocale[]).map((locale) => [locale, renderUsage(locale)])
) as Record<FileViewerCliLocale, string>
const commandHelp: Record<FileViewerCliLocale, Record<string, string>> = {
  en: {
    create: 'Create a new runnable project. Dry-run unless --yes.',
    add: 'Detect and integrate the current package.json project. Dry-run unless --yes.',
    plan: 'Print pinned packages, assets, licenses, weight, and commands.',
    install: 'Install pinned packages and all required assets. Requires --yes.',
    assets:
      'Install or repair selected assets. Without config, preserves the legacy copy-assets contract: --renderers selects groups; --clean --confirm enables bounded replacement; FILE_VIEWER_PUBLIC_DIR sets the target; FILE_VIEWER_SKIP_ASSET_COPY skips copying.',
    prepare: 'Atomically prepare verified File Viewer tarballs from an explicit registry.',
    cache: 'Alias of prepare for a verified reusable offline cache.',
    'copy-assets': 'Run the complete legacy copy-assets compatibility command.',
    doctor: 'Check versions, generated entry integration, receipts, hashes, and missing assets.',
    verify: 'Run doctor and exit non-zero when errors exist.',
    list: 'List formats and explicit capabilities.',
    generate: 'Generate the deterministic renderer registration module.',
    init: 'Create file-viewer.config.json; requires --write.',
    config: 'Use config add/remove <token> to update explicit selections.'
  },
  'zh-CN': {
    create: '创建可运行项目；除非使用 --yes，否则只预览。',
    add: '检测并集成当前 package.json 项目；除非使用 --yes，否则只预览。',
    plan: '显示锁定包、资产、许可证、体积和命令。',
    install: '安装锁定包及全部必需资产，需要 --yes。',
    assets:
      '安装或修复所选资产；无配置时保持旧 copy-assets 契约：--renderers 选择资源组；--clean --confirm 启用边界内替换；FILE_VIEWER_PUBLIC_DIR 指定目标；FILE_VIEWER_SKIP_ASSET_COPY 跳过复制。',
    prepare: '从显式 registry 原子准备校验过的离线包。',
    cache: 'prepare 的别名，用于可复用的完整性缓存。',
    'copy-assets': '执行完整的旧版 copy-assets 兼容命令。',
    doctor: '检查版本、入口集成、收据、哈希和缺失资产。',
    verify: '执行 doctor，有错误时非零退出。',
    list: '列出格式和显式能力。',
    generate: '生成确定性的 renderer 注册模块。',
    init: '创建 file-viewer.config.json，需要 --write。',
    config: '使用 config add/remove <token> 修改显式选择。'
  },
  'ja-JP': {
    create: '実行可能な新規プロジェクトを作成します。--yes がなければプレビューのみです。',
    add: '現在の package.json プロジェクトを検出して統合します。',
    plan: '固定パッケージ、アセット、ライセンス、サイズ、コマンドを表示します。',
    install: '固定パッケージと必要な全アセットをインストールします。--yes が必要です。',
    assets:
      '選択アセットを修復します。設定がなければ旧 copy-assets 契約です。--renderers はグループを選択し、--clean --confirm は境界内の置換を有効にし、FILE_VIEWER_PUBLIC_DIR は出力先、FILE_VIEWER_SKIP_ASSET_COPY はコピー省略を指定します。',
    prepare: '明示 Registry から検証済みオフライン tarball を原子的に準備します。',
    cache: '再利用可能な検証済みキャッシュを作る prepare の別名です。',
    'copy-assets': '従来の copy-assets 互換コマンドを完全に実行します。',
    doctor: 'バージョン、entry、receipt、hash、不足アセットを検査します。',
    verify: 'doctor を実行し、エラー時は非ゼロ終了します。',
    list: '形式と明示機能を一覧します。',
    generate: '決定的な renderer 登録モジュールを生成します。',
    init: 'file-viewer.config.json を作成します。--write が必要です。',
    config: 'config add/remove <token> で明示選択を更新します。'
  },
  'de-DE': {
    create: 'Erstellt ein lauffähiges Projekt; ohne --yes nur Vorschau.',
    add: 'Erkennt und integriert das aktuelle package.json-Projekt.',
    plan: 'Zeigt fixierte Pakete, Assets, Lizenzen, Größe und Befehle.',
    install: 'Installiert Pakete und erforderliche Assets; benötigt --yes.',
    assets:
      'Installiert/repariert Assets; ohne Konfiguration gilt der alte copy-assets-Vertrag: --renderers wählt Gruppen; --clean --confirm erlaubt begrenztes Ersetzen; FILE_VIEWER_PUBLIC_DIR setzt das Ziel; FILE_VIEWER_SKIP_ASSET_COPY überspringt das Kopieren.',
    prepare: 'Bereitet verifizierte Offline-Tarballs atomar aus einer expliziten Registry vor.',
    cache: 'Alias für prepare für einen wiederverwendbaren verifizierten Cache.',
    'copy-assets': 'Führt den vollständigen alten copy-assets-Kompatibilitätsbefehl aus.',
    doctor: 'Prüft Versionen, Entry-Integration, Receipts, Hashes und fehlende Assets.',
    verify: 'Führt doctor aus und endet bei Fehlern ungleich null.',
    list: 'Listet Formate und explizite Fähigkeiten.',
    generate: 'Erzeugt das deterministische Renderer-Registrierungsmodul.',
    init: 'Erstellt file-viewer.config.json; benötigt --write.',
    config: 'config add/remove <token> ändert explizite Auswahl.'
  }
}
const renderHelp = (locale: FileViewerCliLocale, command: string) => {
  const normalized = command.startsWith('config-')
    ? 'config'
    : command === 'capabilities'
      ? 'list'
      : command
  const detail = commandHelp[locale][normalized]
  return detail ? `${localizedUsage[locale]}\n${normalized}: ${detail}\n` : localizedUsage[locale]
}

const legacyCopyAssetsHelp: Record<
  FileViewerCliLocale,
  { usage: string; options: string; environment: string }
> = {
  en: {
    usage:
      'Usage: file-viewer-copy-assets [target-directory] [--renderers <csv>] [--clean --confirm]',
    options:
      'Options: --renderers copies exact renderer groups; --clean --confirm replaces only a dedicated safe target; --no-clean keeps merge mode; --lang selects help language.',
    environment:
      'Environment: FILE_VIEWER_PUBLIC_DIR sets the target, FILE_VIEWER_SKIP_ASSET_COPY skips copying, and INIT_CWD supplies the project root.'
  },
  'zh-CN': {
    usage: '用法：file-viewer-copy-assets [目标目录] [--renderers <csv>] [--clean --confirm]',
    options:
      '选项：--renderers 复制精确 renderer 资源组；--clean --confirm 仅替换专用且安全的目标；--no-clean 保持合并模式；--lang 选择帮助语言。',
    environment:
      '环境变量：FILE_VIEWER_PUBLIC_DIR 指定目标，FILE_VIEWER_SKIP_ASSET_COPY 跳过复制，INIT_CWD 指定项目根目录。'
  },
  'ja-JP': {
    usage: '使用法: file-viewer-copy-assets [出力先] [--renderers <csv>] [--clean --confirm]',
    options:
      'オプション: --renderers は正確な renderer グループだけをコピーします。--clean --confirm は専用の安全な出力先だけを置換し、--no-clean はマージを維持し、--lang はヘルプ言語を選択します。',
    environment:
      '環境変数: FILE_VIEWER_PUBLIC_DIR は出力先、FILE_VIEWER_SKIP_ASSET_COPY はコピー省略、INIT_CWD はプロジェクトルートを指定します。'
  },
  'de-DE': {
    usage:
      'Verwendung: file-viewer-copy-assets [Zielverzeichnis] [--renderers <csv>] [--clean --confirm]',
    options:
      'Optionen: --renderers kopiert exakte Renderer-Gruppen; --clean --confirm ersetzt nur ein dediziertes sicheres Ziel; --no-clean behält den Merge-Modus; --lang wählt die Hilfesprache.',
    environment:
      'Umgebung: FILE_VIEWER_PUBLIC_DIR setzt das Ziel, FILE_VIEWER_SKIP_ASSET_COPY überspringt das Kopieren und INIT_CWD setzt die Projektwurzel.'
  }
}

const renderLegacyCopyAssetsHelp = (locale: FileViewerCliLocale, version: string) => {
  const copy = legacyCopyAssetsHelp[locale]
  return `file-viewer-copy-assets ${version}\n\n${copy.usage}\n${copy.options}\n${copy.environment}\n`
}

const normalizeCliLocale = (value?: string): FileViewerCliLocale | null => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/_/g, '-')
    .split(/[.@]/, 1)[0]
    .toLowerCase()
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') return 'zh-CN'
  if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja-JP'
  if (normalized === 'de' || normalized.startsWith('de-')) return 'de-DE'
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  return null
}

const requireCliLocale = (value: string): FileViewerCliLocale => {
  const locale = normalizeCliLocale(value)
  if (!locale) throw new Error(`Unsupported language ${value}. Use en, zh-CN, ja-JP, or de-DE.`)
  return locale
}

function parseArgs(argv: string[]): ParsedArgs {
  if (basename(process.argv[1] || '') === 'file-viewer-copy-assets') argv = ['copy-assets', ...argv]
  const configCommand =
    argv[0] === 'config' && (argv[1] === 'add' || argv[1] === 'remove') ? `config-${argv[1]}` : null
  const requestedLocaleIndex = argv.findIndex((arg) => arg === '--lang' || arg === '--locale')
  if (requestedLocaleIndex >= 0 && !argv[requestedLocaleIndex + 1]) {
    throw new Error(`${argv[requestedLocaleIndex]} requires a value.`)
  }
  const requestedLocale =
    requestedLocaleIndex >= 0 ? requireCliLocale(argv[requestedLocaleIndex + 1]) : undefined
  const result: ParsedArgs = {
    command: configCommand ?? (argv[0] && !argv[0].startsWith('-') ? argv[0] : 'plan'),
    projectRoot: process.cwd(),
    configFile: DEFAULT_FILE_VIEWER_CONFIG,
    formats: [],
    capabilities: [],
    json: false,
    write: false,
    yes: false,
    force: false,
    dryRun: false,
    locale:
      requestedLocale ??
      normalizeCliLocale(process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '') ??
      'en',
    nonInteractive: false,
    version: false,
    sourceSpecified: false,
    assetBaseUrlSpecified: false,
    assetTargetSpecified: false,
    passthrough: [],
    positionals: []
  }
  let projectOptionUsed = false
  const start = configCommand ? 2 : result.command === argv[0] ? 1 : 0
  for (let index = start; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = () => {
      const next = argv[++index]
      if (!next) throw new Error(`${arg} requires a value.`)
      return next
    }
    if (arg === '--project') {
      result.projectRoot = resolve(value())
      projectOptionUsed = true
    } else if (arg === '--config') result.configFile = value()
    else if (arg === '--framework') result.framework = value() as FileViewerFramework
    else if (arg === '--profile') result.profile = value() as FileViewerProfile
    else if (arg === '--formats') result.formats.push(value())
    else if (arg === '--capabilities') result.capabilities.push(value())
    else if (arg === '--package-manager') result.packageManager = value() as PackageManager
    else if (arg === '--package-manager-version') result.packageManagerVersion = value()
    else if (arg === '--asset-target') {
      result.assetTarget = value()
      result.assetTargetSpecified = true
    } else if (arg === '--output') result.output = value()
    else if (arg === '--entry') result.entry = value()
    else if (arg === '--registry') {
      result.registry = value()
      result.sourceSpecified = true
    } else if (arg === '--offline-dir') {
      result.offlineDirectory = value()
      result.sourceSpecified = true
    } else if (arg === '--cache-dir') {
      result.cacheDir = value()
    } else if (arg === '--concurrency') {
      result.concurrency = Number(value())
    } else if (arg === '--locale' || arg === '--lang') result.locale = requireCliLocale(value())
    else if (arg === '--file-viewer-version') result.fileViewerVersion = value()
    else if (arg === '--framework-version') result.frameworkVersion = value()
    else if (arg === '--asset-base-url') {
      result.assetBaseUrl = value()
      result.assetBaseUrlSpecified = true
    } else if (arg === '--json') result.json = true
    else if (arg === '--write') result.write = true
    else if (arg === '--yes') result.yes = true
    else if (arg === '--force') result.force = true
    else if (arg === '--non-interactive') result.nonInteractive = true
    else if (arg === '--dry-run') result.dryRun = true
    else if ((arg === '--help' || arg === '-h') && result.command === 'copy-assets')
      result.passthrough.push(arg)
    else if ((arg === '--version' || arg === '-v') && result.command === 'copy-assets')
      result.passthrough.push(arg)
    else if (arg === '--version' || arg === '-v') result.version = true
    else if (
      (result.command === 'copy-assets' || result.command === 'assets') &&
      ['--clean', '--confirm', '--no-clean'].includes(arg)
    )
      result.passthrough.push(arg)
    else if (
      (result.command === 'copy-assets' || result.command === 'assets') &&
      arg === '--renderers'
    ) {
      result.passthrough.push(arg, value())
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(renderHelp(result.locale, result.command))
      process.exit(0)
    } else if (result.command === 'copy-assets') result.passthrough.push(arg)
    else if (!arg.startsWith('-')) result.positionals.push(arg)
    else throw new Error(`Unknown option ${arg}.`)
  }
  if (result.command === 'create' || result.command === 'add') {
    if (result.positionals.length > 1)
      throw new Error(`${result.command} accepts at most one project directory.`)
    if (result.positionals[0]) {
      if (projectOptionUsed)
        throw new Error(`Use either ${result.command} <directory> or --project, not both.`)
      result.projectRoot = resolve(result.positionals[0])
    }
  } else if (['config-add', 'config-remove', 'select', 'remove'].includes(result.command)) {
    if (result.positionals.length !== 1)
      throw new Error(`${result.command} requires exactly one format or capability token.`)
    result.token = result.positionals[0]
  } else if (result.command !== 'assets' && result.positionals.length) {
    throw new Error(
      `Unexpected positional argument for ${result.command}: ${result.positionals.join(', ')}.`
    )
  } else if (result.command === 'assets' && result.positionals.length > 1) {
    throw new Error('assets accepts at most one target directory.')
  }
  return result
}

const messages = {
  en: {
    framework: 'Framework',
    profile: 'Profile',
    version: 'File Viewer release',
    packageManager: 'Package manager',
    packageManagerVersion: 'Package manager version',
    formats: 'File formats (comma-separated)',
    capabilities: 'Capability ids (comma-separated)',
    assetTarget: 'Asset target',
    source: 'Package source',
    sourceRegistry: 'Registry URL',
    sourceOffline: 'Offline tarball directory',
    delivery: 'Runtime asset delivery',
    assetBaseUrl: 'Self-hosted/CDN asset base URL',
    entry: 'Application entry',
    choose: 'Choose a number',
    back: 'b=back',
    cancel: '0=cancel',
    cancelled: 'Cancelled without changes.',
    confirm: 'Install and write files? (y/N)',
    existing: 'No package.json was found. Use file-viewer create for a new project.'
  },
  'zh-CN': {
    framework: '选择框架',
    profile: '选择集成方案',
    version: 'File Viewer 版本',
    packageManager: '包管理器',
    packageManagerVersion: '包管理器版本',
    formats: '文件格式（逗号分隔）',
    capabilities: '能力 ID（逗号分隔）',
    assetTarget: '静态资源目录',
    source: '软件包来源',
    sourceRegistry: 'Registry 地址',
    sourceOffline: '离线 tgz 目录',
    delivery: '运行时资源分发',
    assetBaseUrl: '自托管/CDN 资源基地址',
    entry: '应用入口',
    choose: '请选择编号',
    back: 'b=返回',
    cancel: '0=取消',
    cancelled: '已取消，未修改文件。',
    confirm: '确认安装并写入文件？(y/N)',
    existing: '未找到 package.json。新项目请使用 file-viewer create。'
  },
  'ja-JP': {
    framework: 'フレームワーク',
    profile: '統合プロファイル',
    version: 'File Viewer リリース',
    packageManager: 'パッケージマネージャー',
    packageManagerVersion: 'パッケージマネージャーのバージョン',
    formats: 'ファイル形式（カンマ区切り）',
    capabilities: '機能 ID（カンマ区切り）',
    assetTarget: 'アセット出力先',
    source: 'パッケージ取得元',
    sourceRegistry: 'Registry URL',
    sourceOffline: 'オフライン tgz ディレクトリ',
    delivery: 'ランタイムアセット配信',
    assetBaseUrl: 'セルフホスト/CDN ベース URL',
    entry: 'アプリケーションエントリ',
    choose: '番号を選択',
    back: 'b=戻る',
    cancel: '0=キャンセル',
    cancelled: '変更せずにキャンセルしました。',
    confirm: 'インストールしてファイルを書き込みますか？ (y/N)',
    existing:
      'package.json がありません。新規プロジェクトには file-viewer create を使用してください。'
  },
  'de-DE': {
    framework: 'Framework',
    profile: 'Integrationsprofil',
    version: 'File-Viewer-Version',
    packageManager: 'Paketmanager',
    packageManagerVersion: 'Paketmanager-Version',
    formats: 'Dateiformate (kommagetrennt)',
    capabilities: 'Fähigkeits-IDs (kommagetrennt)',
    assetTarget: 'Asset-Ziel',
    source: 'Paketquelle',
    sourceRegistry: 'Registry-URL',
    sourceOffline: 'Offline-tgz-Verzeichnis',
    delivery: 'Runtime-Asset-Bereitstellung',
    assetBaseUrl: 'Self-hosted/CDN-Basis-URL',
    entry: 'Anwendungseinstieg',
    choose: 'Nummer auswählen',
    back: 'b=zurück',
    cancel: '0=abbrechen',
    cancelled: 'Ohne Änderungen abgebrochen.',
    confirm: 'Installieren und Dateien schreiben? (y/N)',
    existing: 'Keine package.json gefunden. Verwenden Sie file-viewer create für ein neues Projekt.'
  }
}

const installSource = (args: ParsedArgs): FileViewerInstallSource | undefined => {
  if (args.registry && args.offlineDirectory)
    throw new Error('--registry and --offline-dir are mutually exclusive.')
  if (
    args.concurrency !== undefined &&
    (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 32)
  ) {
    throw new Error('--concurrency must be an integer from 1 to 32.')
  }
  if (args.offlineDirectory)
    return {
      kind: 'offline-directory',
      directory: args.offlineDirectory,
      cacheDir: args.cacheDir,
      concurrency: args.concurrency
    }
  if (args.registry || args.cacheDir || args.concurrency)
    return {
      kind: 'registry',
      registry: args.registry,
      cacheDir: args.cacheDir,
      concurrency: args.concurrency
    }
  return undefined
}

function print(value: unknown, json: boolean) {
  if (json) process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
  else if (typeof value === 'string') process.stdout.write(`${value}\n`)
  else process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

type ProjectFileBackup = { path: string; content: Buffer | null }
type ProjectDirectoryBackup = { path: string; backupPath: string | null }
type AtomicProjectDirectoryBackup = { path: string; backupPath: string }
type AtomicProjectDirectoryTransaction = {
  temporary: string
  backups: AtomicProjectDirectoryBackup[]
}

async function snapshotProjectFiles(paths: readonly string[]) {
  const backups: ProjectFileBackup[] = []
  for (const path of [...new Set(paths)]) {
    const content = await readFile(path).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    })
    backups.push({ path, content })
  }
  return backups
}

async function restoreProjectFiles(
  projectRoot: string,
  backups: readonly ProjectFileBackup[],
  absentArtifacts: readonly string[]
) {
  for (const backup of backups) {
    if (backup.content === null) await rm(backup.path, { force: true })
    else {
      await mkdir(dirname(backup.path), { recursive: true })
      await writeFile(backup.path, backup.content)
    }
  }
  for (const artifact of absentArtifacts) await rm(artifact, { recursive: true, force: true })
  const root = resolve(projectRoot)
  const directories = [
    ...new Set(
      backups
        .filter((backup) => backup.content === null)
        .flatMap((backup) => {
          const values: string[] = []
          let current = dirname(backup.path)
          while (current !== root && current.startsWith(`${root}${sep}`)) {
            values.push(current)
            current = dirname(current)
          }
          return values
        })
    )
  ].sort((left, right) => right.length - left.length)
  for (const directory of directories) {
    await rmdir(directory).catch((error) => {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes((error as NodeJS.ErrnoException).code ?? ''))
        throw error
    })
  }
}

async function snapshotProjectDirectories(paths: readonly string[]) {
  const temporary = await mkdtemp(join(tmpdir(), 'file-viewer-directory-rollback-'))
  const backups: ProjectDirectoryBackup[] = []
  for (const [index, path] of [...new Set(paths)].entries()) {
    if (!existsSync(path)) {
      backups.push({ path, backupPath: null })
      continue
    }
    const backupPath = join(temporary, String(index))
    await cp(path, backupPath, { recursive: true, preserveTimestamps: true })
    backups.push({ path, backupPath })
  }
  return { temporary, backups }
}

async function restoreProjectDirectories(backups: readonly ProjectDirectoryBackup[]) {
  for (const backup of backups) {
    await rm(backup.path, { recursive: true, force: true })
    if (backup.backupPath) {
      await mkdir(dirname(backup.path), { recursive: true })
      await cp(backup.backupPath, backup.path, { recursive: true, preserveTimestamps: true })
    }
  }
}

async function stageProjectDirectoriesAtomically(
  projectRoot: string,
  paths: readonly string[]
): Promise<AtomicProjectDirectoryTransaction | null> {
  const existing: string[] = []
  for (const path of [...new Set(paths)]) {
    const details = await lstat(path).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    })
    if (details) existing.push(path)
  }
  if (!existing.length) return null

  const root = resolve(projectRoot)
  const temporary = await mkdtemp(join(dirname(root), `.${basename(root)}.file-viewer-install-`))
  const backups: AtomicProjectDirectoryBackup[] = []
  try {
    for (const [index, path] of existing.entries()) {
      const backupPath = join(temporary, String(index))
      await rename(path, backupPath)
      backups.push({ path, backupPath })
    }
  } catch (error) {
    for (const backup of [...backups].reverse()) {
      await mkdir(dirname(backup.path), { recursive: true })
      await rename(backup.backupPath, backup.path)
    }
    await rm(temporary, { recursive: true, force: true })
    throw new Error(
      `Could not establish an atomic package-manager rollback area before installation: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }
  return { temporary, backups }
}

async function rollbackAtomicProjectDirectories(
  transaction: AtomicProjectDirectoryTransaction | null
) {
  if (!transaction) return
  for (const backup of [...transaction.backups].reverse()) {
    await rm(backup.path, { recursive: true, force: true })
    await mkdir(dirname(backup.path), { recursive: true })
    await rename(backup.backupPath, backup.path)
  }
  await rm(transaction.temporary, { recursive: true, force: true })
}

async function discardAtomicProjectDirectoryBackup(
  transaction: AtomicProjectDirectoryTransaction | null
) {
  if (transaction) await rm(transaction.temporary, { recursive: true, force: true })
}

async function configFromArgs(args: ParsedArgs) {
  const existing = await readFileViewerProjectConfig(args.projectRoot, args.configFile, true)
  const selectedSource = args.sourceSpecified ? installSource(args) : existing?.source
  const source = selectedSource
    ? {
        ...selectedSource,
        ...(args.cacheDir !== undefined ? { cacheDir: args.cacheDir } : {}),
        ...(args.concurrency !== undefined ? { concurrency: args.concurrency } : {})
      }
    : installSource(args)
  return normalizeFileViewerConfig({
    ...(existing ?? {}),
    ...(args.framework ? { framework: args.framework } : {}),
    ...(args.profile ? { profile: args.profile } : {}),
    formats: args.formats.length ? args.formats : (existing?.formats ?? []),
    capabilities: args.capabilities.length ? args.capabilities : (existing?.capabilities ?? []),
    assetTarget: args.assetTarget ?? existing?.assetTarget,
    generatedModule: args.output ?? existing?.generatedModule,
    entry: args.entry ?? existing?.entry,
    packageManager: args.packageManager ?? existing?.packageManager,
    packageManagerVersion: args.packageManagerVersion ?? existing?.packageManagerVersion,
    locale: args.locale,
    source,
    frameworkVersion: args.frameworkVersion ?? existing?.frameworkVersion,
    assetBaseUrl: args.assetBaseUrlSpecified
      ? args.assetBaseUrl
      : (args.assetBaseUrl ?? existing?.assetBaseUrl)
  })
}

async function detectExistingProject(args: ParsedArgs) {
  const packagePath = resolve(args.projectRoot, 'package.json')
  if (!existsSync(packagePath)) throw new Error(messages[args.locale].existing)
  const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    packageManager?: string
  }
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
  const declaredPackageManager = manifest.packageManager?.match(
    /^(pnpm|npm|yarn|bun)@(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/i
  )
  const existingConfig = await readFileViewerProjectConfig(args.projectRoot, args.configFile, true)
  const versionTuple = (raw: unknown) => {
    const match = String(raw ?? '').match(/(?:^|[^0-9])(\d+)\.(\d+)(?:\.(\d+))?/)
    return match
      ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3] ?? 0) }
      : null
  }
  const exactVersion = (raw: unknown) =>
    String(raw ?? '').match(/^(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/)?.[1]
  const candidates: Array<{
    dependency: string
    framework: FileViewerFramework
    version: { major: number; minor: number } | null
  }> = []
  if (dependencies.vue) {
    const version = versionTuple(dependencies.vue)
    candidates.push({
      dependency: 'vue',
      framework: version?.major === 2 ? (version.minor <= 6 ? 'vue2.6' : 'vue2.7') : 'vue3',
      version
    })
  }
  if (dependencies.react) {
    const version = versionTuple(dependencies.react)
    candidates.push({
      dependency: 'react',
      framework: version && version.major <= 17 ? 'react-legacy' : 'react',
      version
    })
  }
  if (dependencies.svelte)
    candidates.push({
      dependency: 'svelte',
      framework: 'svelte',
      version: versionTuple(dependencies.svelte)
    })
  if (dependencies.jquery)
    candidates.push({
      dependency: 'jquery',
      framework: 'jquery',
      version: versionTuple(dependencies.jquery)
    })
  const interactive = !args.nonInteractive && Boolean(process.stdin.isTTY && process.stdout.isTTY)
  const preferredFramework = args.framework ?? existingConfig?.framework
  if (candidates.length > 1 && !preferredFramework && !interactive) {
    throw new Error(
      `Multiple framework runtimes were detected (${candidates.map((item) => item.dependency).join(', ')}). Pass --framework explicitly.`
    )
  }
  const selected = preferredFramework
    ? candidates.find((item) => item.framework === preferredFramework)
    : candidates[0]
  const framework = preferredFramework ?? selected?.framework ?? 'web'
  const catalog = JSON.parse(
    await readFile(new URL('../catalog/catalog.json', import.meta.url), 'utf8')
  ) as {
    frameworkTemplates: Record<
      string,
      { defaultVersion: string; validatedVersions: Record<string, unknown> }
    >
  }
  const versions = Object.keys(catalog.frameworkTemplates[framework].validatedVersions)
  const selectedExactVersion = selected
    ? exactVersion(dependencies[selected.dependency])
    : undefined
  const detectedVersion = selectedExactVersion
    ? versions.find((value) => value === selectedExactVersion)
    : undefined
  return {
    framework,
    frameworkVersion:
      detectedVersion ??
      (selected ? undefined : catalog.frameworkTemplates[framework].defaultVersion),
    detectedRuntime: selected
      ? {
          dependency: selected.dependency,
          declaredVersion: dependencies[selected.dependency],
          version: selected.version
        }
      : null,
    packageManager: declaredPackageManager?.[1]?.toLowerCase() as PackageManager | undefined,
    packageManagerVersion: declaredPackageManager?.[2],
    candidates
  }
}

async function inspectExistingProject(args: ParsedArgs) {
  const existingConfig = await readFileViewerProjectConfig(args.projectRoot, args.configFile, true)
  const adapter = await inspectFileViewerProjectAdapter(args.projectRoot)
  const detection = await detectExistingProject(args)
  const framework = args.framework ?? existingConfig?.framework ?? detection.framework
  const packagePath = resolve(args.projectRoot, 'package.json')
  const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    packageManager?: string
  }
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
  const buildConfigs = adapter.configPaths
  const assetTarget = args.assetTarget ?? existingConfig?.assetTarget ?? adapter.assetTarget
  const warnings: string[] = [...adapter.warnings]
  if (args.assetTargetSpecified && adapter.manualSteps.length) {
    warnings.push(
      `Explicit --asset-target ${args.assetTarget} overrides automatic static-directory detection. Review the adapter findings: ${adapter.manualSteps.join(' ')}`
    )
  }
  if (detection.detectedRuntime && !detection.frameworkVersion) {
    warnings.push(
      `${detection.detectedRuntime.dependency} ${detection.detectedRuntime.declaredVersion} does not exactly match a validated scaffold runtime. The existing runtime will be preserved; pass --framework-version only to record an explicitly reviewed target.`
    )
  }
  const catalog = await listFileViewerCapabilities()
  const existingFileViewerPackages = Object.entries(dependencies)
    .filter(([name]) => name === 'file-viewer-copy-assets' || name.startsWith('@file-viewer/'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([packageName, declaredVersion]) => ({ packageName, declaredVersion }))
  for (const dependency of existingFileViewerPackages) {
    if (
      /^\d+\.\d+\.\d+$/.test(dependency.declaredVersion) &&
      dependency.declaredVersion !== catalog.coreVersion
    ) {
      warnings.push(
        `${dependency.packageName} declares ${dependency.declaredVersion}; this CLI catalog is ${catalog.coreVersion}.`
      )
    }
  }
  const expectedFullPackage = `@file-viewer/${framework}-full`
  const dependencyProfiles = [
    ...(dependencies[expectedFullPackage] ? ['full'] : []),
    ...['standard', 'lite', 'office', 'engineering', 'all'].filter(
      (profile) => dependencies[`@file-viewer/preset-${profile}`]
    )
  ] as FileViewerProfile[]
  const interactive = !args.nonInteractive && Boolean(process.stdin.isTTY && process.stdout.isTTY)
  const preferredProfile = args.profile ?? existingConfig?.profile
  if (dependencyProfiles.length > 1 && !preferredProfile && !interactive) {
    throw new Error(
      `Multiple existing File Viewer profiles were detected (${dependencyProfiles.join(', ')}). Pass --profile explicitly.`
    )
  }
  const applicationEntries = listFileViewerApplicationEntries(args.projectRoot)
  const entry = args.entry ?? existingConfig?.entry
  if (applicationEntries.length === 0 && !entry && !interactive) {
    throw new Error(
      'No supported application entry was found. Pass --entry with the contained client entry that should import the generated integration.'
    )
  }
  if (applicationEntries.length > 1 && !entry && !interactive) {
    throw new Error(
      `Multiple application entries were found (${applicationEntries.join(', ')}). Pass --entry explicitly.`
    )
  }
  return {
    framework,
    frameworkVersion:
      args.frameworkVersion ?? existingConfig?.frameworkVersion ?? detection.frameworkVersion,
    detectedRuntime: detection.detectedRuntime,
    detectedProfiles: dependencyProfiles,
    detectedProfile: preferredProfile ?? dependencyProfiles[0],
    packageManager:
      args.packageManager ??
      existingConfig?.packageManager ??
      detection.packageManager ??
      detectPackageManager(args.projectRoot),
    packageManagerVersion:
      args.packageManagerVersion ??
      existingConfig?.packageManagerVersion ??
      detection.packageManagerVersion,
    assetTarget,
    source: existingConfig?.source,
    assetBaseUrl: existingConfig?.assetBaseUrl,
    formats: existingConfig?.formats ?? [],
    capabilities: existingConfig?.capabilities ?? [],
    entry,
    applicationEntries,
    buildConfigs,
    adapter,
    existingFileViewerPackages,
    warnings
  }
}

async function executeStepsSequentially(
  steps: Awaited<ReturnType<typeof createFileViewerInstallPlan>>['steps'],
  confirmed: boolean
) {
  const results = []
  for (const step of steps) results.push(await executeFileViewerPlanStep(step, { confirmed }))
  return results
}

async function installOfflineCopyAssetsCarrier(
  directory: string,
  projectRoot: string,
  version: string
) {
  const packages = await resolveFileViewerOfflinePackages(
    [{ packageName: 'file-viewer-copy-assets', version }],
    directory,
    projectRoot
  )
  if (!packages.some((item) => item.packageName === 'file-viewer-copy-assets'))
    throw new Error(`Offline directory is missing file-viewer-copy-assets@${version}.`)
  const temporary = await mkdtemp(join(tmpdir(), 'file-viewer-offline-carrier-'))
  await writeFile(join(temporary, 'package.json'), '{"private":true,"type":"module"}\n', 'utf8')
  const installed = spawnSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--save=false',
      ...packages.map((item) => `file:${item.path}`)
    ],
    {
      cwd: temporary,
      encoding: 'utf8',
      shell: false,
      env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' }
    }
  )
  if (installed.status !== 0) {
    await rm(temporary, { recursive: true, force: true })
    throw new Error(
      `Could not load offline file-viewer-copy-assets@${version}: ${installed.stderr || installed.stdout}`
    )
  }
  return {
    entry: join(temporary, 'node_modules/file-viewer-copy-assets/dist/index.js'),
    packageJsonPath: join(temporary, 'node_modules/file-viewer-copy-assets/package.json'),
    cleanup: () => rm(temporary, { recursive: true, force: true })
  }
}

async function executeInstalledWebFullCopyAssets(
  projectRequire: ReturnType<typeof createRequire>,
  args: ParsedArgs,
  catalogVersion: string
) {
  let packageJsonPath: string
  try {
    packageJsonPath = projectRequire.resolve('@file-viewer/web-full/package.json')
  } catch {
    return null
  }
  const packageJsonDetails = await lstat(packageJsonPath)
  if (!packageJsonDetails.isFile() || packageJsonDetails.isSymbolicLink()) {
    throw new Error('Installed @file-viewer/web-full package.json is not a regular file.')
  }
  const physicalPackageJson = await realpath(packageJsonPath)
  const packageRoot = await realpath(dirname(physicalPackageJson))
  const manifest = JSON.parse(await readFile(physicalPackageJson, 'utf8')) as {
    version?: string
    bin?: Record<string, string>
  }
  if (manifest.version !== catalogVersion) {
    throw new Error(
      `Installed @file-viewer/web-full@${String(manifest.version)} does not match CLI catalog ${catalogVersion}.`
    )
  }
  const relativeBin = manifest.bin?.['file-viewer-copy-assets']
  if (
    !relativeBin ||
    relativeBin.startsWith('/') ||
    relativeBin.replace(/\\/g, '/').split('/').includes('..')
  ) {
    throw new Error(
      'Installed @file-viewer/web-full has no safe file-viewer-copy-assets compatibility bin.'
    )
  }
  const unresolvedEntry = resolve(packageRoot, relativeBin)
  const entryDetails = await lstat(unresolvedEntry)
  if (!entryDetails.isFile() || entryDetails.isSymbolicLink()) {
    throw new Error(
      'Installed @file-viewer/web-full file-viewer-copy-assets bin is not a regular file.'
    )
  }
  const entry = await realpath(unresolvedEntry)
  const entryRelation = relative(packageRoot, entry)
  if (!entryRelation || entryRelation.startsWith('..') || isAbsolute(entryRelation)) {
    throw new Error(
      'Installed @file-viewer/web-full file-viewer-copy-assets bin escapes its package.'
    )
  }
  const delegatedArgs = args.passthrough.includes('--json')
    ? args.passthrough
    : [...args.passthrough, '--json']
  const delegated = spawnSync(process.execPath, [entry, ...delegatedArgs], {
    cwd: args.projectRoot,
    encoding: 'utf8',
    shell: false,
    env: process.env
  })
  if (delegated.status !== 0) {
    throw new Error(
      `@file-viewer/web-full copy-assets failed: ${delegated.stderr || delegated.stdout}`
    )
  }
  try {
    const result = JSON.parse(delegated.stdout) as Record<string, unknown>
    return { ...result, mode: 'copy' as const }
  } catch {
    throw new Error(`@file-viewer/web-full copy-assets returned invalid JSON: ${delegated.stdout}`)
  }
}

async function executeLegacyCopyAssets(args: ParsedArgs) {
  const catalogVersion = (await loadFileViewerCliCatalog()).core.version
  if (args.passthrough.some((item) => item === '--help' || item === '-h')) {
    return {
      mode: 'help' as const,
      usage: renderLegacyCopyAssetsHelp(args.locale, catalogVersion)
    }
  }
  if (args.passthrough.some((item) => item === '--version' || item === '-v'))
    return { mode: 'version' as const, version: catalogVersion }
  const projectRequire = createRequire(resolve(args.projectRoot, 'package.json'))
  let entry: string
  let packageJsonPath: string
  let cleanup: (() => Promise<void>) | undefined
  try {
    entry = projectRequire.resolve('file-viewer-copy-assets')
    packageJsonPath = projectRequire.resolve('file-viewer-copy-assets/package.json')
  } catch {
    const embeddedWebFullResult = await executeInstalledWebFullCopyAssets(
      projectRequire,
      args,
      catalogVersion
    )
    if (embeddedWebFullResult) return embeddedWebFullResult
    const config = await readFileViewerProjectConfig(args.projectRoot, args.configFile, true)
    const offlineDirectory =
      args.offlineDirectory ??
      (config?.source?.kind === 'offline-directory' ? config.source.directory : undefined)
    const explicitRegistryRaw =
      args.registry ?? (config?.source?.kind === 'registry' ? config.source.registry : undefined)
    if (offlineDirectory && explicitRegistryRaw)
      throw new Error('--registry and --offline-dir are mutually exclusive.')
    if (offlineDirectory) {
      const carrier = await installOfflineCopyAssetsCarrier(
        offlineDirectory,
        args.projectRoot,
        catalogVersion
      )
      entry = carrier.entry
      packageJsonPath = carrier.packageJsonPath
      cleanup = carrier.cleanup
    } else {
      const explicitRegistry = explicitRegistryRaw
        ? normalizeFileViewerRegistryUrl(explicitRegistryRaw)
        : undefined
      if (!explicitRegistry) {
        throw new Error(
          'No matching file-viewer-copy-assets payload is installed. Install a full package, or explicitly configure a registry before on-demand retrieval; automatic registry fallback is disabled.'
        )
      }
      const manager = args.packageManager ?? detectPackageManager(args.projectRoot)
      const spec = `file-viewer-copy-assets@${catalogVersion}`
      const carrier = createFileViewerCarrierCommand(manager, spec, args.passthrough, {
        projectRoot: args.projectRoot
      })
      const delegated = spawnSync(carrier.command, carrier.args, {
        cwd: args.projectRoot,
        encoding: 'utf8',
        shell: false,
        env: {
          ...process.env,
          ...createFileViewerRegistryEnvironment(explicitRegistry)
        }
      })
      if (delegated.status !== 0)
        throw new Error(
          `${carrier.command} ${carrier.args.join(' ')} failed: ${delegated.stderr || delegated.stdout}`
        )
      return {
        mode: 'delegated' as const,
        packageSpec: spec,
        registry: explicitRegistry,
        ...carrier,
        stdout: delegated.stdout
      }
    }
  }
  try {
    const api = (await import(pathToFileURL(entry).href)) as {
      parseCopyAssetsCliArguments(argv: string[]): {
        mode: 'copy' | 'help' | 'version'
        targetDir?: string
        clean?: boolean
        confirmClean?: boolean
        rendererIds?: string[]
      }
      copyFileViewerAssets(options: {
        targetDir?: string
        clean?: boolean
        confirmClean?: boolean
        rendererIds?: string[]
      }): Promise<{
        targetDir: string
        assetManifestPath: string
        validation: { missingOptional: Array<{ relativePath: string }> }
      }>
    }
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version: string }
    if (packageJson.version !== catalogVersion)
      throw new Error(
        `Installed file-viewer-copy-assets@${packageJson.version} does not match CLI catalog ${catalogVersion}.`
      )
    const parsed = api.parseCopyAssetsCliArguments(args.passthrough)
    if (
      process.env.FILE_VIEWER_SKIP_ASSET_COPY === '1' ||
      process.env.FILE_VIEWER_SKIP_ASSET_COPY === 'true'
    )
      return { mode: 'skipped' as const }
    const targetDir = parsed.targetDir
      ? resolve(args.projectRoot, parsed.targetDir)
      : process.env.FILE_VIEWER_PUBLIC_DIR
        ? undefined
        : resolve(args.projectRoot) !== resolve(process.cwd())
          ? resolve(args.projectRoot, 'public/file-viewer')
          : undefined
    return {
      mode: 'copy' as const,
      ...(await api.copyFileViewerAssets({ ...parsed, ...(targetDir ? { targetDir } : {}) }))
    }
  } finally {
    await cleanup?.()
  }
}

async function promptQuickstart(
  args: ParsedArgs,
  existing: boolean,
  inspection: Awaited<ReturnType<typeof inspectExistingProject>> | null
) {
  if (args.nonInteractive || !process.stdin.isTTY || !process.stdout.isTTY) return args
  const io = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const catalog = await listFileViewerCapabilities()
    const choose = async <T extends string>(
      label: string,
      values: readonly T[],
      preferred: T,
      allowBack = false
    ): Promise<T | null> => {
      process.stdout.write(
        `\n${label}:\n${values.map((value, index) => `  ${index + 1}) ${value}${value === preferred ? ' *' : ''}`).join('\n')}\n`
      )
      while (true) {
        const answer = (
          await io.question(
            `${messages[args.locale].choose} (${messages[args.locale].cancel}${allowBack ? `, ${messages[args.locale].back}` : ''}) [${values.indexOf(preferred) + 1}]: `
          )
        ).trim()
        if (!answer) return preferred
        if (answer === '0') throw new Error(messages[args.locale].cancelled)
        if (allowBack && /^b$/i.test(answer)) return null
        const index = Number(answer) - 1
        if (Number.isInteger(index) && values[index]) return values[index]
      }
    }
    const askText = async (
      label: string,
      preferred = '',
      allowEmpty = true
    ): Promise<string | null> => {
      while (true) {
        const suffix = preferred ? ` [${preferred}]` : ''
        const answer = (
          await io.question(
            `${label}${suffix} (${messages[args.locale].cancel}, ${messages[args.locale].back}): `
          )
        ).trim()
        if (answer === '0') throw new Error(messages[args.locale].cancelled)
        if (/^b$/i.test(answer)) return null
        if (answer) return answer
        if (preferred || allowEmpty) return preferred
      }
    }
    const frameworks = [
      'web',
      'vue3',
      'vue2.7',
      'vue2.6',
      'react',
      'react-legacy',
      'svelte',
      'jquery'
    ] as const
    const profiles = ['standard', 'lite', 'office', 'engineering', 'all', 'full', 'custom'] as const
    const fullCatalog = JSON.parse(
      await readFile(new URL('../catalog/catalog.json', import.meta.url), 'utf8')
    ) as {
      frameworkTemplates: Record<
        string,
        { defaultVersion: string; validatedVersions: Record<string, unknown> }
      >
    }
    let framework = args.framework ?? inspection?.framework ?? 'web'
    let profile = args.profile ?? inspection?.detectedProfile ?? 'standard'
    let frameworkVersion =
      args.frameworkVersion ??
      inspection?.frameworkVersion ??
      fullCatalog.frameworkTemplates[framework].defaultVersion
    let packageManager =
      args.packageManager ?? inspection?.packageManager ?? detectPackageManager(args.projectRoot)
    let packageManagerVersion =
      args.packageManagerVersion ??
      inspection?.packageManagerVersion ??
      (packageManager === 'yarn'
        ? detectYarnGeneration(args.projectRoot) === 'berry'
          ? '4.9.2'
          : '1.22.22'
        : undefined)
    let formats = args.formats.length
      ? args.formats.join(',')
      : (inspection?.formats.join(',') ?? '')
    let capabilities = args.capabilities.length
      ? args.capabilities.join(',')
      : (inspection?.capabilities.join(',') ?? '')
    let assetTarget = args.assetTarget ?? inspection?.assetTarget ?? 'public/file-viewer'
    let sourceKind: 'default' | 'registry' | 'offline' = args.offlineDirectory
      ? 'offline'
      : args.registry
        ? 'registry'
        : inspection?.source?.kind === 'offline-directory'
          ? 'offline'
          : inspection?.source?.kind === 'registry'
            ? 'registry'
            : 'default'
    let registry =
      args.registry ??
      (inspection?.source?.kind === 'registry' ? (inspection.source.registry ?? '') : '')
    let offlineDirectory =
      args.offlineDirectory ??
      (inspection?.source?.kind === 'offline-directory' ? inspection.source.directory : '')
    let delivery: 'local' | 'cdn' =
      (args.assetBaseUrl ?? inspection?.assetBaseUrl) ? 'cdn' : 'local'
    let assetBaseUrl = args.assetBaseUrl ?? inspection?.assetBaseUrl ?? ''
    let entry = args.entry ?? inspection?.entry
    const entries = inspection?.applicationEntries ?? []
    let step = 0
    while (step < 14) {
      if (step === 0) {
        const value = await choose(messages[args.locale].framework, frameworks, framework, true)
        if (value === null) {
          step = 0
          continue
        }
        framework = value
        const template = fullCatalog.frameworkTemplates[framework]
        if (!Object.hasOwn(template.validatedVersions, frameworkVersion))
          frameworkVersion = template.defaultVersion
      } else if (step === 1) {
        const value = await choose(messages[args.locale].profile, profiles, profile, true)
        if (value === null) {
          step -= 1
          continue
        }
        profile = value
      } else if (step === 2) {
        const value = await choose(
          messages[args.locale].version,
          [catalog.coreVersion],
          catalog.coreVersion,
          true
        )
        if (value === null) {
          step -= 1
          continue
        }
      } else if (step === 3) {
        const template = fullCatalog.frameworkTemplates[framework]
        const value = await choose(
          `${messages[args.locale].framework} version`,
          Object.keys(template.validatedVersions),
          frameworkVersion,
          true
        )
        if (value === null) {
          step -= 1
          continue
        }
        frameworkVersion = value
      } else if (step === 4) {
        const previousManager = packageManager
        const value = await choose(
          messages[args.locale].packageManager,
          ['npm', 'pnpm', 'yarn', 'bun'] as const,
          packageManager,
          true
        )
        if (value === null) {
          step -= 1
          continue
        }
        packageManager = value
        if (packageManager !== previousManager)
          packageManagerVersion = packageManager === 'yarn' ? '4.9.2' : undefined
      } else if (step === 5) {
        if (packageManager !== 'yarn') {
          step += 1
          continue
        }
        const value = await choose(
          messages[args.locale].packageManagerVersion,
          ['1.22.22', '4.9.2'] as const,
          packageManagerVersion === '4.9.2' ? '4.9.2' : '1.22.22',
          true
        )
        if (value === null) {
          step -= 1
          continue
        }
        packageManagerVersion = value
      } else if (step === 6) {
        const value = await askText(messages[args.locale].formats, formats)
        if (value === null) {
          step -= 1
          continue
        }
        formats = value === '-' ? '' : value
      } else if (step === 7) {
        const value = await askText(messages[args.locale].capabilities, capabilities)
        if (value === null) {
          step -= 1
          continue
        }
        capabilities = value === '-' ? '' : value
      } else if (step === 8) {
        const value = await askText(messages[args.locale].assetTarget, assetTarget, false)
        if (value === null) {
          step -= 1
          continue
        }
        assetTarget = value
      } else if (step === 9) {
        const value = await choose(
          messages[args.locale].source,
          ['default', 'registry', 'offline'] as const,
          sourceKind,
          true
        )
        if (value === null) {
          step -= 1
          continue
        }
        sourceKind = value
      } else if (step === 10) {
        if (sourceKind === 'default') {
          step += 1
          continue
        }
        const label =
          sourceKind === 'registry'
            ? messages[args.locale].sourceRegistry
            : messages[args.locale].sourceOffline
        const preferred = sourceKind === 'registry' ? registry : offlineDirectory
        const value = await askText(label, preferred, false)
        if (value === null) {
          step -= 1
          continue
        }
        if (sourceKind === 'registry') registry = value
        else offlineDirectory = value
      } else if (step === 11) {
        const value = await choose(
          messages[args.locale].delivery,
          ['local', 'cdn'] as const,
          delivery,
          true
        )
        if (value === null) {
          step = sourceKind === 'default' ? 9 : 10
          continue
        }
        delivery = value
      } else if (step === 12) {
        if (delivery === 'local') {
          step += 1
          continue
        }
        const value = await askText(messages[args.locale].assetBaseUrl, assetBaseUrl, false)
        if (value === null) {
          step -= 1
          continue
        }
        assetBaseUrl = value
      } else if (step === 13) {
        if (entries.length > 1) {
          const preferred = entry && entries.includes(entry) ? entry : entries[0]
          const value = await choose(messages[args.locale].entry, entries, preferred, true)
          if (value === null) {
            step = 11
            continue
          }
          entry = value
        } else if (entries.length === 1) entry = entries[0]
        else if (existing) {
          const value = await askText(messages[args.locale].entry, entry ?? '', false)
          if (value === null) {
            step = 11
            continue
          }
          entry = value
        }
      }
      step += 1
    }
    args.framework = framework
    args.profile = profile
    args.frameworkVersion = frameworkVersion
    args.packageManager = packageManager
    args.packageManagerVersion = packageManagerVersion
    args.formats = formats ? [formats] : []
    args.capabilities = capabilities ? [capabilities] : []
    args.assetTarget = assetTarget
    args.assetTargetSpecified = true
    args.sourceSpecified = true
    args.registry = sourceKind === 'registry' ? registry : undefined
    args.offlineDirectory = sourceKind === 'offline' ? offlineDirectory : undefined
    args.assetBaseUrlSpecified = true
    args.assetBaseUrl = delivery === 'cdn' ? assetBaseUrl : undefined
    args.entry = entry
    return args
  } finally {
    io.close()
  }
}

async function confirmRenderedPlan(args: ParsedArgs, renderedPlan: string) {
  if (args.dryRun) return false
  if (args.yes || args.nonInteractive || !process.stdin.isTTY || !process.stdout.isTTY)
    return args.yes
  process.stdout.write(`${renderedPlan}\n`)
  const io = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const confirmation = await io.question(`${messages[args.locale].confirm} `)
    return /^(?:y|yes|是)$/i.test(confirmation.trim())
  } finally {
    io.close()
  }
}

const formatBytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MiB`
const planLabels = {
  en: [
    'Framework/profile',
    'Pinned packages',
    'Budget ceiling',
    'Heavy capabilities',
    'License notices',
    'Missing asset owners',
    'Generated module'
  ],
  'zh-CN': [
    '框架/方案',
    '锁定版本包',
    '体积预算上限',
    '重型能力',
    '许可证声明',
    '缺失资产所有者',
    '生成模块'
  ],
  'ja-JP': [
    'フレームワーク/プロファイル',
    '固定パッケージ',
    'サイズ上限',
    '重量機能',
    'ライセンス通知',
    '不足アセット',
    '生成モジュール'
  ],
  'de-DE': [
    'Framework/Profil',
    'Fixierte Pakete',
    'Größenbudget',
    'Schwere Fähigkeiten',
    'Lizenzhinweise',
    'Fehlende Asset-Pakete',
    'Generiertes Modul'
  ]
} as const
const planTerms = {
  en: {
    packed: 'packed',
    unpacked: 'unpacked',
    staticAssets: 'static assets',
    fullHeavy: 'FULL IS HEAVY',
    packages: 'packages',
    measurement: 'official npm',
    none: 'none'
  },
  'zh-CN': {
    packed: '压缩包',
    unpacked: '解压后',
    staticAssets: '静态资源',
    fullHeavy: 'FULL 方案体积较大',
    packages: '个包',
    measurement: '官方 npm 实测',
    none: '无'
  },
  'ja-JP': {
    packed: '圧縮時',
    unpacked: '展開後',
    staticAssets: '静的アセット',
    fullHeavy: 'FULL は大容量です',
    packages: 'パッケージ',
    measurement: '公式 npm 測定',
    none: 'なし'
  },
  'de-DE': {
    packed: 'gepackt',
    unpacked: 'entpackt',
    staticAssets: 'statische Assets',
    fullHeavy: 'FULL IST GROSS',
    packages: 'Pakete',
    measurement: 'offizielle npm-Messung',
    none: 'keine'
  }
} as const
const renderPlanSummary = (
  plan: Awaited<ReturnType<typeof createFileViewerInstallPlan>>,
  locale: FileViewerCliLocale
) => {
  const labels = planLabels[locale]
  const terms = planTerms[locale]
  const lines = [
    `${labels[0]}: ${plan.framework} / ${plan.profile}`,
    `${labels[1]}: ${plan.packageSpecs.join(', ')}`
  ]
  if (plan.estimates) {
    lines.push(
      `${labels[2]}: ${formatBytes(plan.estimates.packedClosureBytes)} ${terms.packed}, ${formatBytes(plan.estimates.unpackedClosureBytes)} ${terms.unpacked}, ${formatBytes(plan.estimates.staticAssetBytes)} ${terms.staticAssets}.`
    )
  }
  if (plan.legacyFullEstimate) {
    const estimate = plan.legacyFullEstimate
    lines.push(
      `${labels[2]}: ${terms.fullHeavy} — ${estimate.packageCountRange.join('–')} ${terms.packages}, ${formatBytes(estimate.packedBytesRange[0])}–${formatBytes(estimate.packedBytesRange[1])} ${terms.packed}, ${formatBytes(estimate.unpackedBytesRange[0])}–${formatBytes(estimate.unpackedBytesRange[1])} ${terms.unpacked} (${estimate.measuredAt}, ${terms.measurement}).`
    )
  }
  lines.push(
    `${labels[3]}: ${plan.heavyCapabilities.length ? `${plan.heavyCapabilities.join(', ')} (file-viewer list)` : terms.none}`
  )
  lines.push(
    `${labels[4]}: ${plan.licenseNotices.map((item) => `${item.packageName} (${item.spdx}, ${item.policy})`).join(', ') || terms.none}`
  )
  lines.push(
    `${labels[5]}: ${plan.missingAssetRendererIds.length ? plan.missingAssetRendererIds.join(', ') : terms.none}`
  )
  lines.push(`${labels[6]}: ${plan.generatedModule} (${plan.integrationImport})`)
  lines.push('', plan.command, ...plan.assetCommands)
  return lines.join('\n')
}

async function main() {
  let args = parseArgs(process.argv.slice(2))
  if (args.version) {
    print((await loadFileViewerCliCatalog()).core.version, false)
    return
  }
  if (args.fileViewerVersion) {
    const catalogVersion = (await loadFileViewerCliCatalog()).core.version
    if (args.fileViewerVersion !== catalogVersion) {
      throw new Error(
        `This installed CLI catalog is ${catalogVersion}; requested ${args.fileViewerVersion}. Run @file-viewer/cli@${args.fileViewerVersion} to use that release catalog.`
      )
    }
  }
  if (args.command === 'copy-assets') {
    if (args.dryRun) {
      print({ dryRun: true, mode: 'legacy-copy-assets', args: args.passthrough }, args.json)
      return
    }
    const result = await executeLegacyCopyAssets(args)
    if (result.mode === 'help') print(result.usage, false)
    else if (result.mode === 'version') print(result.version, false)
    else print(result, args.json)
    return
  }
  if (args.command === 'create' || args.command === 'add') {
    const existing = args.command === 'add'
    const projectExistedBefore = existsSync(args.projectRoot)
    const inspection = existing ? await inspectExistingProject(args) : null
    if (inspection && !args.framework) args.framework = inspection.framework
    if (inspection && !args.frameworkVersion) args.frameworkVersion = inspection.frameworkVersion
    if (inspection?.detectedProfile && !args.profile) args.profile = inspection.detectedProfile
    if (inspection?.packageManager && !args.packageManager)
      args.packageManager = inspection.packageManager
    if (inspection?.packageManagerVersion && !args.packageManagerVersion)
      args.packageManagerVersion = inspection.packageManagerVersion
    if (inspection?.assetTarget && !args.assetTarget) args.assetTarget = inspection.assetTarget
    if (inspection?.entry && !args.entry) args.entry = inspection.entry
    if (inspection?.assetBaseUrl && !args.assetBaseUrlSpecified)
      args.assetBaseUrl = inspection.assetBaseUrl
    if (inspection?.source?.kind === 'registry' && !args.sourceSpecified)
      args.registry = inspection.source.registry
    if (inspection?.source?.kind === 'offline-directory' && !args.sourceSpecified)
      args.offlineDirectory = inspection.source.directory
    args = await promptQuickstart(args, existing, inspection)
    if (!args.assetBaseUrl && inspection?.adapter.publicDirectory && args.assetTarget) {
      args.assetBaseUrl = inferFileViewerLocalAssetBaseUrl(
        args.assetTarget,
        inspection.adapter.publicDirectory
      )
    }
    if (!existing && args.packageManager === 'yarn' && !args.packageManagerVersion)
      args.packageManagerVersion = '1.22.22'
    const config = await configFromArgs(args)
    const plan = await createFileViewerInstallPlan(config, {
      projectRoot: args.projectRoot,
      packageManager: args.packageManager,
      assetTarget: args.assetTarget
    })
    const renderedPlan = renderPlanSummary(plan, args.locale)
    const confirmed = await confirmRenderedPlan(args, renderedPlan)
    if (!confirmed) {
      const inspectionText = inspection
        ? [
            ...inspection.warnings,
            ...(inspection.adapter.manualSteps.length
              ? [`Manual steps:\n- ${inspection.adapter.manualSteps.join('\n- ')}`]
              : [])
          ].join('\n')
        : ''
      print(
        args.json
          ? { dryRun: true, inspection, config, plan }
          : `${inspectionText}${inspectionText ? '\n' : ''}${renderPlanSummary(plan, args.locale)}`,
        args.json
      )
      return
    }
    if (inspection) {
      const adapter = args.assetTargetSpecified
        ? {
            ...inspection.adapter,
            assetTarget: config.assetTarget,
            manualSteps: [],
            safeAutomaticConfiguration: true,
            failClosed: false
          }
        : inspection.adapter
      assertFileViewerProjectAdapterCanWrite(adapter)
    }
    const scaffoldPreview = existing
      ? null
      : await scaffoldFileViewerQuickstart(args.projectRoot, config, { force: args.force })
    const initializedPreview = await initializeFileViewerProject(args.projectRoot, config, {
      configFile: args.configFile,
      force: args.force
    })
    const generatedPreview = await generateFileViewerIntegrationModule(args.projectRoot, config, {
      output: args.output,
      force: args.force
    })
    if (existing)
      await patchFileViewerApplicationEntry(args.projectRoot, config.generatedModule, {
        entry: config.entry
      })
    const rollbackFiles = await snapshotProjectFiles([
      ...(scaffoldPreview?.files.map((file) => file.path) ?? []),
      initializedPreview.configPath,
      generatedPreview.outputPath,
      ...(config.entry ? [resolve(args.projectRoot, config.entry)] : []),
      ...[
        'package.json',
        'package-lock.json',
        'npm-shrinkwrap.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lock',
        'bun.lockb',
        '.pnp.cjs',
        '.pnp.loader.mjs',
        '.pnp.data.json',
        '.yarnrc',
        '.yarnrc.yml',
        '.yarn/install-state.gz'
      ].map((path) => resolve(args.projectRoot, path))
    ])
    const packageManagerArtifacts = [
      'node_modules',
      'package-lock.json',
      'npm-shrinkwrap.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lock',
      'bun.lockb',
      '.pnp.cjs',
      '.pnp.loader.mjs',
      '.pnp.data.json',
      '.yarn',
      '.yarn/unplugged',
      config.assetTarget
    ].map((path) => resolve(args.projectRoot, path))
    const absentArtifacts = packageManagerArtifacts.filter((path) => !existsSync(path))
    const assetDirectoryBackup = await snapshotProjectDirectories([
      resolve(args.projectRoot, config.assetTarget)
    ])
    let packageManagerDirectoryTransaction: AtomicProjectDirectoryTransaction | null = null
    try {
      const scaffold = existing
        ? null
        : await scaffoldFileViewerQuickstart(args.projectRoot, config, {
            write: true,
            force: args.force
          })
      const managedDependencies = await reconcileFileViewerManagedDependencies(
        args.projectRoot,
        config,
        plan,
        { write: true }
      )
      const appliedConfig = managedDependencies.config
      packageManagerDirectoryTransaction = await stageProjectDirectoriesAtomically(
        args.projectRoot,
        ['node_modules', '.yarn/unplugged'].map((path) => resolve(args.projectRoot, path))
      )
      const results = await executeStepsSequentially(plan.steps, true)
      const removedAssetOwners =
        config.profile === 'full'
          ? []
          : await reconcileFileViewerAssetOwners(args.projectRoot, plan)
      const initialized = await initializeFileViewerProject(args.projectRoot, appliedConfig, {
        configFile: args.configFile,
        write: true,
        force: args.force
      })
      const generated = await generateFileViewerIntegrationModule(args.projectRoot, appliedConfig, {
        write: true,
        output: args.output,
        force: args.force
      })
      const entryIntegration = await patchFileViewerApplicationEntry(
        args.projectRoot,
        appliedConfig.generatedModule,
        { write: true, entry: appliedConfig.entry }
      )
      await discardAtomicProjectDirectoryBackup(packageManagerDirectoryTransaction)
      packageManagerDirectoryTransaction = null
      print(
        {
          dryRun: false,
          detectedExistingProject: existing,
          inspection,
          scaffoldPreview,
          scaffold,
          initialized,
          managedDependencies,
          plan,
          results,
          removedAssetOwners,
          generated,
          entryIntegration
        },
        args.json
      )
    } catch (error) {
      // A brand-new target is wholly CLI-owned. Remove a failed scaffold so a
      // package-manager or asset error never leaves a misleading half-project.
      // Existing directories are never recursively removed.
      if (!existing && !projectExistedBefore) {
        await rm(args.projectRoot, { recursive: true, force: true })
      } else {
        await rollbackAtomicProjectDirectories(packageManagerDirectoryTransaction)
        await restoreProjectFiles(args.projectRoot, rollbackFiles, absentArtifacts)
        await restoreProjectDirectories(assetDirectoryBackup.backups)
      }
      throw error
    } finally {
      await rm(assetDirectoryBackup.temporary, { recursive: true, force: true })
    }
    return
  }
  if (args.command === 'list' || args.command === 'capabilities') {
    const capabilities = await listFileViewerCapabilities()
    print(args.json ? capabilities : renderFileViewerCapabilityList(capabilities), args.json)
    return
  }
  if (args.command === 'plan') {
    const plan = await createFileViewerInstallPlan(await configFromArgs(args), {
      projectRoot: args.projectRoot,
      packageManager: args.packageManager,
      assetTarget: args.assetTarget
    })
    print(args.json ? plan : renderPlanSummary(plan, args.locale), args.json)
    return
  }
  if (args.command === 'init') {
    const result = await initializeFileViewerProject(args.projectRoot, await configFromArgs(args), {
      configFile: args.configFile,
      write: args.write && !args.dryRun,
      force: args.force
    })
    print(result, args.json)
    return
  }
  if (
    args.command === 'config-add' ||
    args.command === 'config-remove' ||
    args.command === 'select' ||
    args.command === 'remove'
  ) {
    if (!args.token) throw new Error(`${args.command} requires a format or capability token.`)
    const result = await updateFileViewerProjectSelection(
      args.projectRoot,
      args.token,
      args.command === 'config-remove' || args.command === 'remove' ? 'remove' : 'add',
      { configFile: args.configFile, write: args.write && !args.dryRun }
    )
    print({ dryRun: !result.written, ...result }, args.json)
    return
  }
  if (args.command === 'generate') {
    const result = await generateFileViewerIntegrationModule(
      args.projectRoot,
      await configFromArgs(args),
      {
        write: args.write && !args.dryRun,
        output: args.output,
        force: args.force
      }
    )
    print(
      args.json
        ? result
        : args.write && !args.dryRun
          ? `${result.written ? 'Wrote' : 'Kept'} ${result.outputPath}.\nAdd this to your application entry: ${result.importStatement}`
          : result.content,
      args.json
    )
    return
  }
  if (args.command === 'install' || args.command === 'assets') {
    if (args.command === 'assets') {
      const configured = await readFileViewerProjectConfig(args.projectRoot, args.configFile, true)
      const modularSelectionRequested = Boolean(
        args.framework || args.profile || args.formats.length || args.capabilities.length
      )
      if (!configured && !modularSelectionRequested) {
        if (args.dryRun) {
          print({ dryRun: true, mode: 'legacy-copy-assets', args: args.passthrough }, args.json)
          return
        }
        if (args.positionals[0]) args.passthrough.unshift(args.positionals[0])
        else if (args.assetTarget) args.passthrough.unshift(args.assetTarget)
        const legacyResult = await executeLegacyCopyAssets(args)
        if (legacyResult.mode === 'help') print(legacyResult.usage, false)
        else if (legacyResult.mode === 'version') print(legacyResult.version, false)
        else print(legacyResult, args.json)
        return
      }
      if (args.passthrough.length || args.positionals.length)
        throw new Error(
          'Legacy copy-assets flags cannot be mixed with a configured modular asset plan.'
        )
    }
    const config = await configFromArgs(args)
    const plan = await createFileViewerInstallPlan(config, {
      projectRoot: args.projectRoot,
      packageManager: args.packageManager,
      assetTarget: args.assetTarget
    })
    const confirmed = !args.dryRun && (args.command === 'install' ? args.yes : args.write)
    const steps =
      args.command === 'install'
        ? plan.steps
        : plan.steps.filter((candidate) => candidate.kind === 'assets')
    const transactionFiles = confirmed
      ? await snapshotProjectFiles(
          [
            'package.json',
            'package-lock.json',
            'npm-shrinkwrap.json',
            'pnpm-lock.yaml',
            'yarn.lock',
            'bun.lock',
            'bun.lockb',
            '.pnp.cjs',
            '.pnp.loader.mjs',
            '.pnp.data.json',
            '.yarnrc',
            '.yarnrc.yml',
            '.yarn/install-state.gz',
            args.configFile,
            config.generatedModule
          ].map((path) => resolve(args.projectRoot, path))
        )
      : []
    const absentArtifacts = confirmed
      ? [
          'node_modules',
          'package-lock.json',
          'npm-shrinkwrap.json',
          'pnpm-lock.yaml',
          'yarn.lock',
          'bun.lock',
          'bun.lockb',
          '.pnp.cjs',
          '.pnp.loader.mjs',
          '.pnp.data.json',
          '.yarn',
          '.yarn/unplugged',
          config.generatedModule
        ]
          .map((path) => resolve(args.projectRoot, path))
          .filter((path) => !existsSync(path))
      : []
    const assetDirectoryBackup = confirmed
      ? await snapshotProjectDirectories([resolve(args.projectRoot, config.assetTarget)])
      : null
    let packageManagerDirectoryTransaction: AtomicProjectDirectoryTransaction | null = null
    try {
      const managedDependencies =
        confirmed && args.command === 'install'
          ? await reconcileFileViewerManagedDependencies(args.projectRoot, config, plan, {
              write: true
            })
          : null
      const appliedConfig = managedDependencies?.config ?? config
      if (confirmed && args.command === 'install')
        packageManagerDirectoryTransaction = await stageProjectDirectoriesAtomically(
          args.projectRoot,
          ['node_modules', '.yarn/unplugged'].map((path) => resolve(args.projectRoot, path))
        )
      const results = await executeStepsSequentially(steps, confirmed)
      const removedAssetOwners =
        confirmed && config.profile !== 'full'
          ? await reconcileFileViewerAssetOwners(args.projectRoot, plan)
          : []
      const initialized =
        confirmed && args.command === 'install'
          ? await initializeFileViewerProject(args.projectRoot, appliedConfig, {
              configFile: args.configFile,
              write: true,
              force: args.force
            })
          : null
      const generated = await generateFileViewerIntegrationModule(args.projectRoot, appliedConfig, {
        write: confirmed && args.command === 'install',
        output: args.output,
        force: args.force
      })
      await discardAtomicProjectDirectoryBackup(packageManagerDirectoryTransaction)
      packageManagerDirectoryTransaction = null
      print(
        {
          dryRun: !confirmed,
          plan,
          results,
          removedAssetOwners,
          managedDependencies,
          initialized,
          generated
        },
        args.json
      )
    } catch (error) {
      if (confirmed) {
        await rollbackAtomicProjectDirectories(packageManagerDirectoryTransaction)
        await restoreProjectFiles(args.projectRoot, transactionFiles, absentArtifacts)
        if (assetDirectoryBackup) await restoreProjectDirectories(assetDirectoryBackup.backups)
      }
      throw error
    } finally {
      if (assetDirectoryBackup)
        await rm(assetDirectoryBackup.temporary, { recursive: true, force: true })
    }
    return
  }
  if (args.command === 'prepare' || args.command === 'cache') {
    if (
      args.concurrency !== undefined &&
      (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 8)
    ) {
      throw new Error(
        'prepare --concurrency must be an integer from 1 to 8. Install commands continue to support 1 to 32.'
      )
    }
    const existing = await readFileViewerProjectConfig(args.projectRoot, args.configFile, true)
    const registryRaw =
      args.registry ??
      (existing?.source?.kind === 'registry' ? existing.source.registry : undefined)
    if (!registryRaw)
      throw new Error(
        'prepare requires an explicit --registry URL or a configured registry source.'
      )
    const registry = normalizeFileViewerRegistryUrl(registryRaw)
    const planConfig = normalizeFileViewerConfig({
      ...(existing ?? {}),
      ...(args.framework ? { framework: args.framework } : {}),
      ...(args.profile ? { profile: args.profile } : {}),
      formats: args.formats.length ? args.formats : (existing?.formats ?? []),
      capabilities: args.capabilities.length ? args.capabilities : (existing?.capabilities ?? []),
      frameworkVersion: args.frameworkVersion ?? existing?.frameworkVersion,
      assetBaseUrl: args.assetBaseUrl ?? existing?.assetBaseUrl,
      source: { kind: 'registry', registry }
    })
    const installPlan = await createFileViewerInstallPlan(planConfig, {
      projectRoot: args.projectRoot,
      packageManager: args.packageManager,
      assetTarget: args.assetTarget
    })
    const catalogVersion = (await loadFileViewerCliCatalog()).core.version
    const requiredPackages = [
      ...installPlan.requiredPackages,
      { packageName: '@file-viewer/cli', version: catalogVersion },
      { packageName: 'create-file-viewer', version: catalogVersion },
      { packageName: 'file-viewer-cli', version: catalogVersion }
    ].filter(
      (item, index, values) =>
        values.findIndex((candidate) => candidate.packageName === item.packageName) === index
    )
    const plan = { ...installPlan, requiredPackages }
    const directory = args.offlineDirectory ?? `.file-viewer/offline/${catalogVersion}`
    if (!args.yes || args.dryRun) {
      print(
        args.json
          ? { dryRun: true, directory: resolve(args.projectRoot, directory), registry, plan }
          : `${renderPlanSummary(plan, args.locale)}\n\nOffline directory: ${resolve(args.projectRoot, directory)}\nUse --yes to download atomically.`,
        args.json
      )
      return
    }
    const result = await prepareFileViewerOfflineDirectory(plan.requiredPackages, {
      projectRoot: args.projectRoot,
      directory,
      registry,
      concurrency: args.concurrency
    })
    print(result, args.json)
    return
  }
  if (args.command === 'doctor' || args.command === 'verify') {
    const result = await doctorFileViewerProject(
      args.projectRoot,
      args.configFile,
      args.packageManager
    )
    print(result, args.json)
    if (args.command === 'verify' && !result.ok) process.exitCode = 1
    return
  }
  throw new Error(`Unknown command ${args.command}.\n\n${localizedUsage[args.locale]}`)
}

main().catch((error) => {
  if (Object.values(messages).some((message) => message.cancelled === (error as Error).message)) {
    process.stdout.write(`${(error as Error).message}\n`)
    process.exitCode = 0
    return
  }
  process.stderr.write(`[file-viewer] ${(error as Error).message}\n`)
  process.exitCode = 1
})
