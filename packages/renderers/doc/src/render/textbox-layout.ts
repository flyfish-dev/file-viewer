import type { MsDocBlock, MsDocParseResult, MsDocSectionGeometry, MsDocTextboxFrame, ParagraphBlock } from '../types.js';

export interface TextboxPlacement {
  frame: MsDocTextboxFrame;
  blocks: MsDocBlock[];
  x: number;
  y: number;
  width: number;
  height: number;
  insets: { left: number; top: number; right: number; bottom: number };
  relativeTo: 'page' | 'paragraph';
  belowText: boolean;
  order: number;
  fill?: number;
  line?: { color: number; width: number };
}
export interface TextboxRenderPlan {
  section: MsDocSectionGeometry;
  placements: TextboxPlacement[];
  consumed: Set<string>;
  rejected: Map<string, string>;
}

const integer = (value: unknown): value is number => Number.isInteger(value);
const pixel = (twips: number) => twips / 15;
const property = (frame: MsDocTextboxFrame, id: number) => frame.raw?.drawing?.properties.find(row => row.id === id);
const scalar = (frame: MsDocTextboxFrame, id: number): number | undefined => {
  const item = property(frame, id);
  return item && !item.complex && !item.blip ? item.value : undefined;
};

/** Legacy Word persists these origins zero-based, unlike the generic ODRAW
 * table. Native page/margin pairs and single-field SPA-conflict controls confirm
 * the Word-host representation and OfficeArt precedence. Keep both raw fields;
 * do not choose a convention by filename, text, producer or rectangle.
 */
export function wordTextboxOrigins(frame: MsDocTextboxFrame): { horizontal: number; vertical: number } | null {
  if (!frame.raw) return null;
  const horizontal = property(frame, 912), vertical = property(frame, 914);
  for (const item of [horizontal, vertical]) if (item && (item.complex || item.blip || !integer(item.value) || item.value < 0 || item.value > 3)) return null;
  const x = horizontal?.value ?? frame.raw.bx;
  const y = vertical?.value ?? frame.raw.by;
  return integer(x) && integer(y) && x >= 0 && x <= 2 && y >= 0 && y <= 2 ? { horizontal: x, vertical: y } : null;
}

function geometry(section: MsDocSectionGeometry): boolean {
  const m = section.marginsTwips, width = section.pageWidthTwips, height = section.pageHeightTwips;
  return section.status !== 'invalid' && !section.budgetExceeded
    && integer(width) && width > 0 && width <= 31680 && integer(height) && height > 0 && height <= 31680
    && [m.left, m.right, m.top, m.bottom].every(value => integer(value) && value! >= 0 && value! <= 31680)
    && m.left! + m.right! < width && m.top! + m.bottom! < height
    && (!m.gutter || m.gutter === 0)
    && (section.columnsMinusOne == null || (integer(section.columnsMinusOne) && section.columnsMinusOne >= 0 && section.columnsMinusOne < 16))
    && (section.columnSpaceTwips == null || (integer(section.columnSpaceTwips) && section.columnSpaceTwips >= 0))
    && (section.columnsMinusOne ?? 0) * (section.columnSpaceTwips ?? 0) < width - m.left! - m.right!;
}

/** A render-only plan. Canonical blocks, CPs, raw geometry and diagnostics are
 * never mutated. Unsupported frames retain their original readable tail.
 */
