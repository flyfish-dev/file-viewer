import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createPdfReviewHarness } from './pdf-review-harness.mjs';
import { createAnnotationFixture } from '../test/fixtures/annotations/generate.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const output = path.resolve(process.env.PDF_ANNOTATIONS_OUTPUT || path.join(root, 'output/pdf-annotations'));
const fixture = await readFile(new URL('../test/fixtures/annotations/annotations.pdf', import.meta.url));
assert.deepEqual(fixture, await createAnnotationFixture(), 'Committed PDF must match its standalone generator');
assert.notEqual(process.env.PDF_REVIEW_IN_MEMORY, '1', 'Annotation verification requires the HTTP PDF Worker');
await mkdir(output, { recursive: true });
const report = { passed: false, cases: [] };

async function mount(h, page, shadow) {
  await page.evaluate(async ({ assets, shadow }) => {
    // Observe actual PDF.js completion without exposing renderer internals.
    // The page's dispatch behavior and event data pass through unchanged.
    const { EventBus } = await import('/pdfjs/legacy/web/pdf_viewer.mjs');
    const dispatch = EventBus.prototype.dispatch;
    window.completedAnnotationCanvases = new WeakSet();
    EventBus.prototype.dispatch = function (name, event) {
      if (name === 'pagerendered' && event.pageNumber === 1 && !event.cssTransform && !event.error && event.source?.canvas)
        completedAnnotationCanvases.add(event.source.canvas);
      return dispatch.call(this, name, event);
    };
    const host = document.getElementById('host');
    host.style.cssText = 'width:1040px;height:820px;font:14px Arial';
    const owner = shadow ? host.attachShadow({ mode: 'open' }) : host;
    const target = window.annotationHost = document.createElement('div');
    target.style.cssText = 'width:100%;height:100%';
    owner.append(target);
    window.instance = await pdfReview.renderPdf(await (await fetch('/fixtures/annotations.pdf')).arrayBuffer(), target, {
      filename: 'annotations.pdf',
      options: { locale: 'en-US', pdf: { ...assets, navigation: false } },
    });
    window.provider = pdfReview.findFileViewerViewStateProvider(target);
    window.annotationReferenceTask = pdfReview.getDocument({
      data: await (await fetch('/fixtures/annotations.pdf')).arrayBuffer(),
      cMapUrl: assets.cMapUrl, cMapPacked: true,
      standardFontDataUrl: assets.standardFontDataUrl, wasmUrl: assets.wasmUrl,
    });
    window.annotationReference = await annotationReferenceTask.promise;
    window.sourceAnnotations = await (await annotationReference.getPage(1)).getAnnotations();
  }, { assets: h.assets, shadow });
  await page.waitForFunction(() => provider?.getState().pageCount === 2 &&
    annotationHost.querySelectorAll('.annotationTextContent').length === 2);
}

async function scaleTo(page, scale) {
  await page.mouse.move(0, 0);
  await page.evaluate(scale => provider.applyState({ page: 1, scale }), scale);
  await page.waitForFunction(scale => {
    const canvas = annotationHost.querySelector('.page canvas');
    return provider.getState().scale === scale &&
      annotationHost.querySelectorAll('.freeTextAnnotation .annotationTextContent').length === 2 &&
      canvas && completedAnnotationCanvases.has(canvas) && !canvas.hidden &&
      Math.abs(canvas.width - 720 * 4 / 3 * scale) < 2 &&
      Math.abs(canvas.getBoundingClientRect().width - 720 * 4 / 3 * scale) < 2 &&
      annotationHost.querySelector('.page').dataset.loaded === 'true';
  }, scale);
}

