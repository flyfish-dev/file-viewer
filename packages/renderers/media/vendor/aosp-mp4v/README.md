# MP4V software decoder boundary

This directory builds only the Android Open Source Project PacketVideo MPEG-4 Part 2 decoder at the exact commit recorded in `SOURCE.json`.

- Decoder source: Apache-2.0.
- Emscripten compiler/runtime: MIT or University of Illinois/NCSA.
- FFmpeg, libav, Xvid, `web-demuxer`, and any LGPL/GPL/AGPL source are not used.
- The runtime is loaded only when an MP4 declares an `mp4v` video track and native browser decoding fails.
- The committed `.wasm` and ESM loader are copied into package `dist/vendor/mp4v` during the normal package build.

Regenerate the checked runtime with `pnpm build:mp4v-decoder`. The build downloads one checksum-pinned AOSP subdirectory archive and rejects a source or license mismatch before invoking Emscripten.
