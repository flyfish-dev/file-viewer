import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PptxViewer } from '../packages/renderers/pptx/src/viewer';

class TestWorker extends EventTarget {
  static current: TestWorker;

  constructor() {
    super();
    TestWorker.current = this;
  }

  postMessage() {}
  terminate() {}
}

afterEach(() => vi.unstubAllGlobals());

describe('@file-viewer/pptx zoom', () => {
  it('applies each requested percentage before the zoom promise settles', async () => {
    const { window } = new JSDOM('<main id="target"></main>', { url: 'https://example.test/' });
    const target = window.document.getElementById('target')!;
    Object.defineProperty(target, 'clientWidth', { value: 800 });
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    window.requestAnimationFrame = callback => {
      frames.set(++frameId, callback);
      return frameId;
    };
    window.cancelAnimationFrame = id => { frames.delete(id); };
    const flushFrames = () => {
      const scheduled = [...frames.values()];
      frames.clear();
      scheduled.forEach(callback => callback(0));
    };
    vi.stubGlobal('Worker', TestWorker);
    vi.stubGlobal('Document', window.Document);
    const viewer = await PptxViewer.open(new ArrayBuffer(1), target, {
      fitMode: 'contain',
      workerUrl: '/pptx.worker.js',
    });

    try {
      TestWorker.current.dispatchEvent(new MessageEvent('message', {
        data: { type: 'slideSize', data: { width: 1000, height: 600 } },
      }));
      viewer.refreshLayout();
      flushFrames();
      expect(viewer.zoomPercent).toBe(80);

      for (const percent of [95, 110, 95, 100]) {
        await viewer.setZoom(percent);
        expect(viewer.zoomPercent).toBe(percent);
        expect(Number(viewer.content.style.transform.slice('scale('.length, -1))).toBeCloseTo(percent / 100);
      }
      flushFrames();
      expect(viewer.zoomPercent).toBe(100);
    } finally {
      viewer.destroy();
      window.close();
    }
  });
});