async function compareAppearances(page) {
  return page.evaluate(async () => {
    const actual = annotationHost.querySelector('.page canvas');
    const reference = document.createElement('canvas');
    reference.width = actual.width; reference.height = actual.height;
    const sourcePage = await annotationReference.getPage(1);
    const viewport = sourcePage.getViewport({ scale: provider.getState().scale * pdfReview.PixelsPerInch.PDF_TO_CSS_UNITS });
    await sourcePage.render({ canvasContext: reference.getContext('2d'), viewport,
      transform: [actual.width / viewport.width, 0, 0, actual.height / viewport.height, 0, 0],
      annotationMode: 2 }).promise;
    return sourceAnnotations.filter(a => a.subtype === 'FreeText').map(annotation => {
      const [left, bottom, right, top] = annotation.rect;
      const x = Math.ceil(left / 720 * actual.width), y = Math.ceil((540 - top) / 540 * actual.height);
      const width = Math.floor((right - left) / 720 * actual.width) - 1;
      const height = Math.floor((top - bottom) / 540 * actual.height) - 1;
      const a = actual.getContext('2d').getImageData(x, y, width, height).data;
      const b = reference.getContext('2d').getImageData(x, y, width, height).data;
      let delta = 0, actualInk = 0, referenceInk = 0;
      for (let i = 0; i < a.length; i += 4) {
        for (let c = 0; c < 3; c++) delta += Math.abs(a[i + c] - b[i + c]);
        if (Math.max(a[i], a[i + 1], a[i + 2]) < 160) actualInk++;
        if (Math.max(b[i], b[i + 1], b[i + 2]) < 160) referenceInk++;
      }
      return { label: annotation.contentsObj.str.split('\n')[0], actualInk, referenceInk,
        meanError: delta / (width * height * 3 * 255) };
    });
  });
}

async function hoverComment(page, scope, trigger, expected, scale) {
  const popups = scope.locator('.popupAnnotation:not([hidden]) .popup');
  assert.equal(await popups.count(), 0, 'Comments start closed');
  await trigger.hover();
  await popups.waitFor({ state: 'visible' });
  assert.ok((await popups.textContent()).includes(expected));
  const sourceText = await page.evaluate(prefix => sourceAnnotations.find(a => a.contentsObj?.str.startsWith(prefix))?.contentsObj.str, expected);
  assert.ok(sourceText, 'Expected an independently parsed source comment');
  const metrics = await popups.evaluate(node => {
    const rect = node.getBoundingClientRect(), parent = node.parentElement;
    const content = node.querySelector('.popupContent');
    const s = getComputedStyle(node);
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT), rects = [];
    while (walker.nextNode()) {
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      rects.push(...Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0));
    }
    return { font: parseFloat(getComputedStyle(content).fontSize), position: s.position,
      width: rect.width, height: rect.height, overflow: node.scrollWidth - node.clientWidth,
      verticalOverflow: node.scrollHeight - node.clientHeight, text: content.innerText,
      textRects: rects.length, textContained: rects.length > 0 && rects.every(r =>
        r.left >= rect.left - 1 && r.right <= rect.right + 1 && r.top >= rect.top - 1 && r.bottom <= rect.bottom + 1),
      layerWidth: parent.parentElement.getBoundingClientRect().width };
  });
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  assert.equal(normalize(metrics.text), normalize(sourceText), 'Every source line, including the last, is present');
  assert.equal(metrics.position, 'static', 'Popup uses its annotation container for layout');
  assert.ok(Math.abs(metrics.font - 9 * 4 / 3 * scale) < 0.05, JSON.stringify(metrics));
  assert.ok(metrics.width > 0 && metrics.width <= metrics.layerWidth * 0.45 + 2, JSON.stringify(metrics));
  assert.ok(metrics.height > 0 && metrics.overflow <= 1, JSON.stringify(metrics));
  assert.ok(metrics.verticalOverflow <= 1 && metrics.textContained, JSON.stringify(metrics));
  assert.ok(metrics.textRects >= sourceText.split('\n').length, 'Explicit comment lines remain separated');
  await page.mouse.move(0, 0);
  await popups.waitFor({ state: 'hidden' });
  return metrics;
}

