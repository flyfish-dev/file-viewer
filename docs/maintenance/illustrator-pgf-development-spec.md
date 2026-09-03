# Adobe Illustrator PGF 原生场景解析器开发与验收规范

> 状态：开发基线  
> 适用范围：独立仓库、浏览器 SDK、Worker/WASM 资产、渲染引擎、命令行诊断工具及 File Viewer 接入适配器  
> 目标读者：格式解析、图形渲染、浏览器运行时、测试、安全及发布维护人员

## 1. 文档目的

本规范定义 Adobe Illustrator PGF 原生场景解析器的产品边界、架构约束、格式覆盖、公共 API、安全与性能要求、测试语料、验收门禁及发布口径。

本项目必须交付一个可独立发布和独立使用的解析与预览 SDK。File Viewer 只能通过稳定公共 API 接入，不得依赖解析器内部文件、私有类型或未发布路径。

本规范中的“完整”不表示无条件复刻 Adobe Illustrator 编辑器，而是同时满足以下条件：

1. **容器完整**：目标版本的 Illustrator 原生私有数据能够被可靠识别、提取和解压。
2. **语法完整**：输入中的每条有效语句都进入已知 AST 节点或可无损保留的未知节点，不得静默丢弃。
3. **语义完整**：支持矩阵内声明支持的对象、属性和资源全部映射到统一 Scene IR。
4. **渲染完整**：支持矩阵内声明为高还原的特性通过结构真值和 Illustrator 参考画面验收。
5. **降级完整**：无法还原的未知操作符、插件对象、字体、链接资源和效果必须被保存、定位并报告。

## 2. 术语和格式边界

### 2.1 PGF

本文中的 PGF 指 Adobe Illustrator 文件中的原生可编辑场景数据，也称 Illustrator private source 或 native revisable source。

它不是 `libPGF` 所实现的 Progressive Graphics File 位图压缩格式。项目名称、包说明、API 文档和错误信息必须明确这一差异。

### 2.2 PDF-compatible 表示

Illustrator 文件可能同时包含：

- PDF 页面表示，用于跨应用显示、打印和交换；
- Illustrator 原生私有场景，用于恢复图层、路径、文字、效果和编辑语义。

两者是独立表示：

- PDF 页面不能冒充 PGF 原生场景；
- PGF 解析失败不能被普通 PDF 成功渲染所掩盖；
- PDF 页、PDF OCG、Illustrator 画板和 Illustrator 图层不得假设一一对应；
- 混合预览模式必须明确当前画面来自 PDF 还是原生场景。

### 2.3 Lossless AST

Lossless AST 是与原始 Illustrator source 对应的无损语法模型，负责保留：

- 原始语句顺序；
- 原始操作数和操作符；
- 注释、伪注释和换行风格；
- 字符串、十六进制数据和二进制资源；
- 未识别的扩展语法；
- 源码字节或字符范围。

### 2.4 Scene IR

Scene IR 是与具体渲染后端无关的语义场景模型。它不负责原文回写，但必须具备稳定 schema、显式能力状态和可序列化诊断信息。

## 3. 产品目标

解析器必须具备以下能力：

- 纯浏览器运行，不依赖服务端转换；
- 离线部署，运行时不访问第三方 CDN 或公网资源；
- 支持 `ArrayBuffer`、`Uint8Array`、`Blob` 和浏览器 `File`；
- 在 Dedicated Worker 中完成容器解析、解压、词法分析和语义解析；
- 提供 Canvas2D、OffscreenCanvas/ImageBitmap 和 SVG 输出；
- 提供画板切换、图层树、图层显隐、缩放、拖动和适合窗口；
- 提供结构化 Scene IR、Lossless AST、诊断和支持报告；
- 支持 AbortSignal、超时终止、内存预算和显式销毁；
- 提供稳定的浏览器 API、低级解析 API 和命令行诊断 API；
- 能被 File Viewer、普通网页、Web Component 或其他前端框架快速接入；
- 对所有未支持语义实行 fail-soft 展示和 fail-closed 声明。

## 4. 非目标

以下能力不属于首个稳定版的承诺范围：

- 修改并重新写出 AI/PGF 文件；
- 提供 Illustrator 编辑器能力；
- 执行第三方 Illustrator 插件二进制；
- 执行 Illustrator Action、脚本或任意 PostScript 程序；
- 在缺少字体、ICC profile 或外链资源时伪造“完全一致”；
- 在没有插件算法或展开外观时精确复现第三方 Live Effect；
- 将结构识别、缩略图显示或单一样例成功宣传为完整格式支持。

如果后续增加写出能力，必须作为独立 writer 模块和独立验收范围，不得污染只读解析器的安全边界。

## 5. 不可违反的架构原则

