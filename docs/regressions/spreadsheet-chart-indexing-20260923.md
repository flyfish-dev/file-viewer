# 表格图表索引、缺项与轴字号

## 修复范围

所属包为 `@file-viewer/renderer-spreadsheet`。解析层保留 `ptCount` 和 `pt.idx` 的逻辑位置，不再排序后压缩稀疏缓存；数字缺项与错误值不再通过 `Number('')` 变成零或被过滤导致后续点前移。`gap`、`zero`、`span` 分别处理空单元格；非数值错误保留为断点，不因为允许跨空白连接而被忽略。缺项用 `NaN` 携带，通过真实 Worker 的结构化克隆保持位置，公共 `values: number[]` 类型不变。

解析和 SVG 两级降采样都保留必要的断点，并维持索引顺序和有界点数；多系列使用完整的分类范围。面积图按连续片段分别封闭，单一有效数值的饼图／环图用双圆弧绘制完整圆形，不再生成起终点重合的退化圆弧。非法缓存索引、异常点数和超出工作表边界的公式范围不会无限扩张。

读取类别轴／数值轴明确指定的 DrawingML 字号，并贯穿 `SheetJsModel` 到实际绘制层。只补偿 SVG 固定 viewBox 到图表自身尺寸的比例，不抵消用户缩放；未声明字号的图表保留原先默认行为。没有新增运行时依赖，也没有修改版本号。

## 原样结论

C013：13,701 字节，SHA-256 `7ac5548a55dbeb6a97025a3af3d84d9752baea8f2745630907b604e53c0ee863`。

原稿的两组分类文字和 10／58 两个数值在本轮修改前已能解析，不能记为“原稿标签丢失已修复”。本轮确认的原样缺陷是：明确的 9pt 轴字号被固定 SVG 字号再次缩小。测试独立读取原 XML 的标签、数值及字号，要求类别轴、数值轴的实际屏幕字号在 50%／100%／200% 缩放下分别约为 6／12／24 CSS 像素；同时核对柱高比例、标签范围及清理。

320／1000 CSS 像素宽度、DPR 1／2 的矩阵用于检查原有视口与缩放路径。图表继续使用 SVG 文本，不把文字烘焙为低分辨率截图。此结论不扩大到全部字体、刻度算法、颜色、组合图表、透视图表、雷达／散点坐标以及整表逐像素一致性。

## 验证与部署

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/renderer-spreadsheet build
node packages/renderers/spreadsheet/scripts/verify-chart-indexing.mjs
```

默认验证使用本地 HTTP 服务、真实模块 Worker 查看器和真实经典 Worker，33 项检查；不访问公网。`SPREADSHEET_CHART_ORIGINAL` 可指定原文件，先校验 SHA-256；未提供时使用生成式回归样本。`SPREADSHEET_CHART_WORKER_FILE` 可指定待部署 Worker。测试报告使用编号和数值，不保存原文件正文。

对于禁止回环地址导航的本地环境，可显式设置 `SPREADSHEET_CHART_MEMORY_TEST=1`。该模式只执行内存页面和经典 Worker，共 29 项；报告将 `moduleWorkerUiSkipped` 标为 `true`，不能当作默认 33 项全通过。完整冻结锁安装、模块 Worker 实际查看器和远端 CI 的状态必须依据新生成报告，不沿用历史成功记录。

重新构建后需同步 `dist/worker/sheet.worker.js` 到部署的 `vendor/xlsx/sheet.worker.js`，刷新旧 Worker 缓存。没有只更新主线程而保留旧解析 Worker 的兼容承诺。回退时应同时回退五个源码文件及静态 Worker，不修改原始文件。

## 结项边界

本记录只对应 C013 的轴字号和同一路径的稀疏缓存／缺项／完整圆形通用问题。发布状态与已执行项目见同目录 `evidence/spreadsheet-chart-indexing-20260923/verification.json`。未执行的检查不得视作通过，W03、S01 的其他条目以及整个资料包不能因此自动结项。
