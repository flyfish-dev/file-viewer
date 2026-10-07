# 工作表切换、缩放与尺寸缓存修复

## 根因与修复

工作表缓存保存了上次显示时的缩放行高。切换到其他工作表改变缩放，再返回缓存工作表时，列宽使用当前倍率，行高却沿用旧倍率。恢复缓存时现在按未缩放的行高重建显示尺寸；过期的切表微任务不再覆盖最终选中的工作表。

用户拖拽产生的行高现在独立保存为每张工作表的未缩放覆盖值。延迟窗口数据及结构数据回填时保留该值，不再用源文件默认高度覆盖用户操作。列宽逻辑未更改，行列调整仍需显式开启 `resizableRows` / `resizableColumns`。

## 验证

```sh
pnpm --filter @file-viewer/core build
pnpm --filter @file-viewer/renderer-spreadsheet build
node packages/renderers/spreadsheet/scripts/verify-layout-state.mjs
```

10 项默认检查使用实际 XLSX 解析器、e-virt-table 和 Chromium 鼠标拖拽，覆盖行列调整、50% 拖拽、88%/100%/200% 缩放、缓存切表、快速切表、重挂载、默认关闭调整和卸载。延迟窗口边界通过测试观察点重放回填，未替换解析器或表格。旧代码在缓存切表检查中失败，修复后通过。

设置 `SPREADSHEET_LAYOUT_SAMPLE` 为 C036 原文件路径后，增加第 11 项校验。脚本先验证 SHA-256，再执行真实行列拖拽及 50%/88%/100%/200% 缩放，最后确认输入字节未修改。结果见 `evidence/spreadsheet-layout-20260923/original-checks.json`。原文件只有一张工作表，因此切表使用独立生成的双工作表，不把它记作原稿自带场景。

此处只结清 S01 的行列尺寸与缩放/切表状态子项；不代表 Excel 图表、全部字体、图片位置与逐像素保真通过。没有运行时依赖、版本或锁文件变化。
