# PPTX 环形图、堆积图与图表元数据

## 确认并修复

C048 的 `doughnutChart` 未进入消息队列，预览保留空图表框；两个 `stacked` 柱图被按默认并列柱图绘制。现在解析器将环形图类型、圆环内径百分比、首扇区角度、分组方式、系列/数据点颜色以及图例信息传递给已有图表能力包。无需增加运行时依赖或按样例编号特判。

环图保持点序和独立内部 ID；相同标签、空标签、零值、错误值不会合并扇区。空的 XML 数值/标签节点不会输出 `[object Object]`。图例展示使用不可见测量占位字符兼容图表库的空文本测量边界，原始标签仍为空。完整圆形、零数据、负数取绝对面积的路径均有检查。

环宽用图表库实际生成的 SVG 半径换算，通过公开 `config` 接口调整，不读取库的私有状态；调整有重入保护，缩小容器后仍保持原始内外径比例。图片/文字与其他图表的外框位置不受影响。

柱形、面积、折线的堆积信息传给已有库，百分比堆积启用归一化；同名系列使用独立内部 ID，不再被图表库折叠。测试覆盖原始系列顺序、堆积边界和横向百分比比例。已有普通柱图、连接线、图表缓存回归保留。

## 验证

`packages/renderers/pptx/scripts/verify-chart-families.mjs` 使用真实 Chromium、实际图表库、生产 Worker 和公开 `PptxViewer.open`。DPR 1/2 下检查实际 SVG 圆弧、堆积矩形位置、颜色、280px 窄容器重排及销毁。默认25项；设置 `PPTX_CHART_ORIGINAL` 指向原样 C048 后共27项。原件 SHA-256 先固定，再用独立 XML DOM 核对五个图表的类型、数据和主题颜色：1个折线图、2个堆积柱图、1个环形图和1个普通柱图；圆环内径75%。旧实现会在缺图、分组等目标断言处失败。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/pptx build
PPTX_CHART_WORKER_FILE=packages/renderers/pptx/dist/worker/pptx.worker.js \
  node packages/renderers/pptx/scripts/verify-chart-families.mjs
```

`PPTX_CHART_OUTPUT` 可指定报告目录；`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 可指定已有 Chromium。脚本不自行下载原件，不修改原件。部署时同步本次构建的静态 PPTX Worker。

## 范围

结清 C048 的环图缺失、原始数据/填色/圆环比例和堆积类型子项。不是所有图表外观均已完全还原：多系列同心环、组合图及次坐标轴、图例的全部位置/覆盖模式、轴样式、数据标签、渐变和文字度量需分别验收；不能用本组结果宣布整个 P01 或资料包清零。本次没有 npm 发版。
