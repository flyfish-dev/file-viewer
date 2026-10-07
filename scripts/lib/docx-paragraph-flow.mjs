/** Build-time transforms for the pinned DOCX engine distribution.
 * The installed package remains a normal pnpm patchedDependency: no runtime
 * monkey-patching, network fetches, or document-specific substitutions.
 */
import ts from 'typescript';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error(`Unexpected DOCX method context: ${before}`);
  return source.replace(before, after);
}

function createContinuationPage(page, attach = true) {
  const clone = page.cloneNode(false);
  clone.dataset.docxDynamicPage = 'true';
  clone.removeAttribute('id');
  // An article contributes attributes, not the entire remaining document.
  // Page-level headers and footers still need their complete trees.
  for (const child of Array.from(page.childNodes)) {
    const isArticle = child.nodeType === 1 && child.localName === 'article';
    clone.appendChild(child.cloneNode(!isArticle));
  }
  if (attach) page.after(clone);
  return clone;
}

function moveOverflowingTail(article, page, nextArticle) {
  const view = article.ownerDocument.defaultView;
  if (!view || article.children.length < 3) return false;
  const articleStyle = view.getComputedStyle(article);
  if (articleStyle.display !== 'block' ||
      !['auto', '1'].includes(articleStyle.columnCount) ||
      articleStyle.columnWidth !== 'auto' || articleStyle.writingMode !== 'horizontal-tb') return false;
  const children = Array.from(article.children);
  const bottom = page.getBoundingClientRect().bottom + (this.options.paginationTolerance ?? 2);
  let start = children.length;
  while (start > 1) {
    let candidate = start - 1;
    // Use the engine's own grouping rules, including inherited keep-next.
    while (candidate > 0 && this.isKeepWithNext(children[candidate - 1])) candidate--;
    if (candidate === 0) break;
    let safe = true;
    for (let i = candidate; i < start; i++) {
      const child = children[i];
      const style = view.getComputedStyle(child);
      const rect = child.getBoundingClientRect();
      if (!/^(P|TABLE)$/.test(child.tagName) ||
          !['block', 'table', 'list-item'].includes(style.display) ||
          style.position !== 'static' || style.cssFloat !== 'none' ||
          style.transform !== 'none' || style.clear !== 'none' ||
          style.writingMode !== 'horizontal-tb' ||
          !(parseFloat(style.marginTop) >= 0 && parseFloat(style.marginBottom) >= 0) ||
          !(rect.top > bottom && rect.bottom > rect.top) ||
          child.querySelector('[data-docx-float]')) { safe = false; break; }
    }
    if (!safe) break;
    start = candidate;
  }
  if (children.length - start < 2) return false;
  const fragment = article.ownerDocument.createDocumentFragment();
  for (let i = start; i < children.length; i++) fragment.appendChild(children[i]);
  nextArticle.prepend(fragment);
  return true;
}