1. Core 必须为纯 TypeScript，不依赖 DOM、框架或 File Viewer。
2. 不得使用 `eval`、`Function`、动态脚本注入或通用 PostScript 执行输入。
3. 解析器必须是声明式、白名单、带预算的有限状态解析器。
4. 容器、解压、词法、语义、IR 和渲染必须分层。
5. Lossless AST 与 Scene IR 必须分离。
6. 未知语法必须保留原始数据，不得被忽略。
7. Worker 是生产环境强制路径，不得因为 Worker 失败自动回退主线程解析。
8. WASM 和 Worker 必须本地化、可配置 URL、可校验资产版本。
9. 所有缓存都必须有大小上限、淘汰策略和销毁入口。
10. 任何格式支持声明必须由真实语料、结构真值和浏览器画面共同证明。

## 6. 推荐仓库和模块结构

建议独立仓库使用以下结构：

```text
illustrator-pgf/
├── packages/
│   ├── core/                 # 容器、词法、AST、语义解析、Scene IR
│   ├── codecs/               # deflate、zstd 及浏览器/WASM 适配
│   ├── browser/              # Worker、session、AbortSignal、资产解析
│   ├── render-canvas/        # Canvas2D、OffscreenCanvas、ImageBitmap
│   ├── render-svg/           # SVG 生成和安全清洗
│   ├── sdk/                  # 对外门面包
│   ├── cli/                  # inspect、parse、diff、benchmark
│   └── testing/              # fixture、oracle、pixel diff、fuzz helper
├── apps/
│   └── playground/           # 独立浏览器演示和人工验收入口
├── integrations/
│   └── file-viewer/          # File Viewer 公共 API 接入示例
├── tools/
│   └── illustrator-oracle/   # 开发期 Illustrator 真值导出工具
├── corpus/
│   ├── manifests/
│   ├── synthetic/
│   └── README.md
├── docs/
│   ├── architecture.md
│   ├── format-versions.md
│   ├── support-matrix.md
│   ├── api.md
│   ├── security.md
│   └── corpus-policy.md
├── AGENTS.md
├── SECURITY.md
└── DEVELOPMENT-SPEC.md
```

对外可以发布多个内部包，但必须提供一个只需安装一次的门面包。高级用户可以使用子路径导出，普通用户不得被要求理解内部包关系。

## 7. 格式版本覆盖要求

### 7.1 容器和压缩族

| 格式族 | 原生数据位置 | 压缩 | 必须实现的行为 |
|---|---|---|---|
| AI3–AI8 | 文件本体 | 无或旧式资源编码 | 验证 Illustrator Creator，直接进入 Lossless Lexer |
| AI9–AI10 | PDF `AIPrivateData*` | 分块 Flate/ASCIIHex 等 | 按页和块号排序，逐块解码，验证连续性 |
| AI CS–CS6 / CC Legacy | PDF `AIPrivateData*` | `%AI12_CompressedData` + zlib | 拼接后有界解压，验证 source header 和 EOF |
| AI 2020+ | PDF `AIPrivateData*` | `%AI24_ZStandard_Data` + zstd | 浏览器原生能力探测，本地 WASM 后备，有界解压 |
| AIT | 与对应 AI 版本相同 | 随版本变化 | 保留模板身份和模板元数据，不按普通 PDF 处理 |

### 7.2 版本指纹

解析结果必须记录并交叉验证：

- PDF 版本；
- `ContainerVersion`；
- `CreatorVersion`；
- `RoundtripVersion`；
- `%%AI8_CreatorVersion`；
- `%%AI5_FileFormat`；
- `%AI12_*`、`%AI17_*`、`%AI24_*` 等特征；
- 文件 MIME、Creator、XMP 和 Illustrator namespace；
- 直接 PostScript 与 PDF container 的来源类型。

出现版本字段矛盾时必须产生诊断，不能静默选择其中一个。

未知未来版本必须：

- 尝试安全提取和 Lossless AST；
- 默认把未知扩展保留为 opaque/unknown；
- 降低 fidelity 等级；
- 禁止自动继承上一版本的完整支持声明。

## 8. 容器检查器要求

容器检查器必须提供不进行完整语义解析的快速检查：

```ts
interface IllustratorContainerInspection {
  kind: 'direct-postscript' | 'pdf-private' | 'pdf-surface-only' | 'unknown'
  illustratorEvidence: boolean
  pdfSurface: 'usable' | 'warning-placeholder' | 'absent' | 'unknown'
  privateSource: 'present' | 'missing' | 'corrupt' | 'unknown'
  compression?: 'none' | 'deflate' | 'zstd'
  containerVersion?: number
  creatorVersion?: number
  roundtripVersion?: number
  privateBlocks: number
  diagnostics: IllustratorDiagnostic[]
}
```

容器检查器必须：

- 验证真实 Illustrator 来源，拒绝仅改名的 PDF；
- 解析 PDF Catalog、Pages、PieceInfo、Illustrator、Private 引用链；
- 支持引用对象、直接字典、xref table、xref stream 和 object stream；
- 处理合法的增量更新，并拒绝歧义或重复覆盖；
- 检测循环引用、代数不匹配、缺失对象和重复对象；
- 严格验证 `NumBlock`、块编号和块连续性；
- 支持合法的直接或间接 Length；
- 按白名单处理 PDF stream filter；
- 拒绝加密后无法安全读取的私有数据；
- 不依赖在前若干 MiB 中做字符串猜测作为最终结论。

