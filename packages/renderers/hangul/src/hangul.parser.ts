// Bundled as an ES2017 parser-only fallback so legacy bundlers never need to
// parse modern syntax from HWP/HWPX dependencies during an ordinary build.
export { parseHangulDocument } from './parser.js';
