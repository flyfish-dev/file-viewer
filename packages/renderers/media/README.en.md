# @file-viewer/renderer-media

Base audio and video renderer package for Flyfish File Viewer. It provides browser-native media playback by default. HLS fallback and MIDI inspection are enabled explicitly by `@file-viewer/capability-streaming-media` and `@file-viewer/capability-midi`; neither enters the standard/full default closure.

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
- With the streaming-media capability installed, HLS `.m3u8` uses native playback first and loads `hls.js` only as a fallback.
- With the MIDI capability installed, MIDI / MID loads `@tonejs/midi` and renders name, duration, PPQ, tracks, and note summaries.
- Unmount cleanup revokes object URLs, resets media elements, and destroys the HLS instance for long-lived business applications.

## Migration Note

`@file-viewer/core` does not bundle media renderers. Standard installs only this package's native media path. Opening `.m3u8`, `.midi`, or `.mid` without its capability shows the exact `npx file-viewer-cli add ...` command. `preset-all` is reserved for explicit all/debug use and registers both optional capabilities.