## 9. 私有数据解码要求

解码器必须：

- 按版本采用对应的拼接和解压规则；
- 支持 deflate、ASCIIHex、zlib 和 zstd；
- 在解压前检查压缩输入总量；
- 在解压过程中执行输出上限，而不是解压后再检查；
- 验证输出以 Illustrator PostScript header 开始；
- 验证源码终止标记和结构完整性；
- 保留压缩算法、块来源和每块校验信息；
- 对截断、损坏、额外尾随数据给出稳定错误码；
- 支持浏览器 Worker 和 Node CLI 使用同一规则；
- 不允许不同运行时对同一输入产生不一致的解码结果。

推荐初始默认限制如下，所有限制允许由宿主向下收紧，向上放宽必须显式配置：

```ts
interface IllustratorLimits {
  maxFileBytes: number              // 默认 128 MiB
  maxDecodedBytes: number           // 默认 128 MiB
  maxPdfObjects: number             // 默认 250,000
  maxPrivateBlocks: number          // 默认 10,000
  maxTokens: number                 // 默认 1,000,000
  maxStatements: number             // 默认 250,000
  maxNodes: number                  // 默认 250,000
  maxPathPoints: number             // 默认 1,000,000
  maxNesting: number                // 默认 256
  maxStringBytes: number            // 默认 8 MiB
  maxSingleRasterPixels: number     // 默认 64,000,000
  maxTotalRasterBytes: number       // 默认 256 MiB
  maxWorkerTimeMs: number           // 默认 30,000
  maxRenderPixels: number           // 默认 32,000,000
  maxCacheBytes: number             // 默认 128 MiB
}
```

## 10. Lossless Lexer 和 AST 要求

Lexer 必须正确处理：

- CR、LF、CRLF；
- 普通注释和 Illustrator 伪注释；
- 整数、实数、指数数值；
- name、literal name 和 escaped name；
- 嵌套 PostScript 字符串及转义；
- 十六进制字符串；
- array、dictionary、procedure 和结构分隔符；
- ASCII85、hex、binary resource section；
- 跨行语句和嵌入数据；
- 未知操作符和未知版本扩展；
- 精确源码 span、行号和列号。

Lossless AST 必须满足：

- 按顺序保存所有语句；
- 保存原始 `raw` 内容；
- 保存解析后的 typed operands；
- 保存源位置；
- 保存资源段和未知块；
- 支持从 token/statement 重建原始源码；
- 不因 Scene IR 不支持某特性而丢失 AST 信息；
- 不把 PostScript prolog 中的程序定义误判为画布对象；
- 能区分定义、资源、fallback appearance 和实际绘制内容。

## 11. 语义解析器要求

语义解析器必须使用版本化规则表，禁止把全部版本逻辑堆入单一巨型 switch。

建议按以下层次注册操作符：

```text
base
├── ai3
├── ai5
├── ai7
├── ai8
├── ai9
├── ai10
├── ai11-text
├── ai12
├── ai14
├── ai17
└── ai24
```

每个操作符处理器必须声明：

- 支持版本；
- 操作数 schema；
- 状态读写范围；
- 是否产生 Scene IR；
- 是否只产生 metadata/resource；
- 是否属于 fallback appearance；
- 降级和未知行为；
- 对应 fixture 和测试 ID。

状态栈必须显式管理：

- graphics state；
- transform；
- fill/stroke；
- clipping；
- layer/group/compound hierarchy；
- text state；
- opacity/blend；
- color space；
- pattern/gradient/symbol/brush resources。

任何栈下溢、未闭合层级或非法状态恢复必须产生确定性错误或诊断。

## 12. Scene IR 要求

### 12.1 Document

Document 至少包含：

- `schemaVersion`；
- 文档单位、画布和坐标原点；
- 大画布比例；
- 文档颜色模式；
- ICC profile 引用；
- metadata；
- artboards；
- layers；
- resources；
- scene nodes；
- diagnostics；
- unsupported feature inventory；
- source fingerprint。

### 12.2 节点类型

必须定义：

- Group；
- Layer；
- Path；
- CompoundPath；
- ClipGroup；
- Text；
- RasterImage；
- PlacedImage；
- SymbolDefinition；
- SymbolInstance；
- GradientMesh；
- PluginObject；
- UnknownNode。

每个节点必须包含：

- 稳定 ID；
- 源码 span；
- 父子关系；
- 图层归属；
- 变换矩阵；
- 几何边界；
- 可见、锁定、打印状态；
- Appearance；
- fidelity；
- diagnostics；
- 可选原始语句引用。

### 12.3 Appearance

Appearance 不能简化为单个 fill 和 stroke，必须支持：