try {
  for (const browserName of ['chromium', 'webkit']) {
    const h = await createPdfReviewHarness({ output: path.join(output, browserName),
      fixtures: new Map([['annotations.pdf', fixture]]), browserName });
    try {
      for (const shadow of [false, true]) {
        const page = await h.newPage({ width: 1100, height: 880 });
        try {
          await mount(h, page, shadow);
          const scope = page.locator('#host'); // Playwright pierces the open shadow root.
          for (const scale of [0.4, 1, 2]) {
            await scaleTo(page, scale);
            const key = `${browserName}-${shadow ? 'shadow' : 'light'}-${Math.round(scale * 100)}`;
            const row = { key, browserVersion: h.browser.version(), scale, shadow };
            report.cases.push(row);
            // Capture before assertions so an actual regression leaves useful evidence.
            if (scale === 0.4) {
              await page.screenshot({ path: path.join(output, key + '.png') });
              await scope.locator('.page[data-page-number="1"]').screenshot({ path: path.join(output, key + '-detail.png') });
            }
            const labels = await page.evaluate(() => Array.from(annotationHost.querySelectorAll('.annotationTextContent'), node => {
              const s = getComputedStyle(node);
              return { text: node.textContent, lines: node.querySelectorAll('span').length,
                opacity: s.opacity, color: s.color, pointerEvents: s.pointerEvents };
            }));
            assert.equal(labels.length, 2);
            assert.deepEqual(labels.map(label => label.lines).sort(), [3, 4], 'Both multiline appearances are extracted completely');
            for (const label of labels) {
              assert.equal(label.opacity, '0', `${key}: annotation text must not paint a duplicate: ${label.text}`);
              assert.equal(label.pointerEvents, 'none', `${key}: text must not intercept hover`);
            }
            const geometry = await scope.locator('.freeTextAnnotation').filter({ hasText: 'Annotation label' }).evaluate(node => {
              const rect = node.getBoundingClientRect(), canvas = node.closest('.page').querySelector('canvas');
              const c = canvas.getBoundingClientRect();
              // Inspect the authored yellow appearance, not the hidden HTML text.
              const x = Math.round(74 / 720 * canvas.width), y = Math.round((540 - 404) / 540 * canvas.height);
              const pixel = Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data);
              return { x: rect.x - c.x, y: rect.y - c.y, width: rect.width, height: rect.height,
                canvasWidth: c.width, canvasHeight: c.height, appearancePixel: pixel };
            });
            const factor = scale * 4 / 3;
            for (const [key, expected] of Object.entries({ x: 70 * factor, y: 88 * factor, width: 340 * factor, height: 52 * factor }))
              assert.ok(Math.abs(geometry[key] - expected) < 2, `${key}: ${JSON.stringify(geometry)}`);
            const [r, g, b] = geometry.appearancePixel;
            assert.ok(r > 240 && g > 225 && b > 175 && b < 215, 'Authored annotation appearance remains painted');
            row.geometry = geometry;
            row.appearances = await compareAppearances(page);
            assert.equal(row.appearances.length, 2);
            for (const appearance of row.appearances) {
              assert.ok(appearance.referenceInk > 5 && appearance.actualInk >= appearance.referenceInk * 0.9,
                `Authored glyphs remain visible: ${JSON.stringify(appearance)}`);
              assert.ok(appearance.meanError < 0.02, `Appearance matches native PDF.js rendering: ${JSON.stringify(appearance)}`);
            }
            row.freeTextPopup = await hoverComment(page, scope,
              scope.locator('.freeTextAnnotation').filter({ hasText: 'Annotation label' }), 'Annotation label', scale);
            row.highlightPopup = await hoverComment(page, scope,
              scope.locator('.highlightAnnotation'), 'A generated review comment', scale);
            await scope.locator('.highlightAnnotation').hover();
            await scope.locator('.popupAnnotation:not([hidden]) .popup').waitFor({ state: 'visible' });
            if (scale === 0.4 || scale === 1) await page.screenshot({ path: path.join(output, key + '-hover.png') });
            // Real clicks pin/unpin the same popup without losing hover behavior.
            await scope.locator('.highlightAnnotation').click();
            await page.mouse.move(0, 0);
            assert.equal(await scope.locator('.popupAnnotation:not([hidden])').count(), 1);
            await scope.locator('.popupAnnotation:not([hidden]) .popup').click();
            await page.mouse.move(0, 0);
            await scope.locator('.popupAnnotation:not([hidden])').waitFor({ state: 'hidden' });
            row.passed = true;
          }
          await scaleTo(page, 1);
          const field = scope.locator('.textWidgetAnnotation input');
          assert.equal(await field.inputValue(), 'Initial value');
          await field.fill('Updated value');
          assert.equal(await field.inputValue(), 'Updated value');
          await scope.locator('.linkAnnotation a').click();
          await page.waitForFunction(() => provider.getState().page === 2);
          await page.evaluate(() => annotationReferenceTask.destroy());
          await page.evaluate(() => instance.unmount());
          assert.equal(await scope.locator('.annotationLayer').count(), 0);
        } finally { await page.close(); }
      }
      assert.deepEqual(h.errors, []);
      assert.deepEqual(h.external, []);
      assert.deepEqual(h.requests.filter(r => r.status >= 400), []);
      assert.ok(h.workers.some(url => url.endsWith('pdf.worker.mjs')), 'Real local PDF Worker must execute');
    } finally { await h.close(); }
  }
  report.passed = true;
  console.log('PASS PDF annotations: Chromium/WebKit, light/Shadow DOM, 40/100/200%, hidden duplicate text, authored appearance, hover/pin, form, internal link and teardown.');
} finally { await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
