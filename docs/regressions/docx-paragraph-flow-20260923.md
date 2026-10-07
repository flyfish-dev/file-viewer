# DOCX 段落间距、分页性能与原稿完整性

## 已修复范围

功能提交 `e9ff0a50` 修复了不可用的行单位段前／段后间距被直接转换成巨大负 CSS 边距的问题。非有限值或负行单位值回退至明确的点数设置或原继承路径；合法行距、零值、自动间距及有符号缩进保持原语义。此处是容错处理，不宣称所有负数属性均违反 XML 规范。

续页只浅复制正文容器，同时完整复制页眉页脚；尚无内容的续页延后挂载，分割段落需要测量时先连接页面。普通单栏不建立多余的 CSS 分栏上下文。对完整越界的普通流尾部成组转移，继续使用引擎原有 keep-next 判断。多栏、显式列宽、浮动图形、负边距、定位、变换、清除浮动及竖排等不适用批处理的情况仍走保守路径。

实现位于 `scripts/lib/docx-paragraph-flow.mjs`，按固定输入构建五个分发入口，通过仓库既有 pnpm 补丁接入，并更新 Worker 缓存标识。保留旧基线用于独立对照，不在运行时修改引擎原型，不按文件名、正文或哈希改变预览逻辑。私有上游 TypeScript 源码构建尚未获得通过记录，不把分发集成验收称作上游源码构建成功。

## 原样确认

C022 的身份由 SHA-256 固定。校正前可复现 15 处异常负边距。校正后检查每页正文、页面尺寸、段落／表格／单元格几何、全部 87 行表格，以及逐页页脚。正文 30,769 个字符直接与原 `document.xml` 的文字序列比较，不通过空白归一化掩盖差异。

性能比较使用同一份原稿和同一浏览器，控制组已经修正段距及无效单栏上下文，再与批处理优化组交替运行。每次均要求页级文本哈希、页面盒和元素几何相同。实际耗时与布局计算次数见 `evidence/docx-paragraph-flow-20260923/original-benchmark.json`，不使用不同环境或不同分页结果计算加速比。

页数由当前字体与运行环境计算，不能视为 Microsoft Word 的参考页数。原件全文没有因测试被改写，报告不包含原稿正文。

## 可重复验证

按仓库要求进行冻结锁安装，并构建 Core、DOC、Word。基线重建需要本地 Git 中存在 `7d493f5f` 对应对象。

```bash
node scripts/prepare-docx-paragraph-flow.mjs --baseline-only
node packages/renderers/word/scripts/verify-paragraph-flow.mjs
node scripts/verify-docx-paragraph-flow.mjs
```

第三条提供 31 项补充检查，直接调用真实分发产物里的分页方法，不用复制实现代替产品。设置 `DOCX_FLOW_ORIGINAL` 可追加 C022 原稿完整性检查。设置 `DOCX_FLOW_CORPUS_DIR` 可让第二条执行原稿逐元素对照。

`benchmark-docx-paragraph-flow.mjs` 需要 `DOCX_FLOW_ORIGINAL` 与 `DOCX_FLOW_CONTROL_DIST`；后者必须是固定基线经 `control` 转换后的产物。`DOCX_FLOW_RUNS` 为 1–5，默认 3，按相反顺序交替运行。测试支持 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`，只使用本地文件和浏览器，不获取外部内容。

## 结项边界

C022 的异常段距、重复布局瓶颈及本组原稿正文完整性子项收口。此次不是整个 W02 的结项，不替代全部页脚定位、印章、字体、跨页表格和桌面应用的视觉对齐验收，也不承诺所有文档或宿主的统一时延。`patchedDependencies` 仍须保留；未发布 npm 新包。