- 多 fill；
- 多 stroke；
- stroke alignment；
- cap、join、miter、dash；
- opacity；
- blend mode；
- clipping mask；
- opacity mask；
- overprint；
- knockout；
- isolated group；
- effects；
- fallback/expanded appearance。

### 12.4 Paint

Paint 必须覆盖：

- Gray；
- RGB；
- CMYK；
- Lab；
- Spot/Named Ink；
- tint；
- linear gradient；
- radial gradient；
- freeform/mesh gradient；
- pattern；
- raster paint；
- none。

颜色转换必须记录源色彩空间、转换目标、ICC profile 和近似原因。

## 13. 各类场景对象开发要求

### 13.1 画板和坐标

必须支持：

- 多画板；
- 原始共享画布；
- 画板独立裁切；
- 画板名称、UUID、选择、锁定；
- ruler origin；
- bleed；
- large canvas scale；
- Y-up 到渲染坐标的一次性转换。

不得把场景对象复制进每个画板。对象必须保留共享画布坐标，画板只是导出和视图边界。

### 13.2 图层和组

必须支持：

- 图层顺序；
- 嵌套层和组；
- 名称；
- hidden、locked、printable、preview；
- layer color；
- isolation；
- clip group；
- compound group；
- 图层显隐的增量重绘。

### 13.3 路径

必须支持：

- move、line、cubic Bézier；
- open/closed contour；
- hard/soft point；
- incoming/outgoing handle；
- nonzero/evenodd；
- compound holes；
- clipping path；
- 几何和 paint path 的区别；
- 精确 transform composition。

### 13.4 文字

必须支持并分别验收：

- point text；
- area text；
- path text；
- threaded text；
- 多 frame story；
- character run；
- paragraph run；
- font selector 和 PostScript name；
- font size、tracking、kerning、baseline shift；
- horizontal/vertical text；
- text transform；
- fill、stroke、opacity；
- missing-font diagnostics；
- outline/fallback appearance。

不得把文字内容识别成功等同于文字排版还原成功。

### 13.5 图片和外链资源

必须支持：

- embedded raster；
- placed/linked image；
- image transform；
- crop；
- alpha；
- ICC profile；
- DPI 和像素尺寸；
- missing-link diagnostics；
- 宿主注入的 resource resolver。

默认禁止自动读取本地路径或访问网络。

### 13.6 渐变、图案、符号和画笔

必须建立独立资源表并按引用解析：

- linear/radial gradient；
- gradient midpoint 和 spread；
- gradient transform；
- pattern definition/instance；
- symbol definition/instance；
- brush definition；
- brush expansion/fallback path；
- 资源循环引用检测。

### 13.7 透明和混合

必须支持：

- object/group opacity；
- blend modes；
- isolated group；
- knockout；
- opacity mask；
- clipping mask；
- transparency group；
- flatten/alternate content 的来源标记。

### 13.8 Mesh、Live Effect 和插件对象

处理优先级必须是：

1. 解析真实原生参数；
2. 使用文件内经过验证的 expanded/fallback appearance；
3. 使用 alternate content；
4. 保存 opaque payload 并显示明确诊断。

不得用普通 bounding box、占位色块或空白画面冒充成功渲染。

第三方插件对象必须至少保留：

- 插件标识；
- 原始 payload；
- fallback appearance；
- 源位置；
- 影响的可见对象范围；
- 不支持原因。

## 14. 渲染器要求

### 14.1 后端

必须提供：

- Canvas2D 渲染；
- OffscreenCanvas + ImageBitmap Worker 渲染；
- 主线程 Canvas2D 兼容后备；
- SVG 导出；
- Scene JSON 导出。

WebGL、WebGPU、CanvasKit 或其他大型 WASM 后端只能在真实 benchmark 证明必要后增加，不能成为基础解析器的强依赖。

### 14.2 渲染会话

渲染会话必须支持：

- 画板选择；
- 图层显隐；
- fit、zoom、pan；
- DPR；
- viewport rendering；
- 分块或分层缓存；
- 渲染 revision；
- 旧请求取消；
- cache trim；
- 显式 dispose。

### 14.3 SVG 安全

SVG 输出必须：

- 不包含脚本；
- 不包含事件属性；
- 不包含未经宿主允许的外部 URL；
- 不包含 `foreignObject`，除非显式 opt-in；
- 对 ID、URL fragment 和 CSS 进行命名空间隔离；
- 对超大 path、filter 和嵌套应用预算。

## 15. 浏览器和 Worker 要求

必须提供 Dedicated Worker 协议：

```ts
type IllustratorWorkerRequest =
  | OpenRequest
  | GetSummaryRequest
  | GetArtboardsRequest
  | GetLayersRequest
  | GetSupportReportRequest
  | RenderRequest
  | ExportSvgRequest
  | DisposeRequest
```

Worker client 必须：

