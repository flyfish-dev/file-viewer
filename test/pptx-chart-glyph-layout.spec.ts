import { describe, expect, it, vi } from 'vitest';
import { createPptxAxisLayout } from '../packages/renderers/pptx/src/chart-axis-layout';

function fixture(config: Record<string, unknown> = {}) {
  const timers = new Map<number, () => void>(), frames = new Map<number, () => void>();
  let sequence = 0;
  let resizeCallback: (entries: Array<{ target: unknown; contentRect: { width: number; height: number } }>) => void = () => {};
  const observer = { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  const matrix: any = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    inverse() { return this; }, multiply() { return this; } };
  const view = {
    ResizeObserver: vi.fn(function (callback: typeof resizeCallback) { resizeCallback = callback; return observer; }),
    getComputedStyle: () => ({ visibility: 'visible', font: '22px serif', clipPath: 'none' }),
    setTimeout: vi.fn((cb: () => void) => { timers.set(++sequence, cb); return sequence; }),
    clearTimeout: (id: number) => timers.delete(id),
    requestAnimationFrame: (cb: () => void) => { frames.set(++sequence, cb); return sequence; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  };
  const svg = { getBoundingClientRect: () => ({ width: 200 }), getScreenCTM: () => matrix, querySelectorAll: () => [] };
  const node: any = { textContent: '完整的 Mixed label', getScreenCTM: () => matrix,
    getBBox: () => ({ x: 180, y: 20, width: 80, height: 22 }) };
  const surface: any = { dataset: {}, ownerDocument: { defaultView: view },
    querySelector: (selector: string) => selector === 'svg' ? svg : null,
    querySelectorAll: (selector: string) => selector.includes('axis-y') ? [] : [node] };
  node.parentElement = surface;
  const padding = vi.fn(() => 30), max = vi.fn(() => ({ width: 10, height: 10, ticks: [10] }));
  const internal: any = { config, axis: { getMaxTickSize: max }, getCurrentPaddingByDirection: padding,
    state: { current: { width: 200, height: 200 }, width: 170, height: 170 }, api: { flush: vi.fn() } };
  const adapter = createPptxAxisLayout(surface); adapter.init(internal);
  const step = () => {
    for (const [id, cb] of [...timers]) { timers.delete(id); cb(); }
    for (const [id, cb] of [...frames]) { frames.delete(id); cb(); }
  };
  return { adapter, internal, surface, node, view, padding, max, timers, frames, step, observer,
    resize: () => resizeCallback([{ target: node, contentRect: node.getBBox() }]) };
}

describe('PPTX complete-glyph layout adapter', () => {
  it('keeps explicit padding and height and diagnoses an unsatisfied frame', () => {
    const f = fixture({ padding_right: 5, axis_x_height: 12, axis_y_min: 0, axis_y_max: 100 });
    f.step();
    expect(f.surface.dataset.pptxChartLayoutStatus).toBe('explicit-space-overflow');
    expect(f.internal.api.flush).not.toHaveBeenCalled();
    expect(f.internal.getCurrentPaddingByDirection('right')).toBe(30);
    expect(f.internal.config).toEqual({ padding_right: 5, axis_x_height: 12, axis_y_min: 0, axis_y_max: 100 });
    expect(f.node.textContent).toBe('完整的 Mixed label'); f.adapter.destroy();
  });
  it('uses complete rendered widths and caps non-converging layout work', () => {
    const f = fixture();
    for (let i = 0; i < 8; i++) { f.step(); f.adapter.redraw(0, true); }
    for (let i = 0; i < 4; i++) f.step();
    expect(f.internal.axis.getMaxTickSize('x')).toEqual({ width: 80, height: 22, ticks: [80] });
    expect(f.internal.api.flush).toHaveBeenCalledTimes(8);
    expect(f.surface.dataset.pptxChartLayoutStatus).toBe('layout-limit');
    expect(f.timers.size + f.frames.size).toBe(0); f.adapter.destroy();
  });
  it('exits immediately when the remaining plot cannot accommodate the glyph', () => {
    const f = fixture(); f.internal.state.width = 20; f.step();
    expect(f.surface.dataset.pptxChartLayoutStatus).toBe('insufficient-space');
    expect(f.internal.api.flush).not.toHaveBeenCalled(); f.adapter.destroy();
  });
  it('restores only its own per-chart hooks and cancels pending work on repeated destroy', () => {
    const f = fixture(); f.adapter.redraw(350); f.adapter.redraw(0);
    expect(f.timers.size).toBe(1); f.adapter.destroy(); f.adapter.destroy();
    expect(f.timers.size + f.frames.size).toBe(0);
    expect(f.internal.getCurrentPaddingByDirection).toBe(f.padding);
    expect(f.internal.axis.getMaxTickSize).toBe(f.max);
    expect(f.surface.dataset.pptxChartLayoutStatus).toBeUndefined();
    expect(f.observer.disconnect).toHaveBeenCalled(); f.resize(); expect(f.timers.size).toBe(0);
  });
  it('observes real glyph-size changes once and ignores unchanged observer deliveries', () => {
    const f = fixture({ padding_right: 5 }); f.step();
    expect(f.observer.observe).toHaveBeenCalledWith(f.node);
    f.resize(); f.step(); expect(f.timers.size).toBe(0);
    f.node.getBBox = () => ({ x: 180, y: 20, width: 95, height: 22 });
    f.resize(); expect(f.timers.size).toBe(1);
    const calls = f.view.setTimeout.mock.calls.length;
    f.node.getBBox = () => ({ x: 180, y: 20, width: 95.000001, height: 22 });
    f.resize(); expect(f.timers.size).toBe(1); expect(f.view.setTimeout.mock.calls.length).toBe(calls);
    f.adapter.destroy(); f.resize();
    expect(f.timers.size + f.frames.size).toBe(0);
  });
  it('does not mistake an internally regenerated numeric tick for a font change', () => {
    const f = fixture({ padding_right: 5 }); f.step();
    f.node.textContent = '10'; f.node.getBBox = () => ({ x: 180, y: 20, width: 24, height: 22 });
    f.resize(); f.step(); expect(f.timers.size).toBe(0);
    f.node.getBBox = () => ({ x: 180, y: 20, width: 27, height: 22 });
    f.resize(); expect(f.timers.size).toBe(1); f.adapter.destroy();
  });
  it.each([1, -1])('accumulates 192 one-unit WebKit metric steps from the last accepted baseline (%i)', direction => {
    const f = fixture({ padding_right: 5 }); f.step(); f.resize(); f.step();
    const start = f.view.setTimeout.mock.calls.length;
    for (let step = 1; step <= 192; step++) {
      f.node.getBBox = () => ({ x: 180, y: 20, width: 80 + direction * step / 64, height: 22 });
      f.resize();
      // Two ignored deliveries must not overwrite the accepted baseline:
      // the third 1/64px step exceeds 1/32px even though each step does not.
      expect(f.timers.size, `direction ${direction}, step ${step}`).toBe(step % 3 === 0 ? 1 : 0);
      f.step();
    }
    expect(f.view.setTimeout.mock.calls.length - start).toBe(64);
    f.adapter.destroy();
  });
  it('does not schedule work for 240 alternating one-unit WebKit metric deliveries', () => {
    const f = fixture({ padding_right: 5 }); f.step(); f.resize(); f.step();
    const start = f.view.setTimeout.mock.calls.length;
    for (let step = 0; step < 240; step++) {
      f.node.getBBox = () => ({ x: 180, y: 20, width: 80 + (step % 2) / 64, height: 22 });
      f.resize(); expect(f.timers.size + f.frames.size).toBe(0);
    }
    expect(f.view.setTimeout.mock.calls.length).toBe(start);
    f.adapter.destroy();
  });
  it('rechecks a font that completed before the first observer delivery', () => {
    const f = fixture({ padding_right: 5 }); f.step();
    f.node.getBBox = () => ({ x: 180, y: 20, width: 95, height: 22 });
    f.resize(); expect(f.timers.size).toBe(1); f.step();
    expect(f.internal.axis.getMaxTickSize('x').width).toBe(95); f.adapter.destroy();
  });
});
