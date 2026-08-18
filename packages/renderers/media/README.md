# @file-viewer/renderer-media

Flyfish File Viewer 的独立音视频 renderer 包。它负责音频、视频、HLS 清单和 MIDI 文件的浏览器端预览，并让 `hls.js`、`@tonejs/midi` 只在命中对应格式时加载。

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
- HLS `.m3u8` 优先使用浏览器原生能力，不支持时才按需加载 `hls.js`。
- MIDI / MID 只在命中格式时按需加载 `@tonejs/midi`，展示曲名、时长、PPQ、轨道和音符摘要。
- 所有资源在卸载时清理对象 URL、播放器状态和 HLS 实例，适合长时间运行的后台系统。

## 迁移说明

`@file-viewer/core` 已不再内置 media renderer，也不再直接依赖 `hls.js` 和 `@tonejs/midi`。需要音频、视频、HLS 或 MIDI 预览时，请显式安装本包，或使用会自动聚合本包的 `@file-viewer/preset-all`。
