# @file-viewer/renderer-iwork

Apple `.pages/.numbers/.key` 离线 renderer。支持现代 IWA 容器和 iWork ’09 XML/APXL 容器检测与解析，所有重解析在 module Worker 中执行。动画、转场和 Numbers 公式重算不执行；内嵌 Quick Look 预览只用于加载或明确的失败降级，不计入高保真证据。

`.pages`、`.numbers`、`.key` 已达到 stable 高保真代码门禁：’09、2013+ 与当前版本真实 fixture 均通过结构断言、真实浏览器 smoke 和 Apple 原生导出的固定字体像素差门禁。只有 typed 场景解析失败并进入通用 IWA 兜底时才标记为有限预览；实际公开发布状态以 npm、Release 和生产域名验收为准。
