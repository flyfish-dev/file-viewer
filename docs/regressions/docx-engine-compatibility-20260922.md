# DOCX 图表、浮动定位与 Worker 集成修复

## 本轮修复

| 范围 | 确认的根因 | 修复与验收 |
| --- | --- | --- |
| 图表缓存 | 缓存点按数组顺序读取，空白标签被过滤；缺失数值被当作零值 | 按 `idx` 对齐缓存，保留完整分类轴；空缺形成断点，负数柱正确跨越零轴，单一有效饼图显示完整圆形。 |
| 浮动图形 | 转成 CSS 浮动后未保留显式列坐标和段落纵向偏移 | 仅对具有明确源坐标的受支持锚点补偿偏移；不推测未知锚点，不改动页面/字符锚点规则。 |
| Worker XML | 原 Worker 使用浏览器主线程 DOMParser/XMLSerializer，实际 Worker 中不存在，导致解析失败后回退 | 在引擎的 Worker 构建中打包已有锁定版本的 XML DOM 依赖；保留许可证，不依赖 CDN。拒绝 DTD 和实体声明，畸形 XML 返回错误。 |
| 分发一致性 | 只修源码不会改变预览器依赖，旧 Worker 可继续命中缓存 | 通过 pnpm 标准补丁接入 ESM、CommonJS、两个 min 入口和 Worker，更新缓存标识与 Demo 资产，保留各入口内容哈希。 |

## 验证

运行 `pnpm verify:docx-engine-compatibility`。11 项检查使用真实 ZIP/XML、真实渲染引擎、
真实浏览器 Worker、真实 SVG 和生成式 DOCX，不以主线程回退代替 Worker 成功。
Worker 必须返回 `parsed` 消息，结果须与 ESM 主线程和 CommonJS 入口一致。

原样文件另外核对了分类轴、图表数、表格和图片数量。C038 的两幅图各保留 16 个
稀疏标签和原始横坐标；C012 的 13 个连续标签完整保留；C052 的稀疏标签保持完整轴域。
这些结果只证明相应图表行为，不代表整篇文档已经达到桌面应用像素一致。
C022 延长检查后完成分页，但分页性能、全部表格、页脚和字体还需要逐页核对。

## 安装与发布边界

使用仓库指定的 pnpm 版本和 `pnpm install --frozen-lockfile`，不要跳过
`pnpm-workspace.yaml` 中的 `patchedDependencies`。补丁由拥有该能力的引擎分支构建，
`patches/docx-engine-compatibility.json` 保留五个入口的精确 SHA-256；不覆盖 npm 上的旧版本。

这是审阅分支接入，不是 npm 发版。单独安装 npm 的 `@file-viewer/renderer-word@3.1.2`
仍会使用未修补的 `@file-viewer/docx@0.3.32`，必须同样应用补丁，或等待引擎新版本发布后
升级依赖。发布前仍需完整 workspace 冻结锁构建和目标宿主验证。

## 回退

一起回退引擎补丁、锁文件、缓存标识与 Demo Worker；不要混用新旧 Worker 和主线程包。
没有数据迁移，未新建 PR，未修改 main，未自动关闭问题。
