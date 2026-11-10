import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = new URL('../artifacts/spreadsheet-comments/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const base =
  'http://127.0.0.1:43143/preview/test/fixtures/spreadsheet-comments/index.html';
const errors = [],
  external = [],
  workerUrls = [],
  measurements = [];
const button = (page, name) => page.getByRole('button', { name, exact: true });
const dialog = (page) =>
  page.getByRole('dialog', { name: 'Comments and notes', exact: true });
const panel = (page) =>
  page.getByRole('complementary', { name: 'Comments and notes', exact: true });
const focused = (locator) =>
  locator.evaluate((el) => el.getRootNode().activeElement === el);
async function cellVisible(page, address) {
  const locator = button(page, `Show comment at ${address}`);
  await locator.waitFor();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (
      await locator.evaluate((el) => {
        const cell = el.getBoundingClientRect(),
          clip = el.closest('.table-wrapper').getBoundingClientRect();
        return (
          cell.width > 0 &&
          cell.right > clip.left &&
          cell.left < clip.right &&
          cell.bottom > clip.top &&
          cell.top < clip.bottom
        );
      })
    )
      return locator;
    await page.waitForTimeout(50);
  }
  throw new Error(`${address} did not enter the visible grid`);
}
async function open(context, query = '', count = 6) {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('worker', (worker) => workerUrls.push(worker.url()));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      url.hostname === '127.0.0.1' ||
      url.protocol === 'data:' ||
      url.protocol === 'blob:'
    )
      return route.continue();
    external.push(url.href);
    return route.abort();
  });
  await page.goto(base + query);
  await page.locator('.excel-wrapper .loading').waitFor({ state: 'hidden' });
  await button(page, `Comments and notes (${count})`).waitFor();
  await page.waitForTimeout(900);
  return page;
}
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await open(desktop);
  assert.ok(
    await page.evaluate(() =>
      window.commentsWorkerMessages.some(
        (event) =>
          event?.type === 'sheets' &&
          event.payload.sheets.reduce(
            (sum, sheet) => sum + sheet.comments.length,
            0,
          ) === 6,
      ),
    ),
  );
  const downloaded = page.waitForEvent('download');
  await button(page, 'Download').click();
  const download = await downloaded;
  const downloadPath = await download.path();
  assert.ok(downloadPath);
  assert.deepEqual(
    await readFile(downloadPath),
    await readFile(
      new URL(
        './fixtures/spreadsheet-comments/excel-comments.xlsx',
        import.meta.url,
      ),
    ),
  );
  await button(page, 'Show comment at A1').click();
  assert.match(
    await dialog(page).innerText(),
    /Original workbook stays unchanged/,
  );
  await page.keyboard.press('Escape');
  await dialog(page).waitFor({ state: 'hidden' });
  await button(page, 'Zoom in').focus();
  await button(page, 'Show comment at D4').hover();
  await dialog(page).waitFor();
  assert.match(
    await dialog(page).innerText(),
    /Include the reauthentication path/,
  );
  await page.keyboard.press('Escape');
  assert.equal(await focused(button(page, 'Zoom in')), true);
  await button(page, 'Show comment at B6').click();
  assert.match(await dialog(page).innerText(), /otherwise empty cell/);
  await page.keyboard.press('Escape');
  await button(page, 'Show comment at C5').click();
  assert.match(await dialog(page).innerText(), /Alex/);
  assert.match(await dialog(page).innerText(), /Mina/);
  assert.match(await dialog(page).innerText(), /確認メール/);
  await page.screenshot({ path: new URL('thread.png', output).pathname });
  await page.keyboard.press('Escape');
  await button(page, 'Comments and notes (6)').click();
  const geometry = await panel(page).evaluate((el) => {
    const first = el.querySelector('.excel-comment-card');
    const lefts = [
      el.querySelector('.excel-comments-title'),
      first.querySelector('.excel-comment-cell'),
      first.querySelector('.excel-comment-metadata strong'),
      first.querySelector('.excel-comment-message p'),
    ].map((node) => node.getBoundingClientRect().left);
    return {
      lefts,
      delta: Math.max(...lefts) - Math.min(...lefts),
      overflow: el.scrollWidth - el.clientWidth,
    };
  });
  assert.equal(geometry.delta, 0);
  assert.equal(geometry.overflow, 0);
  await page.screenshot({ path: new URL('desktop.png', output).pathname });
  await button(page, 'Go to Release plan!D650').click();
  await cellVisible(page, 'D650');
  assert.equal(await focused(button(page, 'Go to Release plan!D650')), true);
  assert.equal(await panel(page).locator('[aria-current=true]').count(), 1);
  await page.screenshot({ path: new URL('far-row.png', output).pathname });
  await button(page, 'Go to 仕様!B4').click();
  await cellVisible(page, 'B4');
  assert.match(
    await panel(page).locator('[aria-current=true]').innerText(),
    /Resolved/,
  );
  await button(page, 'Close comments').click();
  await button(page, 'Show comment at B4').click();
  assert.match(await dialog(page).innerText(), /修正は不要/);
  await page.keyboard.press('Escape');
  await button(page, 'Comments and notes (6)').click();
  await button(page, 'Go to Release plan!C5').click();
  await cellVisible(page, 'C5');
  await button(page, 'Close comments').click();
  await button(page, 'Zoom in').click();
  await button(page, 'Show comment at C5').click();
  await dialog(page).waitFor();
  await page.keyboard.press('Escape');
  await button(page, 'Show comment at D4').focus();
  assert.equal(await focused(button(page, 'Show comment at D4')), true);
  await page.setViewportSize({ width: 1439, height: 900 });
  await page.waitForTimeout(150);
  assert.equal(await focused(button(page, 'Show comment at D4')), true);
  await page.keyboard.press('Enter');
  await dialog(page).waitFor();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Space');
  await dialog(page).waitFor();
  await page.keyboard.press('Escape');
  measurements.push({ mode: 'worker', viewport: 'desktop', geometry });
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mp = await open(mobile, '?worker=false');
  assert.equal(
    await mp.evaluate(() => window.commentsWorkerMessages.length),
    0,
  );
  await button(mp, 'Comments and notes (6)').click();
  await button(mp, 'Go to Release plan!D650').click();
  await cellVisible(mp, 'D650');
  const stacked = await panel(mp).evaluate((el) => {
    const grid = el.parentElement
      .querySelector('.table-wrapper')
      .getBoundingClientRect();
    const pane = el.getBoundingClientRect();
    return {
      gridBottom: grid.bottom,
      panelTop: pane.top,
      overflow: el.scrollWidth - el.clientWidth,
    };
  });
  assert.ok(stacked.gridBottom <= stacked.panelTop + 1);
  assert.equal(stacked.overflow, 0);
  await mp.screenshot({ path: new URL('mobile.png', output).pathname });
  await mp.setViewportSize({ width: 390, height: 600 });
  await button(mp, 'Go to Release plan!D650').click();
  await cellVisible(mp, 'D650');
  await button(mp, 'Go to 仕様!B4').click();
  await cellVisible(mp, 'B4');
  measurements.push({ mode: 'main-thread', viewport: 'mobile', stacked });
  await mobile.close();

  const dark = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const dp = await open(dark, '?theme=dark');
  await button(dp, 'Comments and notes (6)').click();
  assert.equal(
    await dp.locator('.excel-wrapper').getAttribute('data-spreadsheet-theme'),
    'dark',
  );
  await dp.screenshot({ path: new URL('dark.png', output).pathname });
  await dark.close();

  const partial = await browser.newContext({
    viewport: { width: 1200, height: 800 },
  });
  const pp = await open(partial, '?partial=true&worker=false', 5);
  await button(pp, 'Comments and notes (5)').click();
  await pp
    .getByRole('status')
    .filter({ hasText: 'Some comments could not be read' })
    .waitFor();
  await button(pp, 'Go to Release plan!C5').waitFor();
  await partial.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.ok(
    workerUrls.some(
      (url) => url.includes('/preview/') && url.includes('sheet.worker'),
    ),
  );
  await writeFile(
    new URL('browser-results.json', output),
    JSON.stringify({ measurements, workerUrls, errors, external }, null, 2),
  );
  console.log(
    'PASS: real Worker and main-thread parity; offline /preview/ paths; notes, threads, resolved state, virtual/cross-sheet navigation, hover, zoom, keyboard, focus and mobile layout',
  );
} finally {
  await browser.close();
}
