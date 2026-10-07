# Word VML 锚点与文本框物理字号

## 两项根因与修复

1. 锚定 VML SVG 保留了 `mso-position-*-relative:text` 和原稿的 margin 偏移，但 CSS `left/top` 仍是 auto，实际位置依赖浏览器的静态位置。段落缩进、前置文字及包含块的差异会额外叠加到原稿坐标。现在在 Word renderer 的可测量布局阶段分别计算文本列和锚定段落原点，保留作者偏移、形状路径及堆叠层级；未定位的段落也按真实包含块换算。缩放、重布局从原始 inset 重算，不累计修正。
2. VML 外层 SVG 使用点值作为 user units，而 `foreignObject` 内的 HTML 字号是 CSS 物理长度；外层点到像素的倍率再次放大字体，可能把文本挤到视口之外。现在展开文本 viewport 并施加逆倍率，保持外部图形框和原始字体声明，消除第二次缩放。原稿文本、图片和文件字节均不改写。

只处理已有锚点元数据和实际几何，不按文件名、正文或哈希特判。无公共 API、运行时依赖、版本、锁文件、DOCX 包补丁或静态 Worker 变更。原有 DrawingML 混合锚点逻辑继续保留。

## 原样及防回归

C037 原件为 299,642 字节，SHA-256 `d5a60516f06b7f116c629fdbc834b81ae8a0d7ac70e64006483d2a4c44ff89ab`。目标署名文本框的水平偏移为 82.5023 pt；修改前错误叠加了 232.5 pt 段落缩进，约多移 310 个未缩放 CSS 像素。修复后按独立读取的 XML 数值核对水平/垂直原点及图形尺寸；9 个文本框字符完整落在原视口内。6,034 个正文字符哈希及 5 张图片解码保持完整，往返缩放页数不变；本环境的页数不作为桌面排版基准。

`verify-vml-text-layout.mjs` 默认 29 项，指定 C037 时 57 项，覆盖 DPR 1/2、100%/50%/200%/88%/100% 缩放、生成式页眉与负偏移、实际经典 Worker 的 parsed 返回、导出 HTML 的物理字体单位、原文哈希及卸载。坐标允许浏览器子像素取整误差，但要求每项小于 0.4 个未缩放 CSS 像素。旧实现对应定位和字体倍率断言均失败；多档失败不计作多个独立缺陷。

另有 16 个单元测试覆盖重复布局、隐藏容器、静态段落、多栏、边框/内边距、非零文本 viewport inset、旋转、SVG 克隆、无效/非物理坐标与不支持布局的保护。Word 包包含此前测试共 63 项；C030 制表位、C070 WordML、DOCX 引擎与旧容器的既有专项继续复测。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/doc build
pnpm --filter @file-viewer/renderer-word build
WORD_VML_ORIGINAL=/path/to/C037.docx \
  node packages/renderers/word/scripts/verify-vml-text-layout.mjs
```

测试只读本地原件，使用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 可选择已有 Chromium；`WORD_VML_OUTPUT` 可指定证据输出目录。报告仅保留中性编号、哈希、数量及几何，截图只使用独立生成的文档。远端安装与运行证据见 `evidence/word-vml-text-20260924/verification.json`。

## 结项边界

本批结清 C037 已复现的文本相对锚点和文本框二次字号缩放问题；附带线条的坐标属于既有行为回归，不据此结清整份长文档、所有印章或 W02 全部版式。百分比/字符/行锚点、RTL/竖排原点、表格单元格定位策略、带内部组变换的文本框以及原稿所有跨页表格仍按原路径或剩余清单验收。印章图像位置与可见性不等同于签名认证；导出 HTML 检查不代替真实打印驱动。