- 使用递增 request ID；
- 支持 transferable buffer；
- 支持 AbortSignal；
- 支持请求超时；
- fatal error 后终止 Worker；
- 终止时拒绝全部 pending promise；
- 处理 `error` 和 `messageerror`；
- 防止已销毁 session 被再次使用；
- 对 render response 检查 revision，丢弃过期结果。

Worker 不得主动访问网络。所有 WASM 和资源 URL 由宿主显式传入。

## 16. 公共 API 规范

### 16.1 门面 API

```ts
export function inspectIllustrator(
  input: IllustratorInput,
  options?: InspectOptions
): Promise<IllustratorContainerInspection>

export function createIllustratorEngine(
  options?: IllustratorEngineOptions
): Promise<IllustratorEngine>
```

### 16.2 Engine 和 Document Session

```ts
interface IllustratorEngine {
  open(input: IllustratorInput, options?: OpenOptions): Promise<IllustratorDocument>
  dispose(): void
}

interface IllustratorDocument {
  getSummary(): Promise<IllustratorDocumentSummary>
  getArtboards(): Promise<readonly IllustratorArtboard[]>
  getLayerTree(): Promise<readonly IllustratorLayer[]>
  getSupportReport(): Promise<IllustratorSupportReport>
  getDiagnostics(): Promise<readonly IllustratorDiagnostic[]>
  render(target: HTMLCanvasElement, options: RenderOptions): Promise<RenderResult>
  renderToBitmap(options: RenderOptions): Promise<ImageBitmap>
  exportSvg(options: SvgExportOptions): Promise<string>
  exportSceneJson(options?: SceneExportOptions): Promise<IllustratorSceneDocument>
  dispose(): void
}
```

### 16.3 低级 API

必须公开并稳定支持：

```ts
inspectIllustratorContainer()
decodeIllustratorPrivateSource()
lexIllustratorSource()
parseIllustratorSource()
lowerIllustratorAst()
renderIllustratorScene()
```

低级 API 必须与高级 API 使用同一解析实现，不得出现两套格式规则。

### 16.4 输入类型

```ts
type IllustratorInput = ArrayBuffer | Uint8Array | Blob
```

不得要求调用方把浏览器 `File` 转为 base64。

### 16.5 API 稳定性

- 所有导出类型必须生成 `.d.ts`；
- Scene IR 包含独立 `schemaVersion`；
- npm SemVer 与 IR schema 版本分离；
- 错误码和诊断码一旦公开不得无迁移说明地复用；
- 不得把内部解析器类型直接暴露为稳定 API；
- 所有异步 API 必须说明取消、超时和资源释放行为；
- 所有 option 必须有默认值、范围和非法值处理规则。

## 17. 诊断和 fidelity 规范

### 17.1 诊断结构

```ts
interface IllustratorDiagnostic {
  code: string
  severity: 'info' | 'warning' | 'error'
  stage: 'container' | 'decode' | 'lex' | 'parse' | 'lower' | 'render' | 'resource'
  message: string
  sourceSpan?: SourceSpan
  nodeId?: string
  feature?: string
  recovery?: string
}
```

### 17.2 fidelity 等级

```ts
type IllustratorFidelity =
  | 'exact'
  | 'high'
  | 'partial'
  | 'structure-only'
  | 'unsupported'
```

fidelity 必须由可计算规则产生，不能由调用方随意标记。

以下情况必须降低 fidelity：

- 未知可见操作符；
- 缺失字体；
- 缺失链接资源；
- 未加载 ICC profile；
- 使用颜色近似；
- 使用 alternate/fallback appearance；
- Live Effect 未实现；
- 插件对象未展开；
- 透明、mask、blend 被降级；
- 渲染器超过预算而简化。

## 18. 字体、资源和色彩管理

### 18.1 字体解析器

宿主必须可注入字体解析器：

```ts
interface IllustratorFontResolver {
  resolve(
    reference: IllustratorFontReference,
    signal: AbortSignal
  ): Promise<ArrayBuffer | FontFace | null>
}
```

解析器不得：

- 从公网下载字体；
- 假设 PostScript name 等于 CSS family；
- 在字体替换后仍报告 exact；
- 把嵌入子集字体用于未授权的完整字体导出。

### 18.2 外链资源解析器

```ts
interface IllustratorResourceResolver {
  resolve(
    reference: IllustratorResourceReference,
    signal: AbortSignal
  ): Promise<ArrayBuffer | null>
}
```

默认实现只能解析文件内嵌资源。任何宿主提供的路径、File System Access 或业务资源映射必须显式配置。

### 18.3 色彩

必须区分：

- 快速屏幕预览；
- ICC 管理预览；
- CMYK/Spot 软打样；
- overprint preview。

ICC/颜色 WASM 必须按需加载。缺少 profile 时必须记录使用的 fallback 色彩规则。

## 19. 性能和内存要求

### 19.1 基准场景

性能报告必须至少包含：

