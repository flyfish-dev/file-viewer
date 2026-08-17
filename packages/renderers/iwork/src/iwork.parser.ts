// This entry is bundled by scripts/build-worker.mjs. Keeping parser-only
// dependencies behind this chunk prevents legacy bundlers from parsing modern
// syntax in third-party Protobuf output during an ordinary office build.
export {
  inspectIworkContainer,
  parseIworkDocument,
} from './parser.js';
