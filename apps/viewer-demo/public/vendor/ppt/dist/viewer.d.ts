import type { PptViewer, ViewerOptions } from './types.js';
/** A viewer retains one slide DOM; assets are materialized lazily and owned per instance. */
export declare function createPptViewer(container: HTMLElement, options?: ViewerOptions): PptViewer;