export function buildTextboxRenderPlan(parsed: MsDocParseResult): TextboxRenderPlan | null {
  const layout = parsed.textboxLayout;
  if (!layout || layout.sections.length !== 1 || !geometry(layout.sections[0]!)) return null;
  const section = layout.sections[0]!, placements: TextboxPlacement[] = [], consumed = new Set<string>(), rejected = new Map<string, string>();
  const blocks = new Map(parsed.blocks.map(block => [block.id, block]));
  if (blocks.size !== parsed.blocks.length) return null;
  const main = parsed.blocks.filter((block): block is ParagraphBlock => block.type === 'paragraph' && block.storyKind === 'main');
  const first = Math.min(...main.map(block => block.sourceRange?.global.start ?? Infinity),
    ...layout.anchorParagraphs.filter(row => row.storyKind === 'main').map(row => row.globalRange.start));
  const ownership = new Map<string, number>();
  for (const frame of layout.frames) for (const id of frame.contentBlockIds) ownership.set(id, (ownership.get(id) || 0) + 1);
  const pageBreakBefore = (cp: number) => main.some(block => block.type === 'paragraph'
    && (block.sourceRange?.global.start ?? Infinity) <= cp
    && (block.paraState.pageBreakBefore || block.inlines.some(node => node.type === 'pageBreak')));
  for (const frame of layout.frames) {
    const reject = (reason: string) => { rejected.set(frame.id, reason); };
    const raw = frame.raw, drawing = raw?.drawing, anchor = frame.anchor;
    if (frame.mapping !== 'mapped' || !raw || !drawing || !anchor || anchor.storyKind !== 'main' || frame.storyKind !== 'textbox') { reject('missing-or-invalid-main-story-anchor'); continue; }
    if (frame.chainCount !== 1 || drawing.parentShapeId != null || drawing.shapeType !== 202 || (drawing.flags & 0xc0)
      || frame.reasons.some(reason => reason !== 'unverified-coordinate-semantics')
      || [4, 136].some(id => property(frame, id) && scalar(frame, id) !== 0)) { reject('unsupported-shape-transform-or-text-flow'); continue; }
    if (raw.wrap !== 3) { reject('unsupported-wrap-exclusion'); continue; }
    const origins = wordTextboxOrigins(frame);
    if (!origins || [911, 913].some(id => property(frame, id) && scalar(frame, id) !== 0)) { reject('unsupported-origin-or-alignment'); continue; }
    if (!anchor.paragraphRange || !integer(anchor.globalCp)
      || anchor.globalCp < anchor.paragraphRange.start || anchor.globalCp >= anchor.paragraphRange.end
      || anchor.paragraphRange.start < section.mainCpRange.start || anchor.paragraphRange.end > section.mainCpRange.end) { reject('anchor-outside-section'); continue; }
    const local = origins.horizontal === 2 && origins.vertical === 2;
    if (local) {
      const block = anchor.paragraphBlockId ? blocks.get(anchor.paragraphBlockId) : undefined;
      if (block?.type !== 'paragraph' || block.storyKind !== 'main'
        || block.sourceRange?.global.start !== anchor.paragraphRange.start
        || block.sourceRange.global.end !== anchor.paragraphRange.end) { reject('paragraph-position-unavailable'); continue; }
      if (pageBreakBefore(anchor.globalCp)) { reject('page-position-unavailable'); continue; }
    } else if (origins.horizontal === 2 || origins.vertical === 2 || anchor.paragraphRange.start !== first || pageBreakBefore(anchor.globalCp)) {
      reject('page-position-unavailable'); continue;
    }
    const rect = raw.rectTwips;
    if (![rect.left, rect.top, rect.right, rect.bottom].every(value => integer(value) && Math.abs(value) <= 0x7fffffff)
      || rect.right <= rect.left || rect.bottom <= rect.top) { reject('invalid-rectangle'); continue; }
    const content = frame.contentBlockIds.map(id => blocks.get(id));
    if (content.some((block, index) => !block || ownership.get(frame.contentBlockIds[index]!) !== 1)
      || content.some(block => block?.type === 'paragraph' && block.sourceRange?.flowId !== frame.id)) { reject('incomplete-or-shared-content'); continue; }
    const m = section.marginsTwips;
    const x = rect.left + (!local && origins.horizontal === 0 ? m.left! : 0);
    const y = rect.top + (!local && origins.vertical === 0 ? m.top! : 0);
    const width = rect.right - rect.left, height = rect.bottom - rect.top;
    if (width > section.pageWidthTwips! || height > section.pageHeightTwips!) { reject('unbounded-frame-extent'); continue; }
    const inset = (id: number, fallback: number) => {
      const item = property(frame, id);
      if (item && (item.complex || item.blip || !integer(item.value) || item.value > 0x7fffffff)) return null;
      return (item?.value ?? fallback) / 9525;
    };
    const left = inset(129, 91440), top = inset(130, 45720), right = inset(131, 91440), bottom = inset(132, 45720);
    if ([left, top, right, bottom].some(value => value == null || value < 0)
      || left! + right! >= pixel(width) || top! + bottom! >= pixel(height)) { reject('invalid-text-insets'); continue; }
    const fillFlags = scalar(frame, 447), lineFlags = scalar(frame, 511);
    const hasFill = fillFlags == null || !(fillFlags & 0x00100000) || !!(fillFlags & 0x10);
    const hasLine = lineFlags == null || !(lineFlags & 0x00080000) || !!(lineFlags & 8);
    placements.push({ frame, blocks: content as MsDocBlock[], x: pixel(x), y: pixel(y), width: pixel(width), height: pixel(height),
      insets: { left: left!, top: top!, right: right!, bottom: bottom! }, relativeTo: local ? 'paragraph' : 'page',
      belowText: raw.belowText, order: drawing.fileOrder,
      ...(hasFill ? { fill: scalar(frame, 385) ?? 0xffffff } : {}),
      ...(hasLine ? { line: { color: scalar(frame, 448) ?? 0, width: (scalar(frame, 459) ?? 9525) / 9525 } } : {}) });
    for (const block of content) consumed.add(block!.id);
  }
  return placements.length ? { section, placements, consumed, rejected } : null;
}
