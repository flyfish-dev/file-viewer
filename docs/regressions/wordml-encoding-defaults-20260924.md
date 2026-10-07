# Word 2003 XML 编码与文档默认字体

## 两项根因

1. 字节解码只识别 UTF-16 字节序，其余一律按 UTF-8 读取，忽略 XML 开头声明的 GBK、Windows-1252、Shift_JIS 等编码。现在先识别 BOM/UTF-16 特征，再读取编码声明并严格解码；无声明保持 UTF-8。无效字节、未知编码以及 BOM 与声明冲突明确失败，不以替换字符伪装正确正文。
2. WordML 的 `fonts/defaultFonts` 被原样转换成 OOXML 字体表中的无效默认项，没有进入文档默认运行属性。现在映射到 `styles/docDefaults/rPrDefault/rPr/rFonts`，即使原稿没有 styles 节点也建立正确的样式部件和关系；命名样式与直接运行属性仍具有更高优先级。字体定义和其他设置继续按原有路径保留。

没有修改 OLE、OOXML 或普通文本的路由，不引入运行时依赖；原有 DTD/实体拒绝和本地嵌入图片关系保护保持不变。修复不依赖文件名、正文或原件哈希。

## 验证

新增 14 项单元测试，覆盖多代码页、UTF-16 双字节序和 BOM、UTF-8 别名、编码冲突/无效字节、伪声明、无 styles 部件、字体属性别名及默认/样式/直接格式的层级。旧实现的编码丢失与缺少默认样式部件可分别复现。

真实 Word renderer 的浏览器检查默认 15 项，提供 C070 时为 19 项，覆盖 DPR 1/2、字体继承与往返缩放、反复打开和卸载。C070 原件 SHA-256 为 `7b9380a4c80eb4c17b8f3c7d2b69b4c012d2c2ff1e1d58125ee7cb8bfc07e35d`；检查新字体默认部件、页脚关系以及原始正文。C070 使用 UTF-8 且主要样式已有显式字体，不能将它称为“多代码页乱码原件”；乱码用同一转换路径上的独立编码例子复现。原稿正文可解析的既有行为也不计为新增修复。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/doc build
pnpm --filter @file-viewer/renderer-word build
WORDML_REVIEW_ORIGINAL=/path/to/C070.doc \
  node packages/renderers/word/scripts/verify-wordml-encoding-defaults.mjs
```

测试只读取本地文件，报告仅保留数量、哈希和生成式字体名称。使用 `WORDML_REVIEW_SKIP_SCREENSHOT=1` 时必须视为无截图数值检查；远端验收不使用该开关。结果见 `evidence/wordml-encoding-defaults-20260924/`。本批同时复测上一批 C030 显式制表位，未修改已声明的引擎补丁。

## 范围

收口 WordML 编码声明及文档字体默认值的转换缺陷。不宣称全部旧 Word XML 功能、列表、VML 图形、页眉、页脚动态域或完整分页保真通过。字体名称得到正确继承不等于浏览器实际安装了该字体，也不代表与桌面软件像素等价。资料包其余专项状态保持开放。
