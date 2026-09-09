import type * as MapLibre from 'maplibre-gl';
import { maplibreWorkerSource } from './maplibre-worker-source.js';

let workerUrl: string | undefined;

export function configureMapLibreWorker(maplibre: typeof MapLibre): void {
  // The shared pool can outlive an individual map. Keep one URL for this module's lifetime.
  // Like the previous inline worker, this needs no CDN or bundler-specific asset relocation.
  workerUrl ??= URL.createObjectURL(new Blob([maplibreWorkerSource], { type: 'text/javascript' }));
  maplibre.setWorkerUrl(workerUrl);
}
