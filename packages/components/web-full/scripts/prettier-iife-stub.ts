// Published by the web-full IIFE build in place of every Prettier entry point.
//
// The legacy full packages ship a frozen capability contract, so the script-tag bundle
// must not grow by megabytes of optional parser code. Loading this stub rejects the
// lazy Prettier import, and the text renderer then reports `prettyPrint: 'failed'` and
// keeps previewing the original source bytes.
export const FILE_VIEWER_PRETTY_PRINT_IIFE_UNAVAILABLE = true

throw new Error(
  '@file-viewer/web-full does not bundle Prettier; use the ESM packages for text.prettyPrint.'
)