- 小型：不超过 5 MiB、10,000 节点；
- 中型：不超过 25 MiB、100,000 节点；
- 大型：不超过 100 MiB、500,000 节点；
- 压缩比异常但合法的 private source；
- 多画板、多图层、多图片、复杂文字和复杂路径场景。

基准结果必须记录设备、CPU、内存、操作系统、浏览器、DPR、构建模式和测试文件 SHA-256。

### 19.2 性能门禁

在项目声明的桌面基准环境中：

- 10 MiB、50,000 节点文档的 P95 完整解析时间不超过 1.5 秒；
- 同一文档首画板 P95 可见时间不超过 2.5 秒；
- 解析不得在主线程产生超过 50ms 的长任务；
- 10,000 节点下缩放和拖动目标为 60fps；
- 100,000 节点启用分块和缓存后目标不低于 30fps；
- 取消后 Worker 应在可观测的短时间内终止，不继续消耗 CPU；
- dispose 后不得保留文档、图片、canvas、ImageBitmap 或 Worker 引用；
- 峰值内存必须受解析预算和渲染缓存预算约束；
- 不得为追求速度取消边界检查或未知语法保存。

### 19.3 包体积门禁

- Core 必须支持 tree-shaking；
- Worker、zstd、颜色管理和大型后端必须懒加载；
- 门面包不得把全部 WASM 内联进首个 JS；
- 构建报告必须分别记录 core、worker、renderer、codec 和 WASM 的 raw/gzip/brotli 大小；
- 包体积增长必须附带功能和 benchmark 依据。

## 20. 安全要求

所有输入均视为恶意输入。

必须防护：

- PDF 对象和引用环；
- xref/object stream 异常；
- duplicate object 和 generation mismatch；
- 伪造 Length 和 endstream；
- filter chain 炸弹；
- deflate/zstd 解压炸弹；
- 超深 array/dictionary/procedure；
- 超长 string/name/comment；
- 超大 token/operator 数；
- 超大 path point 数；
- 无限或异常图层/组嵌套；
- 超大 raster dimension 和 pixel count；
- ICC、字体和图片中的畸形数据；
- SVG 注入；
- 外链 URL、文件路径和网络读取；
- Worker 无响应；
- Abort 后继续处理；
- 缓存无法释放。

必须提供：

- 单元级畸形 fixture；
- mutation fuzz；
- 长时间连续 fuzz；
- parser differential test；
- 内存峰值测试；
- Worker timeout/cancel 测试；
- SVG 安全测试；
- 无网络运行测试；
- 依赖许可证和供应链检查。

## 21. 语料库要求

### 21.1 语料类型

必须维护：

- 每个版本族的最小容器 fixture；
- 每个操作符的单特性 fixture；
- 多特性交叉 fixture；
- native-only 和 PDF-compatible 双保存 fixture；
- 文本、字体、图片、颜色、透明和复杂效果 fixture；
- 大文件和高复杂度 fixture；
- 损坏、截断、循环、重复、炸弹和未知版本 fixture；
- 经授权的真实项目 corpus。

### 21.2 Corpus manifest

每个文件必须记录：

- SHA-256；
- 文件来源；
- 许可证和是否允许公开；
- Illustrator 精确版本；
- 操作系统；
- 保存选项；
- PDF compatibility 状态；
- 字体清单；
- ICC profile；
- 外链资源状态；
- 已覆盖特性；
- 预期 diagnostics；
- Oracle 版本。

客户文件不得因为“已脱敏”就自动进入公开仓库。必须有明确授权和可审计来源。

## 22. Illustrator Oracle 要求

必须建立开发期 Oracle，用真实 Illustrator 生成结构真值和视觉真值。

Oracle 应输出：

```text
fixture/
├── source.ai
├── manifest.json
├── expected.structure.json
├── expected.artboard-1@1x.png
├── expected.artboard-1@2x.png
├── expected.artboard-1.pdf
└── resources/
```

结构真值至少包含：

- 文档版本和颜色模式；
- 画板名称、UUID、矩形和 bleed；
- 图层树和状态；
- 节点类型和父子关系；
- 路径节点、控制点和闭合状态；
- transform；
- fill/stroke/appearance；
- 文字 story/frame/run/font；
- 图片资源和 transform；
- 渐变、图案、符号和画笔引用；
- opacity/blend/mask；
- 插件对象和 fallback 信息。

Oracle 只用于开发、测试和验收，不得把 Adobe SDK、Illustrator 二进制或受限接口分发到 npm 包和浏览器资产。

## 23. 测试体系

### 23.1 单元测试

覆盖：

- 容器引用解析；
- 每种压缩和 filter；
- lexer token；
- 每个操作符 schema；
- graphics state；
- hierarchy；
- path geometry；
- text resource；
- color conversion；
- diagnostics；
- limits；
- dispose/cancel。

### 23.2 Golden 测试

每个 fixture 必须至少产生：

- inspection golden；
- decode fingerprint；
- AST summary；
- Scene IR summary；
- diagnostics golden；
- SVG 或 raster reference。

