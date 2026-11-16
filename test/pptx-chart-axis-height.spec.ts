import { describe, expect, it, vi } from 'vitest';
import { createPptxChartTextPlugin } from '../packages/renderers/pptx/src/chart-text';

function fixture() {
  const frames = new Map<number, () => void>();
  let sequence = 0;
  const view = {
    requestAnimationFrame: vi.fn((callback: () => void) => { frames.set(++sequence, callback); return sequence; }),
    cancelAnimationFrame: vi.fn((id: number) => { frames.delete(id); }),
  };
  const fonts = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const surface = { ownerDocument: { defaultView: view, fonts }, appendChild() {} } as unknown as HTMLElement;
  const plugin = createPptxChartTextPlugin(surface)!;
  let box = { x: -40, y: 4, width: 80, height: 28.54 };
  let orientation = 'bottom';
  const tick = { getBBox: () => box, transform: { baseVal: { consolidate: () => ({ matrix: { b: 0, d: 1, f: 0 } }) } } };
  const originalHeight = vi.fn(() => 30), originalRect = vi.fn();
  const internal: any = {
    config: { axis_y_min: 0, axis_y_max: 100, axis_y_padding: { top: 0, bottom: 0 } },
    getHorizontalAxisHeight: originalHeight, getTextRect: originalRect,
    $el: { axis: { x: { node: () => ({ querySelectorAll: () => [tick] }) } } },
    axis: { x: { orient: () => orientation } }, api: { flush: vi.fn() },
  };
  plugin.$$ = internal;
  plugin.$beforeInit();
  const frame = () => { const [id, callback] = [...frames][0]; frames.delete(id); callback(); };
  return { plugin, internal, fonts, frames, frame, view, originalHeight, originalRect,
    setBox: (value: typeof box) => { box = value; }, setOrientation: (value: string) => { orientation = value; } };
}

describe('PPTX per-chart horizontal axis geometry', () => {
  it('preserves the library layout for deleted x and rotated y axes with retained ticks', () => {
    const f = fixture();
    f.internal.config.axis_x_show = false;f.originalHeight.mockReturnValue(8);
    expect(f.internal.getHorizontalAxisHeight('x')).toBe(8);
    f.internal.config.axis_rotated = true;f.internal.config.axis_y_show = false;
    f.internal.$el.axis.y = f.internal.$el.axis.x;f.internal.axis.y = f.internal.axis.x;
    f.originalHeight.mockReturnValue(1);
    expect(f.internal.getHorizontalAxisHeight('y')).toBe(1);
    f.plugin.$willDestroy();
  });
  it('reserves local glyph extent while preserving explicit height and numeric bounds', () => {
    const f = fixture();
    expect(f.internal.getHorizontalAxisHeight('x')).toBe(33);
    f.internal.config.axis_x_height = 20;
    expect(f.internal.getHorizontalAxisHeight('x')).toBe(30); // Original method remains authoritative.
    delete f.internal.config.axis_x_height;
    f.setOrientation('top');f.setBox({ x: 0, y: -42.5, width: 80, height: 28 });
    expect(f.internal.getHorizontalAxisHeight('x')).toBe(43);
    f.setOrientation('left');
    expect(f.internal.getHorizontalAxisHeight('x')).toBe(30);
    expect(f.internal.config).toEqual({ axis_y_min: 0, axis_y_max: 100, axis_y_padding: { top: 0, bottom: 0 } });
    f.plugin.$willDestroy();
  });
  it('settles hidden-to-visible changes once without recursively scheduling redraws', () => {
    const f = fixture();f.setBox({ x: 0, y: 0, width: 0, height: 0 });
    expect(f.internal.getHorizontalAxisHeight('x')).toBe(30);
    f.setBox({ x: 0, y: 4, width: 80, height: 28.54 });
    f.internal.api.flush.mockImplementation(() => { f.internal.getHorizontalAxisHeight('x'); f.plugin.$redraw(); });
    f.plugin.$afterInit();f.plugin.$redraw();
    expect(f.frames.size).toBe(1);f.frame();
    expect(f.internal.api.flush).toHaveBeenCalledTimes(1);expect(f.frames.size).toBe(0);
    f.plugin.$redraw();f.frame();
    expect(f.internal.api.flush).toHaveBeenCalledTimes(1);
    f.plugin.$willDestroy();
  });
  it('restores hooks, removes font listeners and cancels pending layout on repeated teardown', () => {
    const f = fixture();f.internal.getHorizontalAxisHeight('x');f.plugin.$afterInit();
    expect(f.plugin.evalTextSize(null)).toEqual({ w: 0, h: 0 });
    expect(f.frames.size).toBe(1);
    const listener = f.fonts.addEventListener.mock.calls[0][1];
    listener();expect(f.internal.api.flush).toHaveBeenCalledTimes(1);
    f.plugin.$willDestroy();f.plugin.$willDestroy();listener();
    expect(f.plugin.evalTextSize({} as SVGTextElement)).toEqual({ w: 0, h: 0 });
    expect(f.internal.api.flush).toHaveBeenCalledTimes(1);
    expect(f.frames.size).toBe(0);expect(f.internal.getHorizontalAxisHeight).toBe(f.originalHeight);
    expect(f.internal.getTextRect).toBe(f.originalRect);
    expect(f.fonts.removeEventListener).toHaveBeenCalledWith('loadingdone', listener);
  });
});
