/// <reference lib="webworker" />

import { installIllustratorWorker } from 'illustrator-pgf/worker-runtime'
import { decodeIllustratorZstd } from './illustrator-zstd'

installIllustratorWorker(self, { zstdDecoder: decodeIllustratorZstd })
