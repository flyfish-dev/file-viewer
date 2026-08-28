---
description: 选择 standard、preset、自定义或 Full 安装边界，完整保留既有 Full 包契约，并让 DICOM、数字签名等专业能力保持显式按需安装。
---

# 模块化 Profile 与 Full 兼容边界

<div class="doc-kicker">选择安装边界，不改变既有用户行为</div>

<p class="doc-lead">
File Viewer 同时保留轻量、preset、自定义和 Full 接入路径。`standard` 是新项目推荐的常用格式基线，但它不是 Full 的改名，也不会替换已经发布的 Full 包行为。
</p>

## Profile 是明确的安装契约

| Profile | 契约 | 适用场景 |
| --- | --- | --- |
| `standard` | 常用文档、PDF/OFD、现代 PPTX、表格、压缩包、邮件、文本、图片和媒体能力，并选择性部署资产 | 新项目需要广泛的日常格式，又不希望自动引入专业引擎 |
| `lite` | 文本、Markdown/代码、图片、音频和视频 | 主要预览轻量 Web 附件 |
| `office` | 既有 Office preset 及其兼容格式 | Office 项目依赖这份明确的 preset 契约 |
| `engineering` | 既有工程 preset | 产品需要 CAD、3D、EDA、Geo 等工程格式 |
| `all` | 已发布的 `@file-viewer/preset-all` 兼容矩阵 | 模块化项目已经明确依赖 `preset-all` |
| `full` | 对应的历史 `@file-viewer/*-full` 包，加上 CLI 目录中后续出现的显式可选能力 | 可以接受安装体积，并且产品明确需要目录内全部能力 |
| `custom` | 只安装项目配置选中的能力 | 必须精确控制依赖归属 |

Profile 决定安装哪些包和注册哪些 renderer。运行时仍按格式加载：即使选中重型 renderer，也只有打开匹配文件时才下载其运行代码。

## 冻结的 standard 基线

`@file-viewer/preset-standard` 包含这些包级能力：

- Word、DOCX、DOC、RTF 和 OpenDocument 文本；
- PDF 和 OFD；
- 通过 `@file-viewer/renderer-pptx` 提供现代 OpenXML PowerPoint；
- Excel、CSV/TSV、OpenDocument Spreadsheet 和 DBF；
- 压缩包和邮件；
- 文本、代码、Markdown、图片、音频和视频。

iWork、DICOM、数字签名容器、CAD、3D、EDA、Geo、Typst、绘图、WordPerfect、Hangul 和旧版二进制 PPT 等专业能力保持显式选择。这样即使全局格式目录持续增长，也不会让每个 standard 安装无限膨胀。

PPT 的拆分同样是安装边界。现代 `.pptx` 使用 `@file-viewer/renderer-pptx`；旧版 `.ppt` 使用 `@file-viewer/renderer-ppt` 及其独立授权运行时。兼容聚合包 `@file-viewer/renderer-presentation` 继续为既有用户提供两种能力。

## 现有 Full 包不会改变

已经发布的八个 `@file-viewer/*-full` 包继续保持：

- 原有 `preset-all` 能力矩阵；
- 公开 API 和默认接入行为；
- 运行时资源路径和 copy-assets 行为；
- 发布时已经属于该包的格式。

它们不会被静默切换到 `standard`。直接安装其中任意 Full 包，也不承诺以后每新增一个专业 renderer 都自动成为它的传递依赖。这条边界避免应用代码没有变化，下载量却随着格式目录无限增长。

CLI 的 `--profile full` 是一个显式便利契约：先保留对应兼容 Full 包，再加入当前 CLI 目录中的后续可选能力。CLI 会在最终确认前展示包体积和许可证信息。

```bash
npx file-viewer-cli plan --framework vue3 --profile full
npx file-viewer-cli create my-viewer --framework vue3 --profile full --yes
```

当前后续可选能力包括 DICOM 和数字签名容器。DICOM renderer 只负责一个本地 Part 10 文件，也支持该文件的多帧浏览；不包含序列组装、PACS/DICOMweb、MPR、分割、诊断解读或内嵌 OHIF 应用。签名 renderer 在本地有界检查 CMS/CAdES、时间戳、ASiC、证据记录、JWS 与公开 OpenPGP 材料；密码学结果与信任、政策、合格签名身份和法律效力分开呈现，不接收私钥，也不会自动获取远程密钥 URL。

## 只在需要时增加专业格式

可以在 `standard` 上增加扩展名或 capability id：

```bash
npx file-viewer-cli create viewer \
  --framework react \
  --profile standard \
  --formats dwg,typst \
  --yes
```

也可以逐步调整已有配置：

```bash
npx file-viewer-cli config add dwg --write
npx file-viewer-cli config add dicom --write
npx file-viewer-cli config add p7m --write
npx file-viewer-cli plan
npx file-viewer-cli install --yes
npx file-viewer-cli verify --json
```

生成的集成模块只导入固定 profile 和显式附加能力。`plan` 会列出精确包、资产归属、重型能力和许可证提示。部署策略应采用当前目录的实际输出，不要复制已经过时的历史包体数字。

## Capability 契约

Renderer 可以通过 `package.json#fileViewer.capabilityManifest` 发布 `file-viewer.capability.json`。Schema 记录：

- 负责的格式和 renderer id；
- 公开静态资产的 renderer id；
- SPDX 许可证和分发策略；
- `light`、`standard` 或 `heavy` 安装权重；
- 所属 preset/profile。

CLI 目录由这些声明和 `ecosystem/format-catalog.json` 生成。仓库门禁会拒绝格式漂移、未知资产 id、heavy 能力进入 `standard`，以及 profile 与包依赖不一致。

## 推荐迁移方式

1. 已有 Full 或 `preset-all` 项目保持当前包，除非产品本身有调整理由。
2. 新的常用格式项目选择 `standard`，再显式加入专业能力。
3. 安装前运行 `file-viewer plan`，并把 `file-viewer.config.json` 作为选型记录提交。
4. 部署已选能力的静态资源；既有 Full 项目需要完整兼容时，继续使用原 copy-assets 流程。
5. 在 CI 中运行 `file-viewer doctor` 和 `file-viewer verify`，让包、生成模块、回执和资产漂移在部署前失败。

脚手架、已有项目检测、资产兼容、私有源和离线 tgz 准备详见[完整 CLI 指南](/zh/guide/cli)。
