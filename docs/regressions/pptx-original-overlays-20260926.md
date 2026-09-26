# PPTX 原始日期位置与图片遮挡复核

本批是当前分支已有行为的原样验收，不包含新增产品代码修复。原稿只读，按 `test/remaining-originals/identities.json` 核对字节数和 SHA-256，不随记录发布。

## C015 日期位置

独立读取幻灯片中两个非空文字占位符的原始变换、内边距、直接文字属性和匹配布局的样式。对日期所在的三段内容，按布局默认字号、段后8pt及原段落150%行距计算各段位置；再与实际公开查看器中的段落几何逐项对照。原日期保留为原稿内容，不使用系统时间重算。文字框原稿允许内容溢出时，不强制裁剪到原框高度；可见字形必须仍在幻灯片内。

## C035 图片与正文

核对原图的嵌入字节、位置、宽高，保留原稿绘制顺序而不是为消除遮挡任意下移图片。独立比较正文实际字形的逐行矩形与图片矩形，确认没有相交；同时核对原始44pt标题、32pt正文和全部文字哈希。空母版占位符或原稿空白框越界不误判为可见正文丢失。

## 检查范围

29项实际浏览器检查覆盖两份原稿、DPR 1/2、100%→50%→200%→88%→100%往返缩放、未缩放坐标误差小于0.6 CSS像素、实际生产Worker、公开`PptxViewer.open`入口和销毁。静态Worker必须与当前构建逐字节一致；不使用解析器替身。验收报告只保留数值、文字哈希和原图哈希。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/pptx build
PPTX_ORIGINAL_CORPUS_DIR=/path/to/neutral-originals \
  node packages/renderers/pptx/scripts/verify-original-text-overlays.mjs
```

脚本使用既有PPTX工具依赖及Word包的jsdom，无新运行依赖、锁文件或公共API变更。未取得原文件时检查直接失败。最终结果见 `evidence/pptx-original-overlays-20260926/verification.json`。

本组结清这两份原稿已经报告的日期位置和图片遮字验证，不扩展为全部字体、复杂母版/渐变/掩码与目标宿主的整页像素等价；不把既有修复的再次验收计为新增缺陷。
