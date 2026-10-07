# PPTX 文本区域与字号保持

## 修复

文本框现在按逐属性继承的 `lIns/rIns/tIns/bIns` 缩进计算内部段落可用宽度，显式零值不再落回默认值；外部图形大小不变。恢复自然段落高度，禁止 flex 将多行段落压缩成失真的显示盒，并保留明确的 `wrap=none`。

文本缩放遵守原稿选择：`noAutofit` 和 `spAutoFit` 不再进入强制缩字过程；`normAutofit` 仍可适配，并保留小数 `fontScale`。`baseline=0` 不再误作上下标，字距调整阈值不再从字号中扣除。表格及没有该元数据的旧内容保持原有适配路径。

不改写原件，不按文件名、正文或哈希作渲染特判。没有增加依赖、改变公共 API、版本或锁文件。构建后必须同步演示站和独立部署中的 PPTX Worker。

## 原样与防回归

C049 包含九段显式 9pt 正文运行。旧实现的实际字号约为 10.83 CSS 像素，修复后为 12 CSS 像素。C050 两个文字区域的内边距与原始 XML 独立核对，段落宽度等于外部框宽扣除左右内边距。原稿文字只用于测试中的对应关系，不写入报告。

`verify-text-body.mjs` 默认 16 项，提供两份原样时为 20 项，覆盖 DPR 1/2、真实经典 Worker、清理器、后处理和 `PptxViewer.open`。生成式检查覆盖默认/零值/继承缩进、小数缩字比例、零基线、不换行、反复布局及卸载。既有 C050 编号/段距、绘图和图表专项继续复测。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/pptx build
PPTX_TEXT_ORIGINALS=/path/to/originals node packages/renderers/pptx/scripts/verify-text-body.mjs
```

原样目录包含 C049.pptx、C050.pptx，读取前校验 SHA-256。截图仅保存独立生成的样本；结果和环境信息见 `evidence/pptx-text-body-20260924/`。

## 范围

结清上述原样的内边距和无意缩字，不将结果扩大为全部字体或整页像素相同。`spAutoFit` 保留原始字号，但不在此批自动改写形状尺寸；负内边距、全部竖排和特殊字体排版仍需独立验证。SmartArt 文本分区另行处理。
