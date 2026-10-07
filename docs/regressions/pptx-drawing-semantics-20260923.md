# PPTX 混合文本域、图片效果与母版层次

## 修复

混合 `a:r`、`a:fld` 和 `a:br` 按 XML 顺序输出，不再把域追加到段尾或丢掉连续换行；每个域保留自身运行属性。`slidenum` 使用演示文稿的 `firstSlideNum`，与一基导航序号、内部 part 名称分离。零起点、带符号的合法起点及连续打开不同文档均有覆盖。日期等未重新计算的域保持原稿缓存文本，不用当前时间改写文档。

图片 `alphaModFix` 应用于图片像素而不是整个形状或兄弟图层。支持零值、百分数字面量及重复调制；大于 100% 的倍率通过离线 SVG alpha transfer 处理，保留中间饱和步骤，避免被 CSS opacity 的范围裁剪误解。已有灰度路径不变。图片水平／垂直翻转与旋转在同一局部坐标系组合，裁剪和自定义路径随图片视口一起变换。跨母版／布局／幻灯片的自定义裁剪 ID 加上来源层标识，避免仅按页内形状 ID 发生冲突。

母版和布局建立独立的定位与堆叠上下文；只在各自 part 内比较绘制顺序，不再让母版中的高序号形状越过布局。保留幻灯片对象在上、隐藏母版形状及原有组内顺序。

## 验证

`packages/renderers/pptx/scripts/verify-drawing-semantics.mjs` 使用实际解析器、真实 Chromium Worker、生产清理器与公开 `PptxViewer.open`。生成式例子检查数值、正文序列和截图像素，包含透明度叠加／放大、翻转与旋转、裁剪、连续换行和公开查看器销毁。旧实现有 20 项定向断言失败；它们是同一批根因的多项测试，不是 20 个独立缺陷。

原稿 C010 两页与 C008 一页的布局图片，按独立 XML DOM 读取的 alpha、翻转矩阵及自定义掩码标记逐项核对。C045、C044、C041、C049 的可见页码域逐页复测。12 份哈希固定 PPTX、共 60 页均无 slide-error；这项只是解析与图片加载回归，不代替字体、图表和全页像素验收。C048 的图表样式和所有渐变／掩码组合没有被此结论自动关闭。

本轮未增加运行时依赖、未修改版本号或锁文件。生产 Worker 构建后同步到演示站静态目录，避免源码修复但演示站仍执行旧 Worker；独立部署应重新构建并更新已复制的 Worker 文件。

```bash
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/pptx build
PPTX_DRAWING_WORKER_FILE=packages/renderers/pptx/dist/worker/pptx.worker.js \
  node packages/renderers/pptx/scripts/verify-drawing-semantics.mjs
```

设置 `PPTX_DRAWING_CORPUS_DIR` 可执行带 `manifest.json` 的中性编号原稿集；清单包含 `id`、`bytes`、`sha256`，用例先校验字节。默认 26 项、完整原稿集 33 项。设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 可选择已有 Chromium。报告写入 `output/pptx-drawing-semantics`，不主动联网获取原稿。远端构建与结果以同目录 `evidence/pptx-drawing-semantics-20260923/verification.json` 为准。

## 范围

P01 的上述通用根因与对应原样子项可按证据收口；不是整个资料包、整个 P01 或全部宿主的结项。Word 页脚／表格／印章、PPTX 其余文字度量、复杂图表、未覆盖的掩码和目标宿主场景仍应按现有清单逐项验收。
