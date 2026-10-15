import {fileURLToPath} from 'node:url';
export default {root:fileURLToPath(new URL('../',import.meta.url)),server:{host:'127.0.0.1',port:43141,strictPort:true},resolve:{dedupe:['@file-viewer/core']}};
