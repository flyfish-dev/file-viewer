# @file-viewer/renderer-geo

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geo/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geo/README.zh-CN.md)

Flyfish File Viewer 的独立地理数据 renderer 包。它负责 GeoJSON、KML、GPX 和 Shapefile 的浏览器端预览，并让 `@tmcw/togeojson`、`shpjs`、`maplibre-gl`、`proj4` 只在命中地理数据格式时加载。

## 使用

```ts
import { geoRenderer } from '@file-viewer/renderer-geo'

const options = {
  builtinRenderers: 'none',
  renderers: [geoRenderer],
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

- GeoJSON 直接读取 `FeatureCollection`、`Feature` 或单个 geometry。
- KML / GPX 只在命中格式时按需加载 `@tmcw/togeojson`，转换为统一 GeoJSON 管线。
- SHP / Shapefile 只在命中格式时按需加载 `shpjs`，支持常见 ZIP 或二进制 Shapefile 数据转 GeoJSON。
- 默认使用离线 MapLibre 空底图渲染点、线、面叠加层，支持平移、缩放和适配范围；显式配置后可叠加公网、内网或离线自托管瓦片底图。
- 支持 GeoJSON `crs` 元数据、`options.geo.projection` 显式坐标系、Web Mercator 自动推断，以及 `EPSG:4326`、`EPSG:3857`、`EPSG:4490`、`GCJ02`、`BD09` 和 proj4 字符串转换到 WGS84。
- WebGL 或 MapLibre 初始化失败时自动回退 SVG 矢量预览，适合内网部署和附件快速审阅。
- 卸载时清理 DOM 资源，和 core 的生命周期、导出 HTML、缩放能力保持一致。

## 坐标系选项

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    projection: 'EPSG:3857',
    inferProjection: true,
    fitPadding: 48,
  },
}
```

标准 GeoJSON 默认按 WGS84 读取。如果业务导出没有写 `crs`，但坐标是 Web Mercator，默认会自动推断；GCJ-02 / BD-09 这类非 EPSG 坐标建议通过 `options.geo.projection` 显式声明。

## 底图和瓦片选项

Geo renderer 默认不访问公网。需要真实底图时，可以选择公开 MapLibre style、自托管 style，或简单 raster XYZ/TMS 瓦片模板：

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    // 国际化开源底图，适合 demo 或轻量在线场景；生产建议按需自托管或镜像到内网/国内 CDN。
    basemap: 'openfreemap-liberty',
  },
}
```

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    // 最简单的 raster 瓦片入口，可指向公网、内网网关、对象存储或本地静态目录。
    tileUrl: '/tiles/world/{z}/{x}/{y}.png',
  },
}
```

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    basemap: {
      type: 'vector-style',
      label: 'Intranet OpenMapTiles',
      styleUrl: '/maps/styles/liberty/style.json',
    },
  },
}
```

天地图需要使用在天地图控制台为部署域名申请的 token。内置 preset 会同时加载对应的底图和中文注记图层：

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    basemap: 'tianditu-vector', // 也支持 tianditu-imagery / tianditu-terrain
    tiandituToken: import.meta.env.VITE_TIANDITU_TOKEN,
  },
}
```

需要隐藏注记时可使用对象形式：`basemap: { type: 'tianditu', token, mapStyle: 'imagery', labels: false }`。组件不会内置、保存或代理 token；未提供 token 时会安全回退到离线空底图。

内置 preset 包含 `openfreemap-liberty`、`openfreemap-bright`、`openfreemap-positron`、`openfreemap-dark`、`openfreemap-fiord`、显式 opt-in 的 `osm-raster`，以及需要调用方 token 的 `tianditu-vector`、`tianditu-imagery`、`tianditu-terrain`。`osm-raster` 只建议用于 demo 或低频访问，生产环境请遵守 OpenStreetMap 官方 tile policy，配置可替换 URL、缓存和正确 attribution。中国大陆也可以把 OpenFreeMap / OpenMapTiles 栈自托管到内网或国内 CDN，再通过 `styleUrl` 或 `tileUrl` 接入。

## 迁移说明

`@file-viewer/core` 已不再内置 geo renderer，也不会默认安装 `@tmcw/togeojson` 和 `shpjs`。需要 GeoJSON / KML / GPX / SHP 预览时，请显式安装本包，或直接使用 `@file-viewer/preset-all` 聚合能力。
