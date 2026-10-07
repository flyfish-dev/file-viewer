# PDF 隐藏容器首次适配与原样验收

## 已修复

隐藏或未挂载的容器宽高为零时，旧实现回退到窗口宽度，并把 `resize: initial` 适配标记为成功。弹窗随后显示时又忽略尺寸变化，造成首次比例错误。现在等待真实文档视口可测量，保留最后一次适配请求，在显示后执行；实际完成后仍遵守 initial/always 语义。手动缩放、重置和卸载不会被过期请求覆盖。

功能提交：`68b7d4ee`。没有新增运行时依赖、公共 API 或版本变化。测试工具补充 PDF 包自己的 esbuild 开发依赖和锁文件关联，直接使用仓库既有的 0.28.2 版本；不依赖扁平 node_modules 或根目录的未声明依赖。

## 真实验证

`node packages/renderers/pdf/scripts/verify-viewport-lifecycle.mjs`：远端 9 项 Chromium/真实 PDF Worker 检查通过；旧代码在“隐藏首次适配不应成功”的目标断言处失败，修复后通过。记录见 `evidence/pdf-viewport-20260923/`，运行编号 `35817304468`。

设置 `PDF_CORPUS_DIR` 指向包含中性名称 `C020.pdf`、`C021.pdf`、`C023.pdf`、`C026.pdf`、`C028.pdf`、`C047.pdf` 的本地目录，然后运行：

```bash
node packages/renderers/pdf/scripts/verify-original-pdfs.mjs
```

6 份原件在 SHA-256 校验后逐页检查，共 63 页、DPR 1/2 下 126 次页面核对，16 项检查通过。覆盖原始页面比例、Canvas 位图分辨率、内容滚动容器、C026 隐藏弹窗、真实 Worker、本地字体与 WASM 资源，以及受控同源服务中的 Referer 和 no-referrer/403。原样报告见 `evidence/pdf-original-20260923/`，运行编号 `35817787925`。

原样栅格采用同一 PDF.js 的独立页面渲染作缩略图比较，用于发现集成层缩放、拉伸和空白回归，不是桌面阅读器逐像素等价证明。C047 的原始页面只有一个空格，没有图片、可见绘图或墨迹；独立解析亦确认其为空白页，不能把它记成内容丢失或新增修复。

## 范围与回退

F01 的桌面 Chromium 弹窗首次适配、所给原件的页面比例/位图分辨率/单滚动容器、受控 HTTP 请求策略子项已取得证据。没有把服务器拒绝访问改成绕过鉴权，也没有伪造 Referer。客户服务端、iOS Safari、企业 App WebView 及真实打印驱动仍需目标环境验收；未将其记为已修复。

回退功能提交即可恢复原行为；原件未修改，没有数据迁移。测试可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定 Chromium；HTTP、真实 Worker 与原样验收必须使用本地服务器模式，不能把 in-memory 诊断当作相同验收。
