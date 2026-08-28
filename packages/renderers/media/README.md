# @file-viewer/renderer-media

Flyfish File Viewer 的基础音视频 renderer 包，默认只提供浏览器原生音频和视频播放。HLS fallback 与 MIDI 检查分别由 `@file-viewer/capability-streaming-media`、`@file-viewer/capability-midi` 显式启用，不进入 standard/full 默认闭包。

## 使用

```ts
import { mediaRenderer } from '@file-viewer/renderer-media'

const options = {
  builtinRenderers: 'none',
  renderers: [mediaRenderer],
}
```

也可以通过全量 preset 自动装配：

```ts
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  builtinRenderers: 'none',
  renderers: allRenderers,
}
```

## 能力

- MP4、WebM 和常见音频格式优先使用浏览器原生 `<video>` / `<audio>` 控件。
- MP4 会读取视频轨的编码标识。浏览器无法解码 MPEG-4 Part 2（`mp4v`）Simple Profile 时，renderer 会按需启动独立 Worker，使用 AAC 音轨校时，并把软件解码的 I420 画面绘制到 Canvas，不再出现“有声音、画面全黑”。
- MP4V 后备解码器来自 AOSP PacketVideo，许可证为 Apache-2.0。WASM 为 111,379 字节（gzip 34,410 字节），仅在原生解码失败时加载。实现不包含 FFmpeg、libav 或 LGPL/GPL/AGPL 源码。
- 浏览器缺少 Worker、OffscreenCanvas 或 VideoFrame，或者文件超出当前解码范围时，会显示明确的兼容提示。面向更多浏览器发布时，H.264/AVC 仍是更省 CPU 的选择。
- 安装 streaming-media capability 后，HLS `.m3u8` 优先使用浏览器原生能力，不支持时才加载 `hls.js`。
- 安装 MIDI capability 后，MIDI / MID 才加载 `@tonejs/midi` 并展示曲名、时长、PPQ、轨道和音符摘要。
- 所有资源在卸载时清理对象 URL、播放器状态和 HLS 实例，适合长时间运行的后台系统。

## 迁移说明

`@file-viewer/core` 不内置 media renderer。standard 只装配本包的原生媒体路径；打开 `.m3u8`、`.midi` 或 `.mid` 时会给出对应的 `npx file-viewer-cli add ...` 命令。`preset-all` 仅用于显式全量/调试并注册两项可选能力。