async function performDynamicPagination(wrapper) {
  if (!wrapper || wrapper.dataset.docxPaginated === 'true' || wrapper.dataset.docxPaginating === 'true') return;
  if (!wrapper.isConnected) {
    setTimeout(() => this.performDynamicPagination(wrapper), 0);
    return;
  }
  delete wrapper.dataset.docxPaginationScheduled;
  wrapper.dataset.docxPaginating = 'true';
  const pages = Array.from(wrapper.querySelectorAll(':scope > section.' + this.className));
  const maxPasses = this.options.maxDynamicPaginationPasses ?? 1000;
  let passes = 0;
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (i % 2 === 0) await this.yieldToBrowser();
    while (this.isPageOverflowing(page) && passes++ < maxPasses) {
      const articles = Array.from(page.querySelectorAll(':scope > article'));
      if (!articles.some(article => article.children.length > 0)) break;
      const nextPage = this.createContinuationPage(page, false);
      const nextArticles = Array.from(nextPage.querySelectorAll(':scope > article'));
      let movedAny = false;
      for (let a = articles.length - 1; a >= 0 && this.isPageOverflowing(page); a--) {
        const article = articles[a], nextArticle = nextArticles[a];
        let guard = 0;
        if (!nextArticle) continue;
        movedAny = this.moveOverflowingTail(article, page, nextArticle) || movedAny;
        while (this.isPageOverflowing(page) && article.lastElementChild && guard++ < 500) {
          if (guard % 20 === 0) await this.yieldToBrowser();
          if (article.children.length > 1) {
            let chunk = this.pickPaginationChunk(article);
            if (chunk.length === 0) break;
            if (chunk.length >= article.children.length) {
              if (this.splitOverflowBlock(article.lastElementChild, page, nextArticle)) { movedAny = true; continue; }
              chunk = [article.lastElementChild];
            }
            for (let c = chunk.length - 1; c >= 0; c--) { nextArticle.prepend(chunk[c]); movedAny = true; }
          } else {
            if (!this.splitOverflowBlock(article.lastElementChild, page, nextArticle)) break;
            movedAny = true;
          }
        }
        if (a > 0 && this.isPageOverflowing(page)) {
          while (article.lastElementChild) { nextArticle.prepend(article.lastElementChild); movedAny = true; }
        }
      }
      if (!movedAny) { nextPage.remove(); break; }
      if (!nextPage.isConnected) page.after(nextPage);
      pages.splice(i + 1, 0, nextPage);
    }
  }
  this.cleanupEmptyNumberedParagraphs(wrapper);
  this.removeEmptyDynamicPages(wrapper);
  this.updateDynamicFieldPages(wrapper);
  delete wrapper.dataset.docxPaginating;
  wrapper.dataset.docxPaginated = 'true';
}

const methodSource = fn => fn.toString().replace(/^async function /, 'async ').replace(/^function /, '');
export function transformParagraphFlow(source, mode = 'optimized', filename = 'docx.js') {
  if (!['spacing', 'control', 'optimized'].includes(mode)) throw new Error('Unsupported paragraph-flow transform');
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = [], found = new Set();
  function visit(node) {
    if (ts.isMethodDeclaration(node)) {
      const name = node.name.getText(file), original = node.getText(file);
      let replacement;
      if (name === 'parseSpacing') {
        let count = 0;
        replacement = original.replace(/null!=([a-zA-Z_$][\w$]*)\?/g, (_, id) => {
          count++; return `Number.isFinite(${id})&&${id}>=0?`;
        });
        if (count !== 2) throw Error('Unexpected line-spacing branches');
      } else if (mode !== 'spacing' && name === 'createSectionContent') {
        const props = node.parameters[0].name.getText(file);
        const match = original.match(new RegExp(`${props}\\.columns&&([a-zA-Z_$][\\w$]*)&&`));
        if (!match) throw Error('Unexpected column-count branch');
        const count = match[1];
        replacement = replaceOnce(original,match[0],`${props}.columns&&${count}&&(${count}>1||${props}.columns.columns?.length>0)&&`);
      } else if (mode === 'optimized' && name === 'createContinuationPage') {
        replacement = methodSource(createContinuationPage);
      } else if (mode === 'optimized' && name === 'performDynamicPagination') {
        replacement = methodSource(performDynamicPagination) + '\n' + methodSource(moveOverflowingTail);
      } else if (mode === 'optimized' && name === 'splitOverflowBlock') {
        const [,page,next] = node.parameters.map(p=>p.name.getText(file));
        const index = original.indexOf('{') + 1;
        replacement = original.slice(0,index) + `if(!${next}.isConnected&&${page}.isConnected&&${next}.parentElement)${page}.after(${next}.parentElement);` + original.slice(index);
      }
      if (replacement) {if(found.has(name))throw Error(`Duplicate method: ${name}`);found.add(name);edits.push([node.getStart(file),node.end,replacement]);}
    }
    ts.forEachChild(node,visit);
  }
  visit(file);
  const expected = mode === 'spacing' ? 1 : mode === 'control' ? 2 : 5;
  if (found.size !== expected) throw Error(`Expected ${expected} owned methods, found ${[...found]}`);
  let result = source;
  for (const [start,end,value] of edits.sort((a,b)=>b[0]-a[0])) result=result.slice(0,start)+value+result.slice(end);
  const parsed=ts.createSourceFile(filename,result,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(parsed.parseDiagnostics.length)throw Error('Transformed engine is not valid JavaScript');
  return result;
}
