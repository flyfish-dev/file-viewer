/** DrawingML text-body values in EMUs. Presence (including zero) beats defaults. */
export function getTextBodyMetrics(body, layout, master) {
  const bodies = [body, layout, master].map(b => b?.['a:bodyPr']).filter(Boolean);
  const coordinate = (name, fallback) => {
    for (const b of bodies) {
      const raw = b.attrs?.[name];
      if (raw === undefined) continue;
      const n = Number(raw);
      // Padding cannot express negative insets. Keep these bounded rather than
      // allowing invalid XML to generate NaN or unbounded CSS dimensions.
      return String(raw).trim() && Number.isFinite(n) && n >= 0 && n <= 2147483647 ? n : fallback;
    }
    return fallback;
  };
  let autofit = 'none', fontScale = 1;
  for (const b of bodies) {
    if (b['a:noAutofit'] !== undefined) break;
    if (b['a:spAutoFit'] !== undefined) { autofit = 'shape'; break; }
    if (b['a:normAutofit'] !== undefined) {
      autofit = 'normal';
      const raw = b['a:normAutofit']?.attrs?.fontScale;
      const n = typeof raw === 'string' && raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw) / 100000;
      if (raw !== undefined && Number.isFinite(n) && n > 0 && n <= 1) fontScale = n;
      break;
    }
  }
  const wrap = bodies.map(b => b.attrs?.wrap).find(v => v !== undefined);
  return { left: coordinate('lIns', 91440), right: coordinate('rIns', 91440),
    top: coordinate('tIns', 45720), bottom: coordinate('bIns', 45720),
    autofit, fontScale, wrap: wrap === 'none' ? 'none' : 'square' };
}