Golden 更新必须可审阅，禁止测试自动覆盖 expected 文件后直接通过。

### 23.3 结构差异测试

解析结果必须与 Illustrator Oracle 比较：

- 节点数；
- 类型；
- 顺序；
- 层级；
- 坐标；
- transform；
- style；
- resource reference；
- text run；
- unsupported inventory。

### 23.4 视觉差异测试

视觉 diff 必须：

- 使用固定字体和 ICC 环境；
- 固定画板、DPI、DPR、背景和抗锯齿设置；
- 排除不稳定的 metadata；
- 同时报告 pixel mismatch、SSIM 和差异热图；
- 对抗锯齿边缘使用不超过 1px 的容差带；
- 对透明、blend、文字和颜色分别统计；
- 不允许仅以“生成了非空图片”作为通过条件。

### 23.5 浏览器测试

必须覆盖：

- Chromium；
- Firefox；
- WebKit/Safari；
- Worker 加载；
- WASM MIME；
- asset URL 重写；
- CSP；
- Shadow DOM；
- 移动视口；
- DPR；
- 打印/导出；
- no-network/offline；
- cancel/destroy；
- 多文件连续打开；
- 多 viewer 同页隔离。

## 24. 验收标准

### 24.1 容器验收

- 目标版本族的真实 fixture 全部可被正确分类；
- 普通改名 PDF 被拒绝为 Illustrator 原生文件；
- warning-placeholder PDF 能进入 private source 检查而不是直接结束；
- 所有 private blocks 按正确顺序提取；
- 合法 xref/object stream/incremental update 可读取；
- 重复、缺失、循环和 generation mismatch 可稳定拒绝；
- deflate/zstd 输出与 Oracle fingerprint 完全一致；
- 任何超限输入都以稳定错误码终止。

### 24.2 Lossless AST 验收

- token 和 statement 重组后的原始 source 与输入完全一致；
- 所有有效语句被分类为 known 或 unknown；
- 不存在无记录的丢弃语句；
- 每个 AST 节点具有准确 source span；
- 未知语法可以在 Scene IR 不支持时继续保存在 AST；
- 换行、注释、字符串转义和二进制资源可稳定往返。

### 24.3 Scene IR 验收

- 支持矩阵内所有对象都映射到明确节点类型；
- 图层、组、compound、clip 顺序和父子关系与 Oracle 一致；
- 画板保持共享画布坐标，不复制场景；
- 几何坐标和控制点误差不超过 `0.01pt`；
- transform composition 与 Oracle 一致；
- style、资源和颜色来源可追踪；
- 所有降级节点具备 fidelity 和 diagnostic；
- Scene IR JSON 通过版本化 schema 校验。

### 24.4 视觉验收

- 基础矢量在 1px 抗锯齿容差带之外的像素差不超过 0.5%；
- 复杂外观在固定字体和 ICC 环境中的 SSIM 不低于 0.98；
- 图层显隐后的画面与 Illustrator 对应状态一致；
- 画板裁切、bleed、共享画布和大画布比例正确；
- 文字、图片、渐变、透明、blend、mask 分别有专项 diff；
- 缺失资源或未支持效果不得生成无诊断的错误画面；
- native、fallback、alternate 和 PDF surface 的来源在 UI/API 中可区分。

### 24.5 性能验收

- 达到第 19 节性能门禁；
- 解析完全在 Worker 中执行；
- 主线程不承担大规模 token、AST 或 Scene IR 构建；
- 大文档不会因为一次性复制多个完整 buffer 造成无界峰值；
- 缓存达到上限后按 LRU 或等价策略回收；
- 多次 open/dispose 后内存回到稳定范围；
- AbortSignal、超时和 destroy 能终止实际计算。

### 24.6 安全验收

- 不存在任意 PostScript 执行路径；
- 不存在 eval、脚本或 SVG 注入路径；
- fuzz corpus 不产生崩溃、无限循环或无界内存；
- 恶意压缩、PDF 引用和嵌入资源均受限制；
- 运行时没有未授权网络请求；
- CSP 环境下 Worker/WASM 有明确部署说明；
- 所有 fatal error 都释放 Worker、WASM、ImageBitmap 和 canvas 缓存。

### 24.7 API 和包验收

- 门面 API、低级 API 和类型声明完整；
- API 文档中的示例可冷安装运行；
- 浏览器、Vite、原生 ESM 和 Node CLI 均有 smoke test；
- package exports 不暴露内部构建路径；
- Worker/WASM URL 可由宿主覆盖；
- npm tarball 包含所有必要 runtime 和许可证；
- 包可离线安装并离线运行；
- 版本、IR schema、diagnostic code 和支持矩阵一致。

### 24.8 支持声明验收

只有同时满足以下条件的特性才能标记为 `supported/high`：

- 有真实 Illustrator fixture；
- 有结构 Oracle；
- 有视觉 Oracle；
- 单元、结构、视觉和浏览器测试通过；
- 性能和安全预算通过；
- 文档已说明版本范围和限制。

