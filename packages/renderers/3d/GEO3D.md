# Optional streaming Geo3D viewer

The explicit `@file-viewer/renderer-3d/geo3d` entry follows the same opt-in
specialist pattern as IFC. It is not imported by `@file-viewer/renderer-3d`
and is not added to Full or engineering presets.

The integration previews LAS/LAZ, COPC, CityJSON, GeoTIFF/COG, 3D Tiles and
bounded 3TZ archives. Point clouds and rasters use source-owned decoder Workers
by default. The browser acceptance suite checks rendering, repeated teardown,
concurrent viewers and cancellation, both in the workspace and from installed
tarballs. See [Fixtures, licenses and verification](#fixtures-licenses-and-verification)
for reproducible checks and their scope.

COPC and remote COG use range-aware access. Plain LAS/LAZ, CityJSON and 3TZ are
bounded whole-file inputs. 3D Tiles retains its original URL so nested tiles,
glTF resources and textures remain relative to the dataset.

## Install and self-host

Giro3D is an optional peer, matching the IFC specialist entry:

```sh
npm install @file-viewer/renderer-3d @giro3d/giro3d@2.0.4
# Only required when 3TZ archives are enabled:
npm install jszip@3.10.2

npx file-viewer-geo3d-assets public/file-viewer/vendor/geo3d
```

The asset command copies the static module Workers `workers/las-worker.js`,
`workers/geotiff-worker.js` and `workers/texture-worker.js`, laz-perf WASM,
Three.js DRACO and KTX2/Basis decoders, licenses, notices and content manifests.
Worker hashes are checked against the build manifest. Re-run asset-copy whenever
updating this renderer; updating JavaScript while retaining older public decoder
assets is not sufficient. Preserve `workers/licenses/`, `workers/raster-licenses/`,
`workers/manifest.json` and the root license/manifest files.

Decoder assets are resolved from the installed Giro3D peer graph. Reviewed,
SHA-256-pinned source transformations generate the point/raster factories during
the renderer build, without editing installed engine files. Factories and
Workers are shipped in `dist`; consumers of the compiled package do not need
its development adapter generators. The installed-consumer test verifies this
with source/build scripts absent, install scripts disabled, a physical npm
installation and both public TypeScript resolution modes. Retained laz-perf and
Lerc license fallbacks are version-specific and hash-checked, with no build-time
license download.

The renderer passes local decoder paths explicitly; no decoder CDN is required.
For a nested deployment, copy to the matching public path and use the same URL
prefix as `assetBaseUrl`. Browser checks build production fixtures and use the
real engine and Workers. The concurrent suite also enforces `worker-src 'self'`
with static decoder scripts under a nested custom asset path.

## Usage

```ts
import { modelRenderer } from '@file-viewer/renderer-3d'
import { createGeo3dRenderer } from '@file-viewer/renderer-3d/geo3d'

const geo3d = createGeo3dRenderer({
  assetBaseUrl: '/file-viewer/vendor/geo3d/',
  maxLasBytes: 512 * 1024 * 1024,
  maxCityJsonBytes: 64 * 1024 * 1024,
  max3tzBytes: 512 * 1024 * 1024,
  archive: {
    maxEntries: 4096,
    maxExpandedBytes: 512 * 1024 * 1024,
    maxEntryBytes: 128 * 1024 * 1024,
    maxCompressionRatio: 200,
  },
  giro3d: {
    instance: { logarithmicDepthBuffer: true },
    view: { fitToDataset: true, controls: true },
    sources: {
      copc: { decimate: 1, pointSize: 4 },
      las: { decimate: 1, pointSize: 4 },
      geotiff: {},
      cog: {},
      cityjson: {
        materialColor: '#b8c4d2',
        // Optional: select a named texture theme present in the document.
        // textureTheme: 'day',
      },
      '3d-tiles': { errorTarget: 8, pointSize: 4 },
    },
  },
  configureInstance({ instance, signal }) {
    // The actual, fully typed Giro3D Instance before instance.add().
    // The required signal covers this viewer's entire lifetime.
    // Return cleanup only for resources owned by this application.
  },
  configure(context) {
    // Discriminating format narrows the real entity type, without a cast.
    if (context.format === 'copc') {
      context.entity.pointSize = 4
      context.entity.opacity = 0.9
      context.instance.notifyChange(context.entity)
    }
  },
})

const options = {
  rendererMode: 'extend',
  renderers: [modelRenderer, geo3d],
}
```

### Relative dataset URLs

Root-relative and document-relative dataset URLs are resolved against the viewer
container's owning document `baseURI`, including a host `<base href>`. The
normalized dataset URL is then used by the engine and as the base for relative
CityJSON textures and 3D Tiles resources. Absolute dataset URLs and their query
strings are preserved. Local File/buffer inputs are not assigned a network URL.

## Advanced API and resource ownership

`configureInstance` exposes the actual Giro3D `Instance`. `configure` adds a
format-discriminated entity: PointCloud for LAS/LAZ/COPC, Map for GeoTIFF/COG,
Tiles3D for 3D Tiles/3TZ, and the rendered object group for CityJSON. The public
Instance/entity APIs are not replaced by narrow structural facades. Picking,
view changes, progress, memory observations and entity-specific public controls
remain accessible through these objects. The consumer fixture exercises the
installed declarations in both NodeNext and Bundler modes. This is not a claim
that every possible engine feature has its own visual regression.

Use trusted application code for these hooks and options. Dataset metadata must
not become executable configuration, arbitrary Worker/WASM paths, constructors,
fetch functions or disposers. Source options remain an explicit whitelist, not
an unrestricted `Record<string, any>` passed through to engine constructors.

File Viewer owns the Instance, initial entities/sources, controls, decoder pools,
fetch cancellation, archive URLs and created texture/bitmap resources. Hooks
must not dispose adapter-owned objects. Return cleanup for host-created layers,
listeners and other resources. Returned cleanup runs in reverse registration
order; a throwing callback does not prevent the remaining resources from being
released. Both hooks receive the required viewer AbortSignal.

Point requests are stopped before their source pool is cancelled. Queued work
cannot read a disposed source, and fulfilled results cannot create late geometry
after cancellation. Initialization retains its complete readiness Promise chain,
so a handled failure does not create an additional unhandled rejection. Public
cancellation reasons are preserved and genuine decoder errors remain visible.
Repeated `unmount()` returns the same cleanup Promise, including reentrant calls.

Explicit `enableWorkers: false` remains available for synchronous decoding.
The lazy owned pool creates no Worker in this mode; it is not the acceptance
path for asynchronous decoding. The default Worker path is tested separately
for points and rasters, with two viewers and a fresh viewer after final cleanup.

### Native sources and the initial raster layer

`source` remains the original input descriptor (URL/File/buffer, filename and
relative-resource resolver). It is not the decoder. The post-load hook and the
returned viewer additionally expose read-only references to adapter-owned objects:

| Normalized format | `entity` | `nativeSource` | `colorLayer` |
| --- | --- | --- | --- |
| `copc` | PointCloud | COPCSource-compatible owned adapter | `null` |
| `las`, `laz` | PointCloud | LASSource-compatible owned adapter | `null` |
| `geotiff`, `cog` | Map | GeoTIFFSource-compatible owned adapter | Initial ColorLayer |
| `3d-tiles`, `3tz` | Tiles3D | `null` | `null` |
| `cityjson` | Rendered Group | `null` | `null` |

The source adapters preserve the reviewed engine's public source APIs while
owning their decoder pools. The read-only reference does not make the object
immutable: public setters remain usable. Do not dispose these objects from a
hook, replace their Worker/fetch machinery or transfer them to another viewer.

```ts
const geo3d = createGeo3dRenderer({
  // Zero is the engine's automatic point-size mode, not an invalid size.
  giro3d: { sources: { copc: { pointSize: 0 }, las: { pointSize: 0 } } },
  configure(context) {
    if (context.format === 'copc') {
      context.entity.pointBudget = 100_000
      const attributes = context.entity.getSupportedAttributes()
      if (attributes.some(attribute => attribute.name === 'Intensity')) {
        context.entity.setColoringMode('attribute')
        context.entity.setActiveAttribute('Intensity')
        context.nativeSource.filters = [
          { dimension: 'Intensity', operator: 'greaterequal', value: 0 },
        ]
      }
    } else if (context.format === 'geotiff' || context.format === 'cog') {
      context.colorLayer.opacity = 0.8
      context.colorLayer.contrast = 1.1
      // Channel selection depends on the dataset's available bands.
      // context.nativeSource.channels = [2, 1, 0]
    }
    context.instance.notifyChange(context.entity)
  },
})
```

The consumer type fixture covers source-specific APIs and rejects mismatched
entities, invalid options and lost type information in NodeNext and Bundler.
The browser suite also uses real source/layer identities, intensity and
classification modes, filters, color maps, raster channel setters and layer
reattachment, Tiles styling accessors, picking and interactive camera controls.
These tests do not certify every possible dataset or every engine feature.

### Cancellation of asynchronous application hooks

Both hook waits are cancellable even when the application Promise ignores its
AbortSignal or remains pending. Cancellation rejects the render with the original
reason and releases the viewer's existing resources without waiting for that
hook. A cleanup returned after cancellation is run exactly once. Returning it does
not restart the old viewer or repeat its teardown, so the adapter does not
clear a replacement viewer. Already available cleanups
run in reverse registration order; genuinely late cleanups necessarily run when
they become available.

A hook must return `undefined` or a cleanup function, synchronously or through a
Promise. Other values reject the render with TypeError. Synchronous exceptions
and pre-cancellation hook rejections remain render errors. Cleanup failures and
late hook failures are reported through `onExtensionError(error)`; without an
observer they use `globalThis.reportError`, or `console.error` where unavailable.
An observer failure is reported together with the original error. Reporting a
host cleanup failure does not skip remaining resource release.

Cancellation stops waiting for application code; it cannot terminate arbitrary
JavaScript running on the application's thread. Async hooks should still check
`context.signal` before mutating runtime objects after an await. Returned cleanup
functions may be asynchronous but must settle; the renderer awaits registered
cleanup functions during normal unmount. Release only host-owned resources.

Eight real browser regressions hold non-cooperative pre/post-load hooks for COPC
and COG, abort without releasing them, create a replacement in the same target,
and then resolve or reject the old hook. They verify survivor/replacement
rendering, exact cleanup/error delivery and no retained viewer resources. These
cases run against both workspace output and physical installed tarballs.

### Pinned engine maintenance boundary

The ownership adapters deliberately depend on reviewed Giro3D 2.0.4 source.
Besides source-local pool injection, the PointCloud subclass overrides the
engine's internal loading method to link node and viewer cancellation. Source
initialization uses protected readiness fields. These are not an assertion of
compatibility with arbitrary future Giro3D versions. Exact source hashes fail
the build when those implementations change. An upgrade requires reviewing the
transformations and lifecycle contract, not merely replacing expected hashes.

The PNTS material adapter is also version-bound: it repairs classification
define names and flattens classification uniforms while preserving the engine
lookup textures, weights and public styling API. The build verifies the pinned
`src/renderer/shader/PointsVS.glsl` against the installed runtime material.

Raster sources track their own decoded-region cache entries and release them
on disposal, including stale entries. Pending reads cannot repopulate a closed
source's cache. Shared capacity and other live sources' entries are preserved.

No global Worker/URL prototype is patched by production code and no shared
engine pool is disposed to close an individual viewer. Test harnesses instrument
Worker/URL only to observe ownership. The explicit synchronous laz-perf setup
still uses the pinned engine's public decoder configuration. This maintenance
tradeoff is distinct from the public, typed application escape hatch.

## Detection and routing

### LAS / LAZ / COPC

`.las` and `.laz` are accepted directly. `*.copc.laz` and `.copc` identify COPC;
bounded LAS header/VLR inspection promotes generic LAS/LAZ sources containing
the COPC VLR. Header detection also supports generic downloads without the
expected filename extension.

Remote COPC uses strict byte ranges: HTTP 206, exposed and matching
`Content-Range`, expected body length and identity encoding are checked. Local
COPC uses `File.slice()`. Plain LAS/LAZ uses the derived Giro3D `LASSource` with a
bounded whole-file read controlled by `maxLasBytes`; it is not progressive.

The point-cloud scene CRS must match the dataset CRS. An incompatible scene is
rejected before application hooks; no runtime point-cloud reprojection is
performed. Reproject the dataset beforehand when a different scene is required.

### GeoTIFF / COG versus ordinary TIFF

Installing Geo3D does not take all TIFF files away from the image renderer.
`.tif` / `.tiff` is inspected before final dispatch. The specialist route is
selected only when geographic TIFF metadata is found. Recognized tags include
ModelPixelScale (33550), ModelTiepoint (33922), ModelTransformation (34264),
GeoKeyDirectory (34735), GeoDoubleParams (34736) and GeoAsciiParams (34737).

Inspection reports `isCog`, CRS, bounding box, width, height, bands, tiling and
overviews. COG classification is separate from GeoTIFF detection and uses
structural evidence rather than extension or MIME alone. Incomplete evidence
can yield `unknown`; this heuristic is not an OGC conformance certificate.

Remote COG keeps its original URL in the owned `GeoTIFFSource` factory. Ordinary
TIFF remains on the existing image renderer. TIFF/BigTIFF probes have bounded
IFD, tag and byte budgets and propagate cancellation. Source coordinates retain
their native CRS; a different scene CRS transforms the map extent rather than
relabelling pixels. WGS84 UTM definitions and additional offline WKT/proj strings
through `crsDefinitions` require no online EPSG lookup. Do not use a CRS label
change as a substitute for a coordinate transformation.

### CityJSON and external textures

CityJSON is recognized by `*.city.json`, `.cityjson`, `application/city+json`
or bounded JSON sniffing. Surface/solid geometry is triangulated in the browser
and added as a Three.js object. Transform and EPSG reference system are retained.
Mesh coordinates are relative to an origin stored in the object transform,
preserving precision for projected coordinates. An incompatible CityJSON scene
CRS is rejected instead of silently relabelling coordinates.

Textures are applied to the mesh, not merely exposed as metadata. Geometry rings
and UV pairs stay associated through triangulation, including holes. Selection
uses `textureTheme`, the document's default texture theme, or the first available
theme. A missing requested theme or invalid index/ring mapping is an error.

The supported preview subset accepts PNG/JPEG over HTTP(S) on the **dataset
origin**, with credentials omitted and redirects rejected. That origin may
differ from the viewer origin when CORS permits it. A local File with external
images needs a usable dataset URL; unresolved references are not silently
accepted as textured success.

Texture loading is cancellable and bounded: 64 used textures, 16 MiB per image,
64 MiB total encoded data, 8,192 pixels per side, 16 million pixels per image and
32 million pixels total. Dimensions are checked before decoding. Wrap, mirror,
clamp and none are supported; other modes are rejected. Failure, cancellation
and unmount release owned textures and ImageBitmaps. Advanced appearance
semantics remain outside this subset. Piero is reference material, not a runtime
dependency; the existence of another CityJSON implementation does not establish
that it meets these preview, security and ownership contracts. The rendered
group is exposed through the hook; Piero-style semantic picking and LoD
inspector UI are not part of this preview subset.

### 3D Tiles and 3TZ

The exact basename `tileset.json` is claimed before generic JSON routing; content
sniffing also recognizes 3D Tiles metadata. Remote tilesets retain their original
URL and use locally copied DRACO and Basis decoder paths.

`.3tz` and `*.3dtiles.zip` are bounded whole-file archive inputs. Before exposing
the root `tileset.json`, the extractor checks central/local header agreement,
paths, duplicates, overlaps, encryption, entry counts, expanded sizes and
compression ratios. Actual extraction is bounded and CRC32 is checked. The
browser subset supports stored/DEFLATE entries and rejects unsupported ZIP64,
data-descriptor and other layouts.

Prepared archives use extension-preserving, per-archive virtual URLs for
models/tilesets and a narrow public `fetchData` hook returning validated local
Responses. Buffers/images use owned Blob URLs. There is no remote fallback or
service worker. All archive-owned resources are released on teardown. A file-only
multi-resource tileset without an archive is rejected. Nested tileset/model
arrival wakes the on-demand render loop; its listeners are removed at teardown.

## Optional preprocessing

LAS/LAZ to **COPC** preserves the point-cloud data model. GeoTIFF to **COG**
optimizes raster storage. External PDAL/GDAL tools can perform these operations;
neither is installed or invoked automatically by the renderer.

The repository also includes explicit LAS/LAZ/COPC **Z-to-COG rasterization**:

```sh
python packages/renderers/3d/scripts/preprocess-geo3d.py \
  input.laz elevation.cog.tif --resolution 1 --aggregation mean
```

Use the pinned development-only Python requirements. Resolution is in projected
source CRS units; min/max/mean aggregation must be explicit. This loses
per-point information and is not a lossless conversion, ground classification
or interpolation. Allocation is limited, the source is preserved, unrequested
overwrite is refused and output pixels/CRS/layout are checked. It is not an
automatic conversion inside the browser.

## Fixtures, licenses and verification

### Input regression checks

After building the renderer, run the input checks independently with:

```sh
node --test packages/renderers/3d/scripts/geo3d-inputs.test.mjs
```

They are also included in `verify:geo3d`. They cover a bounded TIFF metadata
probe with 262,144 tile offsets, ordinary TIFF/GeoTIFF/COG routing, relative
source URLs in nested deployments, exact cancellation reasons (including
non-Error values), byte limits, and HTTP range behavior against a local server.
The large TIFF case contains metadata only; the inspector must not request pixel
data. These checks do not replace the real-engine browser and installed-consumer
suites described below.

The built input helpers can also run in Chromium with native File,
ReadableStream, iframe base URLs and Worker APIs, without network access:

```sh
pnpm --filter @file-viewer/renderer-3d verify:geo3d-native-browser
```

This focused browser command requires the normal build output and Playwright.
It loads production modules as data URLs and uses the committed fixture bytes;
it does not replace the renderer or codec with a substitute. On headless Linux,
a virtual display may be needed for SwiftShader/WebGL.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an already installed Chromium;
`GEO3D_NATIVE_BROWSER_OUTPUT` overrides `output/geo3d-native-browser/`.
The screenshot is diagnostic: it shows input test results, **not** a rendered
dataset, and must not satisfy the PR's rendering-evidence requirement. These
checks do not validate HTTP/CORS, LAZ decoding, WASM assets or the full renderer's
offline/private-deployment behavior.


Fixtures are in `test/fixtures/geo3d/`. `probe.copc.laz` is an identifier/VLR
fixture, not a compressed rendering dataset. Real compressed MIT samples live
in `samples-mit/`. The five original binary variants remain in
`samples-mit/original-deliveries/`: 16,384-point COPC, 4,096-point LAS, ordinary
TIFF, striped GeoTIFF and overview COG. Their hashes, manifests and license are
preserved; compact samples are not replacements or production benchmarks.

Run these commands from the repository root with the pinned development
Python requirements and browser dependencies installed:

```sh
pnpm install --frozen-lockfile

python packages/renderers/3d/scripts/restore-geo3d-originals.py \
  --output packages/renderers/3d/test/fixtures/geo3d/samples-mit/original-deliveries \
  --verify-only
python packages/renderers/3d/scripts/verify-geo3d-samples.py --range-smoke
python packages/renderers/3d/scripts/test-geo3d-compressed-samples.py

pnpm test:geo3d-entry
pnpm --filter @file-viewer/renderer-3d verify:geo3d-browser
pnpm build
pnpm type-check
pnpm test
pnpm docs:build
pnpm verify:github-governance
```

The browser command runs the workspace dataset/concurrency suites and then packs
built output for a clean installed consumer. It needs npm registry access for
that installation; runtime browser requests remain limited to local test origins.
The consumer receives no source files or generator scripts, uses a retained npm
lockfile and repeats the dataset, concurrency/abort, non-cooperative hook,
advanced API, CRS, memory, elevation/no-data and PNTS classification suites.
Its module graph rejects runtime code resolved from the workspace. Build tools,
test instrumentation and input fixtures may still come from the checkout.

Browser reports and screenshots are generated under `output/geo3d-browser/`;
installed-consumer logs and package evidence are under
`output/geo3d-focused/installed-consumer/`. Keep generated results outside the
source change set. Resource cleanup, cache retention and visual classification
checks must remain enabled; test results apply only to the revision executed.

Giro3D and Three.js are MIT; JSZip is the optional archive peer. The asset copier
preserves licenses, NOTICE and manifests, including retained decoder notices.
Dataset redistribution is evaluated separately from example-code licensing.
Focused checks do not replace the repository-wide build, type-check, tests,
core/component integration, documentation, governance and demo-browser checks.
The larger synthetic workloads measure heap and cache behavior over repeated
open/close cycles; they do not certify an indefinitely flat JavaScript heap or
production-scale performance.
