# @file-viewer/renderer-geo

[English](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geo/README.md) · [简体中文](https://github.com/flyfish-dev/file-viewer/blob/main/packages/renderers/geo/README.zh-CN.md)

Standalone geospatial renderer package for Flyfish File Viewer. It previews GeoJSON, KML, GPX, and Shapefile data in the browser while keeping `@tmcw/togeojson`, `shpjs`, `maplibre-gl`, and `proj4` lazy-loaded for geospatial files only.

## Usage

```ts
import { geoRenderer } from '@file-viewer/renderer-geo'

const options = {
  builtinRenderers: 'none',
  renderers: [geoRenderer],
}
```

You can also compose it through the full preset:

```ts
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  builtinRenderers: 'none',
  renderers: allRenderers,
}
```

## Capabilities

- Reads GeoJSON `FeatureCollection`, `Feature`, and standalone geometry objects.
- Loads `@tmcw/togeojson` only for KML / GPX and normalizes them into the shared GeoJSON pipeline.
- Loads `shpjs` only for SHP / Shapefile previews, including common ZIP or binary Shapefile payloads.
- Uses an offline MapLibre empty style to render point, line, and polygon overlays with pan, zoom, and fit-to-bounds controls. Public, intranet, or fully self-hosted basemap tiles can be enabled explicitly.
- Supports GeoJSON `crs` metadata, explicit `options.geo.projection`, Web Mercator inference, and conversion from `EPSG:4326`, `EPSG:3857`, `EPSG:4490`, `GCJ02`, `BD09`, or proj4 strings to WGS84.
- Falls back to an SVG vector preview when WebGL or MapLibre initialization is unavailable.
- Cleans up DOM resources on unmount and remains compatible with core lifecycle, HTML export, and zoom orchestration.

## Projection Options

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

Standard GeoJSON is read as WGS84 by default. If an export omits `crs` but contains Web Mercator coordinates, the renderer infers EPSG:3857 by default. For non-EPSG systems such as GCJ-02 or BD-09, pass `options.geo.projection` explicitly.

## Basemap and Tile Options

The geo renderer does not access public networks by default. When a real basemap is needed, pass a public MapLibre style, a self-hosted style, or a simple raster XYZ/TMS tile template:

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    // International open-source basemap, good for demos or light online usage.
    // Production systems should self-host or mirror it when needed.
    basemap: 'openfreemap-liberty',
  },
}
```

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    // Simple raster tile entry. It can point to public tiles, an intranet gateway,
    // object storage, or a local static tile directory.
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

Tianditu requires a token registered for the deployment's domain. Each built-in preset combines its base and annotation layers:

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    basemap: 'tianditu-vector', // or tianditu-imagery / tianditu-terrain
    tiandituToken: import.meta.env.VITE_TIANDITU_TOKEN,
  },
}
```

Use `basemap: { type: 'tianditu', token, mapStyle: 'imagery', labels: false }` to omit annotations. The viewer never bundles, stores, or proxies the token; a missing token safely falls back to the offline empty basemap.

Built-in presets include `openfreemap-liberty`, `openfreemap-bright`, `openfreemap-positron`, `openfreemap-dark`, `openfreemap-fiord`, explicit opt-in `osm-raster`, and the caller-token-based `tianditu-vector`, `tianditu-imagery`, and `tianditu-terrain` presets. Use `osm-raster` only for demos or low-volume traffic; production deployments should follow the official OpenStreetMap tile policy, keep the URL replaceable, cache correctly, and show attribution. OpenFreeMap / OpenMapTiles can also be self-hosted or mirrored to an intranet or domestic CDN and connected through `styleUrl` or `tileUrl`.

## Migration Note

`@file-viewer/core` no longer bundles the geo renderer and no longer installs `@tmcw/togeojson` or `shpjs` by default. Install this renderer explicitly, or use `@file-viewer/preset-all`, when GeoJSON / KML / GPX / SHP preview is required.
