# @file-viewer/renderer-spreadsheet

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/spreadsheet/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/spreadsheet/README.zh-CN.md)

Flyfish File Viewer 的独立表格 renderer 包。它基于 `styled-exceljs` 与 `e-virt-table` 提供 XLSX、XLSM、XLSB、XLS、CSV、TSV、ODS、FODS、Numbers 等表格文件的浏览器端预览，并通过 File Viewer 统一的 asset manifest 解析可选 Worker 路径，适合企业内网和离线部署。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet'

const options = {
  rendererMode: 'replace',
  renderers: spreadsheetRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { pdfRenderer } from '@file-viewer/renderer-pdf'
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet'

const options = {
  rendererMode: 'replace',
  renderers: [pdfRenderer, spreadsheetRenderer],
}
```

## 能力边界

- 支持 `.xlsx`、`.xltx`、`.xlsm`、`.xlsb`、`.xls`、`.xlt`、`.xltm`、`.csv`、`.tsv`、`.ods`、`.fods`、`.numbers`。
- CSV / TSV 默认自动识别 UTF-8（含 BOM）与 GBK / GB18030；遇到来源编码已知的文件时，可通过 `options.spreadsheet.textEncoding` 固定为 `utf-8`、`gbk` 或 `gb18030`。
- 默认 `options.spreadsheet.worker: 'auto'`：小文件走主线程兼容路径，大文件达到 `options.spreadsheet.workerAutoThreshold`（默认 1MB）后自动尝试静态 Worker。
- 可以通过 `options.spreadsheet.worker: true` 强制启用静态 Worker，通过 `worker: false` 关闭自动启用；静态路径特殊时配置 `options.spreadsheet.workerUrl`。
- 支持多 sheet、横向滚动标签栏、合并单元格、列宽/行高、边框、填充、对齐、文本颜色、Office 365 / WPS 单元格内嵌图片、workbook drawing 图片、图片双击大图预览、统一缩放 provider 和可选表头拖拽调整列宽。
- XLSX drawing 中的 TIFF 图片会按需加载 MIT 许可的 UTIF.js，在浏览器内转换为 PNG；普通表格不会加载 TIFF 解码器。
- 表格使用虚拟渲染，适合交互预览；完整打印按钮通常由上层能力判断隐藏，避免只打印当前视口。
- XLSX 保留文件保存的默认列宽、显式列宽和以磅记录的行高；CSV/TSV 继续按内容调整列宽，大文本解析避免重复创建完整 UTF-8 字节数组。
- 列宽单位以工作簿 Normal 样式为基准。宋体、新宋体的数字宽度先从磅转换为像素，再进行取整；尚未测定的自定义字体沿用标准回退，实际尺寸可能受字体影响。

## 小内容 Excel 填满视口

`options.spreadsheet.fillViewport` 默认 `true`，适用于 Excel、CSV / TSV 等表格格式。按工作表默认行高、列宽补充空白列标题（A / B / …）、行号和网格，让小表或空 Sheet 填满当前预览区域。容器 resize、缩放和切 Sheet 时重新计算，补充部分沿用虚拟画布，不生成整张 Excel 空表，不拉伸已有单元格，也不改变工作簿数据。设为 `false` 可只显示已用区域。

```ts
const options = {
  rendererMode: 'replace',
  renderers: spreadsheetRenderer,
  spreadsheet: { fillViewport: false }, // 可选：只显示已用区域。
}
```

补充部分只用于显示，不改变工作簿数据、used-range、原文件下载/导出、搜索结果或内容统计。

## 离线资产

默认可选 Worker 路径为：

- `vendor/xlsx/sheet.worker.js`

私有化部署时可以通过 `options.spreadsheet.workerUrl` 覆盖。官方 Vite 插件和 Demo worker 构建脚本会从本包的 worker 入口生成该文件。

## 迁移说明

表格预览已经从 `@file-viewer/core` 中彻底移出，core 只保留资产 manifest、类型和兼容错误提示，不再默认安装 `styled-exceljs`、`e-virt-table` 或 `tinycolor2`。完整表格能力请安装本包并传入 `renderers`，或直接使用 `@file-viewer/preset-all`。

## 未保存计算结果的公式

优先保留文件已保存的公式结果，包括真实的零值。导出器未保存计算结果时，预览可在离线、受限的运算预算内补算本表/跨表引用、区域、算术/比较，以及 `IF`、`ROUND`、`ROW`、`SUM`，并保留单元格数字格式；主线程和 Worker 使用同一逻辑。

这不是完整的 Excel 计算引擎。循环引用、外部引用、不支持或超出预算的公式，会直接显示原始 `=公式` 文本，不再伪装成零。不会执行 JavaScript 或请求远程公式资源。
