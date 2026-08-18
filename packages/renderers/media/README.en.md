# @file-viewer/renderer-media

Standalone audio and video renderer package for Flyfish File Viewer. It previews audio files, videos, HLS playlists, and MIDI files in the browser while loading `hls.js` and `@tonejs/midi` only for the formats that need them.

## Usage

```ts
import { mediaRenderer } from '@file-viewer/renderer-media'

const options = {
  builtinRenderers: 'none',
  renderers: [mediaRenderer],
}
```

Or compose it through the full preset:

```ts
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  builtinRenderers: 'none',
  renderers: allRenderers,
}
```

## Features

- MP4, WebM, and common audio formats use native browser `<video>` / `<audio>` controls first.
- The renderer inspects MP4 video tracks before playback. If the browser rejects an MPEG-4 Part 2 (`mp4v`) Simple Profile track, it starts a dedicated Worker, uses the AAC track as the playback clock, and draws software-decoded I420 frames to a Canvas. This fixes the case where audio plays over a black frame.
- The fallback uses the Apache-2.0 AOSP PacketVideo decoder. Its WASM file is 111,379 bytes, or 34,410 bytes with gzip, and loads only after native decoding fails. The implementation contains no FFmpeg, libav, or LGPL/GPL/AGPL source.
- Files outside the decoder's current coverage, and browsers without Worker, OffscreenCanvas, or VideoFrame support, get a codec compatibility notice. H.264/AVC still uses less CPU and works in more browsers.
- HLS `.m3u8` uses native playback when available and dynamically imports `hls.js` only as a fallback.
- MIDI / MID dynamically imports `@tonejs/midi` only when opened, then renders name, duration, PPQ, tracks, and note summaries.
- Unmount cleanup revokes object URLs, resets media elements, and destroys the HLS instance for long-lived business applications.

## Migration Note

`@file-viewer/core` no longer bundles media renderers and no longer depends directly on `hls.js` or `@tonejs/midi`. Install this package explicitly for audio, video, HLS, or MIDI preview, or use `@file-viewer/preset-all`, which aggregates this renderer automatically.
