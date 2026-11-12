type Bounds = { left: number; right: number; top: number; bottom: number };
const sides = ['left', 'right', 'top', 'bottom'] as const;
const emptySpace = () => ({ left: 0, right: 0, top: 0, bottom: 0 });

/** SVG geometry in an ancestor's logical coordinates, never slide/screen pixels. */
const localBounds = (node: SVGGraphicsElement, owner: SVGGraphicsElement): Bounds | undefined => {
  try {
    const box = node.getBBox(), from = node.getScreenCTM(), to = owner.getScreenCTM();
    if (!from || !to || !box.height) return;
    const matrix = to.inverse().multiply(from);
    const points = [box.x, box.x + box.width].flatMap(x => [box.y, box.y + box.height]
      .map(y => ({ x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f })));
    const result = { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
      top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
    if (Object.values(result).every(Number.isFinite)) return result;
  } catch { /* Detached/hidden SVGs may have no invertible geometry. */ }
};

/** Per-chart correction for complete glyphs, including rotated mixed-script ticks. */
export const createPptxAxisLayout = (surface: HTMLElement) => {
  const view = surface.ownerDocument.defaultView!;
  let internal: any, originalPadding: any, wrappedPadding: any, originalMax: any, wrappedMax: any;
  let frame = 0, timer = 0, deadline = 0, stopped = false, flushing = false, passes = 0, inputKey = '', fitKey = '', observations = 0;
  const extra = emptySpace();
  const measured = new Map<string, { width: number; height: number; ticks: number[] }>();
  const observed = new Map<SVGTextElement, { width?: number; height?: number; text: string | null }>();
  // FontFaceSet loadingdone is not emitted for every real font-load path in
  // WebKit. SVG text ResizeObserver supplies the actual glyph change instead.
  const observer = view.ResizeObserver ? new view.ResizeObserver(entries => {
    let changed = false, firstDelivery = false;
    for (const { target, contentRect } of entries) {
      const node = target as SVGTextElement;
      // Compare observer deliveries with observer deliveries, not a synchronous
      // getBBox read taken in a different SVG/layout phase (not equivalent in
      // WebKit under a scaled presentation). Never force layout in the callback.
      const previous = observed.get(node);
      if (contentRect.height && previous) {
        // Axis tick generation can reuse a text node for a different numeric
        // label after a resize. That is part of the current redraw, not a new
        // font load, and must not reset the settling budget/space reservations.
        const first = previous.width === undefined;
        firstDelivery ||= first;
        // WebKit quantizes SVG font boxes to 1/64px and can alternate one unit
        // after repositioning. Ignore that observer noise, not glyph bounds:
        // surface/clip/legend containment still uses complete unrounded boxes.
        const resized = first || Math.abs(previous.width! - contentRect.width) > 1 / 32
          || Math.abs(previous.height! - contentRect.height) > 1 / 32;
        changed ||= !first && previous.text === node.textContent && resized;
        if (resized || previous.text !== node.textContent) observed.set(node,
          { width: contentRect.width, height: contentRect.height, text: node.textContent });
      }
    }
    if ((!changed && !firstDelivery) || stopped) return;
    if (!changed) {
      // A font can complete before the first observer delivery. Re-measure once
      // rather than treating that first delivery as proof nothing changed.
      if (!timer && !frame) schedule(Number(internal?.config.transition_duration) || 0, false);
      return;
    }
    const external = surface.dataset.pptxChartLayoutStatus !== 'pending';
    if (external) { Object.assign(extra, emptySpace()); measured.clear(); inputKey = fitKey = ''; }
    // Do not keep postponing an already scheduled pass during layout changes.
    if (external || (!timer && !frame)) schedule(Number(internal?.config.transition_duration) || 0, external);
  }) : undefined;
  const visible = (node: SVGGraphicsElement) => view.getComputedStyle(node).visibility !== 'hidden';
  const diagnostic = (status: string, overflow = emptySpace()) => {
    surface.dataset.pptxChartLayoutStatus = status;
    surface.dataset.pptxChartLayoutDiagnostic = JSON.stringify({ passes, observations, overflow });
  };
  const canReserve = (side: typeof sides[number]) => {
    if (Number.isFinite(internal.config[`padding_${side}`]) || internal.config.padding === false) return false;
    const id = side === 'bottom' ? (internal.config.axis_rotated ? 'y' : 'x')
      : side === 'top' && internal.config.axis_rotated ? 'y2' : undefined;
    return !id || !Number.isFinite(internal.config[`axis_${id}_height`]);
  };
  const ticks = () => [...surface.querySelectorAll<SVGTextElement>('.bb-axis .tick text')].filter(visible);
  const updateMeasurements = () => {
    let changed = false;
    const live = new Set(surface.querySelectorAll<SVGTextElement>('.bb-axis .tick text'));
    for (const node of observed.keys()) if (!live.has(node)) { observer?.unobserve(node); observed.delete(node); }
    for (const node of live) {
      if (!observed.has(node)) {
        observed.set(node, { text: node.textContent });
        observer?.observe(node);
      }
    }
    for (const id of ['x', 'y', 'y2']) {
      if (internal.config[`axis_${id}_show`] === false) continue;
      const nodes = [...surface.querySelectorAll<SVGTextElement>(`.bb-axis-${id} .tick text`)];
      const boxes = nodes.map(node => { try { return node.getBBox(); } catch { return undefined; } });
      if (!boxes.length || boxes.some(box => !box?.height)) continue;
      // These are the complete formatted strings/tspans, not length * width('0').
      // Keep the library's unrotated max-size contract; the layout pass below
      // separately measures every actual rotation and tick anchor.
      const next = { width: Math.max(...boxes.map(box => box!.width)),
        height: Math.max(...boxes.map(box => box!.height)), ticks: boxes.map(box => box!.width) };
      const previous = measured.get(id);
      const fingerprint = (value: typeof next) => JSON.stringify(value, (_key, n) => typeof n === 'number' ? Math.round(n * 100) : n);
      changed ||= !previous || fingerprint(previous) !== fingerprint(next);
      measured.set(id, next);
    }
    return changed;
  };
  const containClips = (svg: SVGSVGElement) => {
    const records = new Map<SVGRectElement, { bounds: Bounds; owner: SVGGraphicsElement; axis: boolean }>();
    for (const node of surface.querySelectorAll<SVGTextElement>('.bb-axis text')) {
      if (!visible(node)) continue;
      for (let owner: Element | null = node; owner && owner !== surface; owner = owner.parentElement) {
        const id = /#([^"')]+)["']?\)/.exec(view.getComputedStyle(owner).clipPath || '')?.[1];
        const clip = id && [...svg.querySelectorAll<SVGClipPathElement>('clipPath')].find(value => value.id === id)?.querySelector('rect');
        if (!clip || !(owner as SVGGraphicsElement).getScreenCTM) continue;
        const box = localBounds(node, owner as SVGGraphicsElement);
        if (!box) continue;
        let record = records.get(clip);
        if (!record) {
          const old = clip.getBBox();
          record = { bounds: { left: old.x, right: old.x + old.width, top: old.y, bottom: old.y + old.height },
            owner: owner as SVGGraphicsElement, axis: owner.classList.contains('bb-axis') };
          records.set(clip, record);
        }
        record.bounds.left = Math.min(record.bounds.left, box.left);
        record.bounds.top = Math.min(record.bounds.top, box.top);
        record.bounds.right = Math.max(record.bounds.right, box.right);
        record.bounds.bottom = Math.max(record.bounds.bottom, box.bottom);
      }
    }
    for (const [clip, { bounds, owner, axis }] of records) {
      if (axis) {
        // Ancestor axis clips always remain inside the authored chart surface.
        const transform = owner.getScreenCTM()?.inverse().multiply(svg.getScreenCTM()!);
        if (!transform) continue;
        const corners = [0, internal.state.current.width].flatMap(x => [0, internal.state.current.height]
          .map(y => ({ x: transform.a * x + transform.c * y + transform.e, y: transform.b * x + transform.d * y + transform.f })));
        bounds.left = Math.max(bounds.left, Math.min(...corners.map(p => p.x)));
        bounds.right = Math.min(bounds.right, Math.max(...corners.map(p => p.x)));
        bounds.top = Math.max(bounds.top, Math.min(...corners.map(p => p.y)));
        bounds.bottom = Math.min(bounds.bottom, Math.max(...corners.map(p => p.y)));
      }
      clip.setAttribute('x', String(bounds.left)); clip.setAttribute('y', String(bounds.top));
      clip.setAttribute('width', String(Math.max(0, bounds.right - bounds.left)));
      clip.setAttribute('height', String(Math.max(0, bounds.bottom - bounds.top)));
    }
  };
  const measure = () => {
    frame = 0;
    if (stopped || !internal) return;
    observations++;
    const svg = surface.querySelector<SVGSVGElement>('svg');
    if (!svg || !svg.getBoundingClientRect().width) { diagnostic('hidden'); return; }
    const key = JSON.stringify([internal.state.current.width, internal.state.current.height,
      internal.config.padding, internal.config.axis_rotated, internal.config.legend_show, internal.config.legend_position,
      sides.map(side => internal.config[`padding_${side}`]),
      ['x', 'y', 'y2'].map(id => [internal.config[`axis_${id}_show`], internal.config[`axis_${id}_height`], internal.config[`axis_${id}_tick_rotate`]]),
      internal.config.axis_x_categories,
      ['x', 'y', 'y2'].map(id => {
        const node = surface.querySelector<SVGTextElement>(`.bb-axis-${id} text`);
        return node ? view.getComputedStyle(node).font : '';
      })]);
    if (inputKey && key !== inputKey && Object.values(extra).some(value => value > 0)) {
      // Reclaim previously reserved space when authored input, size or fonts
      // change. Internal settling does not change this fingerprint.
      if (passes >= 8 || observations >= 16) { containClips(svg); diagnostic('layout-limit'); return; }
      passes++; inputKey = key; Object.assign(extra, emptySpace()); measured.clear();
      flushing = true;
      try { internal.api.flush(); } finally { flushing = false; }
      schedule(Number(internal.config.transition_duration) || 0, false);
      return;
    }
    inputKey = key;
    const changed = updateMeasurements(), overflow = emptySpace();
    const legend = surface.querySelector<SVGGraphicsElement>('.bb-legend');
    const legendBox = legend && internal.config.legend_show && !internal.state.isLegendInset ? localBounds(legend, svg) : undefined;
    const glyphs: Bounds[] = [];
    for (const node of ticks()) {
      const box = localBounds(node, svg);
      if (!box) continue;
      glyphs.push(box);
      overflow.left = Math.max(overflow.left, -box.left);
      overflow.right = Math.max(overflow.right, box.right - internal.state.current.width);
      overflow.top = Math.max(overflow.top, -box.top);
      overflow.bottom = Math.max(overflow.bottom, box.bottom - internal.state.current.height);
      if (legendBox && box.right > legendBox.left && box.left < legendBox.right && box.top < legendBox.bottom && box.bottom > legendBox.top) {
        const side = internal.state.isLegendRight ? 'right' : 'bottom';
        overflow[side] = Math.max(overflow[side], side === 'right' ? box.right - legendBox.left : box.bottom - legendBox.top);
      }
    }
    const outside = sides.filter(side => overflow[side] > 0.1);
    const blocked = outside.some(side => !canReserve(side));
    const next = { ...extra };
    for (const side of outside) if (canReserve(side)) next[side] += Math.ceil(overflow[side]);
    // Finite, monotonic reservations. An impossible authored frame never causes
    // endless redraws, reduced fonts, omitted labels or rewritten explicit values.
    const impossible = internal.state.width - (next.left - extra.left) - (next.right - extra.right) <= 0
      || internal.state.height - (next.top - extra.top) - (next.bottom - extra.bottom) <= 0;
    if ((changed || outside.length) && !blocked && !impossible && passes < 8 && observations < 16) {
      fitKey = '';
      Object.assign(extra, next); passes++;
      flushing = true;
      try { internal.api.flush(); } finally { flushing = false; }
      // Axis transitions are disabled by hard flush, but Billboard's legend
      // layout can still animate independently. Wait for that same chart's
      // configured duration before using its obstacle rectangle.
      schedule(Number(internal.config.transition_duration) || 0, false);
      return;
    }
    // WebKit may publish FontFaceSet readiness before its SVG text geometry has
    // finished settling. Require two matching complete observations, not merely
    // the loadingdone event or one apparently fitting intermediate rectangle.
    const geometry = JSON.stringify([legendBox, glyphs], (_key, value) =>
      typeof value === 'number' ? Math.round(value * 100) / 100 : value);
    if (!outside.length && fitKey !== geometry && observations < 16) {
      fitKey = geometry;
      schedule(Number(internal.config.transition_duration) || 0, false);
      return;
    }
    containClips(svg);
    diagnostic(outside.length ? (blocked ? 'explicit-space-overflow' : impossible ? 'insufficient-space' : 'layout-limit')
      : fitKey === geometry ? 'contained' : 'layout-limit', overflow);
  };
  const schedule = (duration = 0, external = true) => {
    if (stopped || flushing || !internal || !view.requestAnimationFrame) return;
    if (external) { passes = 0; observations = 0; fitKey = ''; }
    diagnostic('pending');
    // A synchronous corrective flush must not shorten an in-flight animation's
    // settlement window (the legend can still be finishing its initial move).
    deadline = Math.max(deadline, Date.now() + Math.max(0, duration));
    if (timer) view.clearTimeout(timer);
    if (frame) view.cancelAnimationFrame(frame);
    timer = view.setTimeout(() => { timer = 0; deadline = 0; frame = view.requestAnimationFrame(measure); }, Math.max(0, deadline - Date.now()));
  };
  return {
    init(value: any) {
      if (!value?.axis || typeof value.getCurrentPaddingByDirection !== 'function' || !surface.querySelectorAll) return;
      internal = value;
      originalPadding = internal.getCurrentPaddingByDirection;
      wrappedPadding = function (this: any, side: typeof sides[number], ...args: any[]) {
        // Replace the library's character-count/rotation overflow estimate with
        // actual glyph constraints once they are available; retain axis/legend
        // base reservations and every explicit padding value.
        if (side === 'right' && measured.has('x') && canReserve(side)) args[1] = false;
        return originalPadding.call(this, side, ...args) + (canReserve(side) ? extra[side] || 0 : 0);
      };
      internal.getCurrentPaddingByDirection = wrappedPadding;
      originalMax = internal.axis.getMaxTickSize;
      wrappedMax = function (this: any, id: string, ...args: any[]) {
        const result = originalMax.call(this, id, ...args), exact = measured.get(id);
        if (!exact || internal.config[`axis_${id}_show`] === false) return result;
        return Object.assign(result, { width: exact.width, height: exact.height,
          ...(id === 'x' ? { ticks: exact.ticks.slice() } : {}) });
      };
      internal.axis.getMaxTickSize = wrappedMax;
      schedule(Number(internal.config.transition_duration) || 0);
    },
    redraw: (duration?: number, internalRedraw = false) => schedule(Math.max(duration || 0, Number(internal?.config.transition_duration) || 0), !internalRedraw),
    invalidate() { Object.assign(extra, emptySpace()); measured.clear(); inputKey = fitKey = ''; },
    destroy() {
      stopped = true;
      observer?.disconnect(); observed.clear();
      if (timer) view.clearTimeout(timer); if (frame) view.cancelAnimationFrame(frame);
      if (internal && internal.getCurrentPaddingByDirection === wrappedPadding) internal.getCurrentPaddingByDirection = originalPadding;
      if (internal?.axis && internal.axis.getMaxTickSize === wrappedMax) internal.axis.getMaxTickSize = originalMax;
      measured.clear(); internal = undefined;
      if (surface.dataset) { delete surface.dataset.pptxChartLayoutStatus; delete surface.dataset.pptxChartLayoutDiagnostic; }
    },
  };
};
