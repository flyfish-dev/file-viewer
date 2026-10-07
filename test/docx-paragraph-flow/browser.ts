import * as docx from '@file-viewer/docx';
import {renderFileViewerWordDoc} from '../../packages/renderers/word/src/index.js';
// Tests expose the actual bundled class; no substitute pagination methods.
Object.assign(globalThis,{paragraphFlow:{docx,renderFileViewerWordDoc,createHelper:()=>Object.create((globalThis as any).__flowReviewClass.prototype)}});
