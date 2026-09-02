# Roadmap

File Viewer 的长期方向不是做“全能文件预览神器”，而是成为企业后台、内网和私有化场景里可靠、可自托管、可按需裁剪的前端文件预览方案。

## 当前重点

- README、Demo、文档和 Release 统一突出“内网 / 私有化 / 无服务端转码”的定位。
- 持续守住 265 个已注册扩展名（223 个稳定、42 个实验）、44 个渲染器标识、86 个 npm 发布目标和 992 个组件渲染目标的公开口径一致性；所有数字均由格式目录与 release matrix 生成。
- 发布链路默认校验离线运行时资源，libarchive、DOCX、CAD、Typst、PDF、Draw.io 等 Worker/WASM/vendor 资产必须本地化随包或随 viewer assets 分发。
- 官方 Demo 构建产物提供 release 级 iframe 交付包，客户可直接下载、私有化部署并通过 `iframe.html?embed=1&url=...` 或 `postMessage(Blob)` 集成。
- 强化真实业务文件的兼容性反馈闭环，尤其是 Office、PDF、CAD、压缩包、邮件和移动端 WebView。
- 保持 renderer / preset / 组件包分层，避免 full 包成为所有业务的默认选择。

## 近期计划

- 完善 Demo 场景入口: Word 合同、Excel 报表、PPT 材料、DWG 图纸、压缩包、邮件、上传文件。
- 为服务端转码、Office Online / 云服务、纯前端预览方案补充克制的对比文档。
- 让 release notes 更偏“谁该升级、解决什么问题、怎么升级”。
- 维护 release matrix / release status / changelog 三处里程碑，确保发布前后能追踪 npm、GitHub Release、公开总仓、Docker、官网、文档和 Demo。
- 将官方 Demo iframe artifact 纳入 GitHub Release 附件、public manifest 和发布校验，确保客户交付包与在线 Demo 同步。
- 维护 GitHub Topics、Social Preview、README 首屏和英文传播材料。
- 记录 GitHub Traffic、npm 下载、issue 质量和文章渠道效果。

## 中期计划

- 提升 Office / PDF / CAD / Archive / Email 的真实样本回归覆盖。
- 持续优化 Worker、WASM、字体和 vendor 资源在内网、Docker、静态站点、私有 CDN 和移动端 WebView 中的部署体验。
- 增强文档比对、搜索、缩放、打印、导出和权限前置校验的一致性。
- 为每类 renderer 补齐更明确的能力边界、失败提示和最小复现指南。

## 不做什么

- 不承诺替代专业 Office、CAD 或 EDA 编辑器。
- 不把浏览器描述成万能转换器。
- 不默认要求用户使用云端转换服务。
- 不鼓励上传真实敏感业务文件作为公开复现。
