# @file-viewer/renderer-image

Flyfish File Viewer 的独立图片 renderer 包。它负责 `png`、`jpg`、`webp`、`avif`、`gif`、`svg`、`tiff`、`ico`、`heic`、`heif`、`jxl` 等图片类文件的浏览器端预览、灯箱查看和统一缩放。

TIFF 会在命中格式后按需加载 MIT 许可的 UTIF.js，支持 CCITT Group 4 和多页纵向预览，并提供整组缩放、旋转、适宽、页码状态与双击/键盘放大。解码前会限制源文件大小、页数、单页尺寸和累计像素，逐页转换后立即释放 RGBA 缓冲；普通 PNG/JPEG/WEBP 等路径不加载 TIFF 解码器。

## 使用

```ts
import { imageRenderer } from '@file-viewer/renderer-image'

const options = {
  builtinRenderers: 'none',
  renderers: [imageRenderer],
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

- 普通图片使用浏览器原生解码，不引入额外运行时。
- HEIC / HEIF 只在命中格式时动态加载 `heic2any` 并转换为 PNG Data URL。
- 支持左右 90° 旋转；主视图和灯箱都会按旋转后的宽高重新适配，不裁切图片。
- 支持图片灯箱、统一缩放和 view-state provider、明暗主题背景和组件卸载清理。

## 迁移说明

`@file-viewer/core` 仍保留 PNG / JPEG / SVG / WebP 等浏览器原生图片的轻量预览，但已不再默认安装 `heic2any`。需要 HEIC / HEIF 转换预览、或希望完全由独立图片 renderer 接管图片链路时，请显式安装本包，或直接使用 `@file-viewer/preset-all` 聚合能力。
