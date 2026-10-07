/** Build-time compatibility update for the hash-pinned DOCX distribution.
 * The font engine, not a guessed point-size threshold, supplies the minimum
 * inline metrics. No document matching or runtime prototype patch is involved.
 */
import ts from 'typescript';

export function preserveGridInlineMetrics(result) {
  const allowed = /^(span|a|sub|sup|b|i|u|s|strike|strong|em)$/;
  const visit = parent => {
    for (const child of Array.from(parent.children ?? [])) {
      // Drawings, text boxes, tables and independent formatting contexts have
      // their own line layout. A custom h() may also return non-DOM objects.
      if (child.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
          !allowed.test(child.localName) || !child.style) continue;
      const style = child.style;
      if (style.lineHeight || (style.display && style.display !== 'inline') ||
          /^(absolute|fixed)$/.test(style.position) ||
          (style.cssFloat && style.cssFloat !== 'none')) continue;
      // A resolved max(grid, auto) on <p> is inherited as a fixed CSS length.
      // Keep natural inline ascent/descent (including sub/sup baseline shifts)
      // so a large run can enlarge the line instead of overlapping the next.
      style.lineHeight = 'normal';
      visit(child);
    }
  };
  visit(result);
}

function applyDocumentGridMinimumHeight(elem, style, result, linePitch) {
  const current = this.effectiveParagraphCssValue(elem, style, 'min-height');
  // Values carry units: comparing only parseFloat(12pt) and parseFloat(14px)
  // would replace a 16px minimum with 14px. Let CSS resolve both lengths.
  this.setCssStyle(result, 'min-height', current ? `max(${current}, ${linePitch})` : linePitch);
}

const method = fn => fn.toString().replace(/^function /, '');
export function transformGridMetrics(source, filename = 'docx.js') {
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (parsed.parseDiagnostics.length) throw new Error('Invalid input engine JavaScript');
  const edits = [], found = new Set();
  function visit(node) {
    if (ts.isMethodDeclaration(node)) {
      const name = node.name.getText(parsed);
      let replacement;
      if (name === 'applyDocumentGridMinimumHeight') {
        replacement = method(applyDocumentGridMinimumHeight);
      } else if (name === 'applyDocumentGridLinePitch') {
        const original = node.getText(parsed), result = node.parameters[2].name.getText(parsed);
        // Insert after the exact-spacing opt-out and immediately before the
        // existing line-height write; no altered parse/Worker/control flow.
        const call = new RegExp(`this\\.setCssStyle\\(${result},["']line-height["'],`);
        if (original.match(new RegExp(call.source, 'g'))?.length !== 1) throw new Error('Unexpected grid method');
        replacement = original.replace(call, `this.preserveGridInlineMetrics(${result}),$&`) + '\n' + method(preserveGridInlineMetrics);
      }
      if (replacement) {
        if (found.has(name)) throw new Error('Duplicate grid method');
        found.add(name); edits.push([node.getStart(parsed), node.end, replacement]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  if (found.size !== 2) throw new Error('Expected both document-grid methods');
  for (const [start, end, text] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,start) + text + source.slice(end);
  if (ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length) throw new Error('Invalid transformed engine');
  return source;
}