只有解析出名称、数量、缩略图或 bounding box 的特性必须标记为 `partial` 或 `structure-only`。

## 25. File Viewer 接入要求

独立解析仓库不得依赖 `@file-viewer/core`。File Viewer 适配器位于 File Viewer 仓库或独立 integration package 中，只调用稳定公共 API。

建议 File Viewer 提供：

```ts
interface FileViewerDesignOptions {
  illustratorMode?: 'auto' | 'pdf' | 'native'
  illustratorWorkerUrl?: string
  illustratorZstdWasmUrl?: string
  illustratorColorWasmUrl?: string
  illustratorLimits?: Partial<IllustratorLimits>
  illustratorFontResolver?: IllustratorFontResolver
  illustratorResourceResolver?: IllustratorResourceResolver
}
```

模式行为：

- `pdf`：只使用 PDF-compatible 表面；
- `native`：只使用 PGF 原生场景；
- `auto`：PDF 表面用于默认高还原显示，PGF 提供原生结构和 native-only fallback。

接入必须满足：

- 动态 import；
- Worker/WASM 按需加载；
- 轻量组件不自动携带全部资产；
- full/preset 资产复制完整；
- AbortSignal 与 viewer 生命周期绑定；
- 图层树、画板和 fidelity 显示统一；
- PDF/PGF 切换不会泄漏旧 session；
- 未安装对应能力时提示需要启用 renderer/preset；
- 不因 PDF 渲染成功而隐藏 PGF 诊断；
- 支持矩阵只在独立 SDK 正式门禁通过后更新。

## 26. 发布门禁

每次正式发布必须生成并审阅：

- 版本化支持矩阵；
- 容器版本矩阵；
- 操作符覆盖报告；
- unknown operator 报告；
- corpus manifest 和 SHA-256；
- 结构 diff 报告；
- 视觉 diff 报告；
- 性能和内存报告；
- fuzz 和安全报告；
- 三浏览器测试报告；
- npm tarball 内容和冷安装报告；
- Worker/WASM 资产和许可证清单；
- API diff 和迁移说明；
- File Viewer 集成兼容性结果。

存在以下任一情况时不得发布为稳定版：

- 支持矩阵内存在静默丢弃；
- unknown 可见操作符未降低 fidelity；
- 测试只覆盖合成 fixture，没有真实 Illustrator 文件；
- 视觉验收只检查非空像素；
- Worker 超时、Abort 或 dispose 未真正终止计算；
- 运行时依赖公网资源；
- npm 包缺失 Worker、WASM、字体/ICC 许可或第三方声明；
- API 使用内部路径才能完成标准接入；
- File Viewer 口径早于独立解析器的真实验收状态。

## 27. 许可证和来源边界

- 原创代码默认采用项目确认的主许可证；
- 如果采用 MPL-2.0 源码，相关文件必须保留 MPL-2.0，并在包和源码中明确声明；
- 不得把 GPL 代码复制进不兼容的发布包；
- 不得提交 Adobe SDK、Illustrator 二进制或受限头文件；
- 未公开的现代操作符应通过可审计的 clean-room 记录、独立 fixture 和行为 Oracle 研究；
- 所有第三方代码、WASM、字体、ICC 和测试样本必须进入许可证清单；
- 客户文件、商业字体和受限资源不得进入公开 npm tarball 或公开 Git 历史；
- 项目名称和文档必须说明与 Adobe 无隶属或背书关系。

## 28. 完成定义

一个版本只有在以下条件全部满足时才算完成：

1. 代码、类型、Worker、WASM 和运行时资产齐全。
2. 对应容器和特性矩阵有真实语料证明。
3. Lossless AST 不丢失任何未记录语句。
4. Scene IR 通过结构 Oracle 验收。
5. 渲染通过视觉 Oracle 验收。
6. 未支持内容具有精确诊断和 fidelity 降级。
7. 性能、内存、Abort、dispose 和缓存门禁通过。
8. 恶意输入、fuzz、无网络和三浏览器门禁通过。
9. API、文档、示例、npm tarball 和许可证完整。
10. File Viewer 只通过公共 API 完成接入验证。

样例可打开、fixture verifier 通过、生成非空画面、PDF surface 成功或本地构建成功，均不能单独作为“PGF 完整解析器已完成”的证据。

## 29. 参考资料

- Adobe Illustrator 保存说明：<https://helpx.adobe.com/illustrator/using/saving-artwork.html>
- Adobe Illustrator 归档 PGF/PDF 说明：<https://helpx.adobe.com/archive/illustrator/illustrator-cs4-troubleshooting.pdf>
- Inkscape AI 原生解析实验：<https://gitlab.com/inkscape/extras/extension-ai>
- Illustrator 原生 TypeScript AST 实现参考：<https://github.com/jeremybanka/create-font/tree/main/packages/create-design/ai>

