# @file-viewer/renderer-email

浏览器原生预览 `.eml`、Outlook `.msg`、`.mbox`，支持正文/邮件头切换、附件下载和嵌套附件预览，不依赖服务端转换或运行时 CDN。

## 接入

```ts
import { FileViewer } from '@file-viewer/vue3'
import { emailRenderer } from '@file-viewer/renderer-email'

const options = {
  builtinRenderers: 'none',
  renderers: emailRenderer,
}
```

传入带真实 `.msg` 文件名的 `File`，或保留原文件名的 URL。沿用现有 email 路由，仅在命中 MSG 时加载其解析模块，EML/MBOX 不加载 MSG 解析器。

附件预览需要组合相应的 PDF、图片、Word 等 renderer，由宿主提供标准 `renderNestedBuffer`。内嵌 Outlook 邮件按真实 `.msg` 提取和预览，不伪装成文本；下载保留附件原始字节。

### Outlook 富文本正文

Full preset 已包含 Word renderer 和 RTF 能力：

```ts
import allRenderers from '@file-viewer/preset-all'
const options = { preset: allRenderers }
```

按需接入时，同时安装 `@file-viewer/renderer-word` 和 `@file-viewer/capability-rtf`：

```ts
import { emailRenderer } from '@file-viewer/renderer-email'
import { wordRenderer } from '@file-viewer/renderer-word'
import '@file-viewer/capability-rtf'

const options = {
  builtinRenderers: 'none',
  renderers: [emailRenderer, wordRenderer],
}
```

本地解压压缩 RTF；其中封装的 HTML 可用于正文预览，普通富文本通过嵌套 renderer 复用现有 RTF.js 能力。仅安装 email renderer 时仍可阅读提取的纯文本，并提示富文本能力未安装。邮件 RTF 始终禁止外部资源和链接，不继承宿主针对其他文档开启的外链权限。

## MSG 能力

- Unicode/ANSI 属性、Outlook 代码页、Unicode `bodyHtml` 与二进制 `html`、BOM 和 HTML charset 解码。
- 主题、发件人、代发 Sender、独立的 To/Cc/Bcc、提交/投递时间、原始邮件头；草稿缺少邮件头时显示明确标识的元数据摘要。
- HTML、纯文本、RTF 正文切换，保留表格、作者样式和本地 CID/Content-Location 栅格图片。
- MIME、附件安全文件名、惰性二进制提取、原字节下载和内嵌 MSG 预览；未知大小在提取前显示未知，不误报为零字节。
- 未打开附件时正文占满可用高度；关闭附件恢复正文空间和键盘焦点；切换、取消、卸载会清理过期预览和资源 URL。
- 提示支持简体中文、英语、日语、德语，跟随 viewer locale；适配窄容器和明暗主题。

EML/MBOX 继续使用 `postal-mime`。MBOX 仍预览第一封邮件并提示邮件数量，本次不新增邮箱列表浏览器。

## 隐私、限制与兼容性

HTML 正文位于空 sandbox iframe 内，通过净化和严格 CSP 禁止脚本、表单操作、嵌入文档、本地路径、外部样式、字体、追踪图片及远程资源请求。只允许本地持有的图片资源和栅格图片 data URL，外部超链接不激活。此规则同时作用于 EML/MBOX，因此历史上依赖远程图片的邮件不再自动联网加载。普通来源使用 Blob URL；不透明来源的 WebView 使用有界的本地 data URL 展示内嵌图片。

安全上限：MSG 原文件/单个附件 128 MiB，HTML 或解压后的 RTF 32 MiB，提前解码的内嵌图片合计 32 MiB，每封邮件最多 1,024 个附件、4,096 个收件人，CFB 最多 32,768 个目录项、24 层存储。HTML 另有节点数量和序列化/内嵌资源膨胀上限。损坏、循环、截断或超限输入明确失败；这些防御性限制不代表完成了全面对抗性解析器审计。

**不实现 S/MIME/IRM 解密或签名验证。** 对受保护/签名邮件类型显示提示，仅展示可获得的内容。联系人、任务、日程、OLE 激活和全部 Outlook 专有 MAPI 属性不属于完整 Outlook 替代范围。富文本还原度受已安装 RTF 能力限制，未经真实文件对照不承诺与 Outlook 像素一致。

## 验证

```sh
pnpm --filter @file-viewer/renderer-email verify:email
pnpm exec playwright install chromium
pnpm --filter @file-viewer/renderer-email verify:msg:browser
```

根目录原有邮件回归入口会调用 `verify:email`，保留 EML #232 检查并加入 MSG 测试。`test/msg.test.mjs` 默认使用真实安装的 MsgReader，覆盖生成的 CFB v3/v4、ANSI、Unicode、RTF 和嵌套邮件。`MSG_UNIT_ONLY=1` 仅用于明确标注的离线子集，不能替代集成验收。

浏览器测试使用生产 renderer 编译结果、真实 Chromium，以及明确声明的 Reader/RTF 宿主 API 测试替身，验证布局、安全隔离、下载、竞态和清理；不代表真实解析器集成或 RTF.js 视觉还原验收。截图和 JSON 结果输出到 `output/msg-browser/`。参见[样本来源说明](test/fixtures/README.md)。
