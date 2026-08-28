#!/usr/bin/env node
import { runFileViewerBootstrap } from './bootstrap.js';

runFileViewerBootstrap().then(status => {
  process.exitCode = status;
}).catch(error => {
  process.stderr.write(`[create-file-viewer] ${(error as Error).message}\n`);
  process.exitCode = 1;
});
