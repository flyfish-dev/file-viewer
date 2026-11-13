// BEGIN PREPACK COMPLETION OBSERVATION
import { recordBrowserGateCompletion, recordBrowserGateFixture } from './lib/import-playwright.mjs'
// END PREPACK COMPLETION OBSERVATION
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { launchBrowserForTest } from '../browser-test-launch.mjs'

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const fixturePath = resolve(sourceRoot, 'test/fixtures/issue-200/layout.pptx')
const pptxPackageRoot = resolve(sourceRoot, 'packages/renderers/pptx')
const workerPath = resolve(pptxPackageRoot, 'dist/worker/pptx.worker.js')
const scriptPath = fileURLToPath(import.meta.url)
const rootRequire = createRequire(resolve(sourceRoot, 'package.json'))
const pptxRequire = createRequire(resolve(pptxPackageRoot, 'package.json'))
const workerOutputFlag = '--worker-output'
const timeout = Number(process.env.FILE_VIEWER_ISSUE_200_TIMEOUT || 120_000)

const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim()

const parseStyle = value => Object.fromEntries(
  String(value || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separator = part.indexOf(':')
      return separator < 0
        ? [part, '']
        : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
    })
)

const readPx = (styles, property) => {
  const value = Number.parseFloat(styles[property])
  assert(Number.isFinite(value), `Expected ${property} to contain a finite pixel value, received ${styles[property]}`)
  return value
}

const closeTo = (actual, expected, tolerance, label) => {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, received ${actual}`
  )
}

const runProductionWorker = async () => {
  assert(existsSync(fixturePath), `Missing issue #200 fixture: ${fixturePath}`)
  assert(existsSync(workerPath), `Missing built PPTX worker: ${workerPath}`)

  const bytes = await readFile(fixturePath)
  const messages = []
  let resolveComplete
  let rejectComplete
  const complete = new Promise((resolvePromise, rejectPromise) => {
    resolveComplete = resolvePromise
    rejectComplete = rejectPromise
  })
  const timer = setTimeout(() => {
    rejectComplete(new Error('Timed out waiting for the issue #200 fixture worker run'))
  }, timeout)

  globalThis.self = {
    addEventListener() {},
    postMessage(message) {
      if (!message || typeof message === 'string') {
        return
      }
      if (message.type === 'slide' || message.type === 'slide-error' || message.type === 'globalCSS' || message.type === 'ERROR') {
        messages.push(message)
      }
      if (message.type === 'ExecutionTime' || message.type === 'ERROR') {
        resolveComplete()
      }
    },
  }

  const workerUrl = pathToFileURL(workerPath)
  workerUrl.searchParams.set('issue-200', String(Date.now()))
  await import(workerUrl.href)
  self.onmessage({
    data: {
      type: 'processPPTX',
      data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      IE11: false,
      options: {
        themeProcess: true,
        incSlide: {},
        slideMode: false,
        keyBoardShortCut: false,
        mediaProcess: true,
        jsZipV2: false,
      },
    },
  })

  try {
    await complete
  } finally {
    clearTimeout(timer)
  }
  return messages
}

const workerOutputIndex = process.argv.indexOf(workerOutputFlag)
if (workerOutputIndex >= 0) {
  const outputPath = process.argv[workerOutputIndex + 1]
  assert(outputPath, `${workerOutputFlag} requires an output path`)
  const messages = await runProductionWorker()
  await writeFile(outputPath, JSON.stringify(messages))
  process.exit(0)
}

const runWorkerChild = async outputPath => {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [scriptPath, workerOutputFlag, outputPath], {
      cwd: sourceRoot,
      stdio: 'inherit',
    })
    child.once('error', rejectRun)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun()
        return
      }
      rejectRun(new Error(`Issue #200 worker verifier exited with code ${code ?? 'null'}${signal ? ` (${signal})` : ''}`))
    })
  })
  return JSON.parse(await readFile(outputPath, 'utf8'))
}

const findGeneratedRule = (globalCss, className) => {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`\\.${escapedClass}\\{([^}]*)\\}`).exec(globalCss)
  return match ? parseStyle(match[1]) : null
}

const verifyWorkerMarkup = async messages => {
  const fatal = messages.find(message => message.type === 'ERROR')
  assert(!fatal, `PPTX worker failed: ${JSON.stringify(fatal?.data)}`)

  const slideMessages = messages.filter(message => message.type === 'slide' || message.type === 'slide-error')
  assert.equal(slideMessages.length, 5, 'The issue #200 fixture must emit all five logical slides')
  assert.deepEqual(
    slideMessages.map(message => message.slide_num),
    [1, 2, 3, 4, 5],
    'The issue #200 fixture must preserve logical slide order'
  )
  assert(slideMessages.every(message => message.type === 'slide'), 'No issue #200 fixture slide may degrade to slide-error')

  const linkedomModule = await import(pathToFileURL(rootRequire.resolve('linkedom')).href)
  const { parseHTML } = linkedomModule.default || linkedomModule
  const parseSlide = slideNumber => {
    const html = slideMessages.find(message => message.slide_num === slideNumber)?.data
    assert.equal(typeof html, 'string', `Slide ${slideNumber} did not emit HTML`)
    return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document
  }
  const globalCss = String(messages.find(message => message.type === 'globalCSS')?.data || '')

  const slide3 = parseSlide(3)
  const slide3Root = slide3.querySelector('.slide')
  assert(slide3Root, 'Slide 3 root is missing')
  const slide3Styles = parseStyle(slide3Root.getAttribute('style'))
  const slideWidth = readPx(slide3Styles, 'width')
  const slideHeight = readPx(slide3Styles, 'height')
  const tables = Array.from(slide3.querySelectorAll('table'))
  assert.equal(tables.length, 4, 'Slide 3 must preserve its four independent DrawingML tables')

  tables.forEach((table, index) => {
    const styles = parseStyle(table.getAttribute('style'))
    assert.equal(styles['table-layout'], 'fixed', `Slide 3 table ${index + 1} must use fixed layout`)
    assert.equal(styles['box-sizing'], 'border-box', `Slide 3 table ${index + 1} must use border-box sizing`)
    assert.equal(styles.overflow, 'hidden', `Slide 3 table ${index + 1} must bound its contents`)
    assert.equal(styles.height, undefined, `Slide 3 table ${index + 1} must size from DrawingML rows instead of graphicFrame height`)
    const left = readPx(styles, 'left')
    const top = readPx(styles, 'top')
    const width = readPx(styles, 'width')
    assert(left >= -0.01, `Slide 3 table ${index + 1} starts outside the slide horizontally`)
    assert(top >= -0.01, `Slide 3 table ${index + 1} starts outside the slide vertically`)
    assert(left + width <= slideWidth + 0.1, `Slide 3 table ${index + 1} exceeds the ${slideWidth}px slide width`)
  })

  const cells = Array.from(slide3.querySelectorAll('td'))
  const cellContents = Array.from(slide3.querySelectorAll('td > .pptx-table-cell-content'))
  assert(cells.length > 40, 'Slide 3 did not preserve its table cells')
  assert.equal(cellContents.length, cells.length, 'Every DrawingML table cell must have a bounded content box')
  for (const [index, cell] of cells.entries()) {
    const styles = parseStyle(cell.getAttribute('style'))
    assert.equal(styles['box-sizing'], 'border-box', `Slide 3 cell ${index + 1} must use border-box sizing`)
    assert.equal(styles['min-width'], '0', `Slide 3 cell ${index + 1} must be shrinkable in a fixed table`)
    assert.equal(styles.overflow, 'hidden', `Slide 3 cell ${index + 1} must bound its contents`)
    assert.equal(styles.padding, '0', `Slide 3 cell ${index + 1} must not inherit host padding`)
  }
  const firstContentStyles = parseStyle(cellContents[0].getAttribute('style'))
  assert.equal(firstContentStyles['box-sizing'], 'border-box', 'DrawingML table-cell inset box must use border-box sizing')
  assert.equal(firstContentStyles.overflow, 'hidden', 'DrawingML table-cell inset box must bound its contents')
  assert.equal(firstContentStyles['min-height'], '0', 'DrawingML table-cell inset box must remain shrinkable')
  assert.match(firstContentStyles.padding, /^0\.9332\d*px 0\.9332\d*px 0px 0\.9332\d*px$/, 'Slide 3 first cell must retain its OOXML tcMar insets')

  const slide4 = parseSlide(4)
  const labels = ['项目背景', '平台定位', '平台规划', '建设情况', '需决策问题', '附：阶段成果']
  for (const label of labels) {
    const textBox = Array.from(slide4.querySelectorAll('div.block.content'))
      .find(element => normalizeText(element.textContent) === label)
    assert(textBox, `Slide 4 SmartArt text box is missing: ${label}`)
    const styles = parseStyle(textBox.getAttribute('style'))
    assert.equal(styles.transform, 'rotate(0deg)', `Slide 4 SmartArt text must remain horizontal: ${label}`)
    assert.notEqual(styles.transform, 'rotate(270deg)', `Slide 4 SmartArt text regressed to the old implicit quarter turn: ${label}`)

    const paragraph = textBox.querySelector('.slide-prgrph')
    const generatedClass = paragraph && Array.from(paragraph.classList).find(className => className.startsWith('_css_'))
    assert(generatedClass, `Slide 4 SmartArt paragraph is missing generated line-height CSS: ${label}`)
    const generatedRule = findGeneratedRule(globalCss, generatedClass)
    assert(generatedRule, `Slide 4 SmartArt paragraph CSS rule is missing: ${generatedClass}`)
    assert.equal(generatedRule['line-height'], '1', `Explicit DrawingML spcPct=100000 must remain line-height:1 for ${label}`)
  }

  const slide5 = parseSlide(5)
  const diagram = slide5.querySelector('.diagram-content')
  assert(diagram, 'Slide 5 SmartArt diagram group is missing')
  const diagramStyles = parseStyle(diagram.getAttribute('style'))
  const diagramLeft = readPx(diagramStyles, 'left')
  const diagramTop = readPx(diagramStyles, 'top')
  const diagramSvgs = Array.from(diagram.children).filter(element => element.localName === 'svg')
  assert.equal(diagramSvgs.length, 5, 'Slide 5 must preserve the quadArrow plus four cards')
  const diagramBounds = diagramSvgs.map((element, index) => {
    const styles = parseStyle(element.getAttribute('style'))
    return {
      index,
      left: diagramLeft + readPx(styles, 'left'),
      top: diagramTop + readPx(styles, 'top'),
      width: readPx(styles, 'width'),
      height: readPx(styles, 'height'),
    }
  })
  closeTo(diagramBounds[0].left, 326.27, 0.2, 'Slide 5 quadArrow x')
  closeTo(diagramBounds[0].width, 601.56, 0.2, 'Slide 5 quadArrow width')
  closeTo(diagramBounds[0].height, 601.56, 0.2, 'Slide 5 quadArrow height')
  assert(diagramSvgs[0].querySelector('path'), 'Slide 5 quadArrow path is missing')
  closeTo(diagramBounds[1].left, 280.61, 0.2, 'Slide 5 left card x')
  closeTo(diagramBounds[2].left, 660.67, 0.2, 'Slide 5 right card x')
  for (const [index, bounds] of diagramBounds.slice(1).entries()) {
    closeTo(bounds.width, 320.94, 0.2, `Slide 5 card ${index + 1} width`)
    assert(bounds.left >= 0 && bounds.left + bounds.width <= 1280.1, `Slide 5 card ${index + 1} exceeds slide bounds`)
    assert(bounds.top >= 0 && bounds.top + bounds.height <= 720.1, `Slide 5 card ${index + 1} exceeds slide bounds`)
  }

  console.log('[issue-200-pptx] Worker verified 5 slides, table bounds/insets, horizontal SmartArt text, and quadArrow/card geometry.')
}

const importPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (originalError) {
    const candidatePaths = process.env.PATH
      ?.split(delimiter)
      .filter(pathEntry => pathEntry.endsWith(`${sep}node_modules${sep}.bin`))
      .map(binDir => resolve(binDir, '..'))
      .filter(existsSync) || []
    for (const candidatePath of candidatePaths) {
      try {
        const entry = rootRequire.resolve('playwright', { paths: [candidatePath] })
        return await import(pathToFileURL(entry).href)
      } catch {
        // Continue probing npm-exec package roots.
      }
    }
    throw new Error([
      'Missing playwright module.',
      'Run with: npm exec --yes --package playwright@1.61.1 -- node scripts/verify-issue-200-pptx-layout.mjs',
      `Original error: ${originalError instanceof Error ? originalError.message : String(originalError)}`,
    ].join('\n'))
  }
}

const createBrowserHarness = async tempRoot => {
  const entryPath = join(tempRoot, 'entry.ts')
  const indexPath = join(tempRoot, 'index.html')
  const fixtureTarget = join(tempRoot, 'fixture', 'layout.pptx')
  const workerTarget = join(tempRoot, 'worker', 'pptx.worker.js')
  await mkdir(dirname(fixtureTarget), { recursive: true })
  await mkdir(dirname(workerTarget), { recursive: true })
  await copyFile(fixturePath, fixtureTarget)
  await copyFile(workerPath, workerTarget)

  await writeFile(entryPath, `
import { PptxViewer } from ${JSON.stringify(resolve(pptxPackageRoot, 'src/index.ts'))}

window.__issue200Ready = false
window.__issue200Error = ''

try {
  const response = await fetch('/fixture/layout.pptx')
  if (!response.ok) throw new Error('Fixture request failed: ' + response.status)
  const bytes = await response.arrayBuffer()
  let resolveComplete
  let rejectComplete
  const completed = new Promise((resolve, reject) => {
    resolveComplete = resolve
    rejectComplete = reject
  })
  const viewer = await PptxViewer.open(bytes, document.querySelector('#viewer'), {
    fitMode: 'none',
    lazySlides: false,
    lazyMedia: false,
    onRenderComplete: resolveComplete,
    onError: error => rejectComplete(error),
  })
  await Promise.race([
    completed,
    new Promise((_, reject) => setTimeout(() => reject(new Error('PPTX render timed out')), ${timeout})),
  ])
  window.__issue200Viewer = viewer
} catch (error) {
  window.__issue200Error = String(error && error.message ? error.message : error)
} finally {
  window.__issue200Ready = true
}
`)
  await writeFile(indexPath, `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="data:,">
  <title>File Viewer issue 200 regression</title>
  <style>
    html, body { margin: 0; background: #dbe3ea; }
    body div { line-height: 3; }
    body table { width: auto; table-layout: auto; }
    body td { box-sizing: content-box; padding: 36px; }
    #viewer { width: 1280px; margin: 0 auto; }
  </style>
</head>
<body>
  <main id="viewer"></main>
  <script type="module" src="/app.js"></script>
</body>
</html>`)

  const esbuildModule = await import(pathToFileURL(pptxRequire.resolve('esbuild')).href)
  const esbuild = esbuildModule.default || esbuildModule
  await esbuild.build({
    entryPoints: [entryPath],
    outfile: join(tempRoot, 'app.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    sourcemap: false,
    logLevel: 'silent',
  })

  return new Map([
    ['/', { path: indexPath, type: 'text/html; charset=utf-8' }],
    ['/index.html', { path: indexPath, type: 'text/html; charset=utf-8' }],
    ['/app.js', { path: join(tempRoot, 'app.js'), type: 'text/javascript; charset=utf-8' }],
    ['/fixture/layout.pptx', { path: fixtureTarget, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }],
    ['/worker/pptx.worker.js', { path: workerTarget, type: 'text/javascript; charset=utf-8' }],
  ])
}

const startHarnessServer = async files => {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
      if (pathname === '/favicon.ico') {
        response.writeHead(204)
        response.end()
        return
      }
      const entry = files.get(pathname)
      if (!entry) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        response.end('Not found')
        return
      }
      const body = await readFile(entry.path)
      response.writeHead(200, {
        'Content-Type': entry.type,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'no-store',
      })
      response.end(body)
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(error instanceof Error ? error.message : String(error))
    }
  })
  await new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer)
    server.listen(0, '127.0.0.1', resolveServer)
  })
  const address = server.address()
  assert(address && typeof address !== 'string', 'Unable to resolve issue #200 harness address')
  return { server, url: `http://127.0.0.1:${address.port}/` }
}

const collectBrowserMetrics = page => page.evaluate(() => {
  const round = value => Math.round(value * 1000) / 1000
  const relativeRect = (element, slide) => {
    const rect = element.getBoundingClientRect()
    const slideRect = slide.getBoundingClientRect()
    return {
      left: round(rect.left - slideRect.left),
      top: round(rect.top - slideRect.top),
      right: round(rect.right - slideRect.left),
      bottom: round(rect.bottom - slideRect.top),
      width: round(rect.width),
      height: round(rect.height),
    }
  }
  const slides = Array.from(document.querySelectorAll('.flyfish-pptx-content > .slide'))
  const slide3 = slides[2]
  const slide4 = slides[3]
  const slide5 = slides[4]
  const tables = Array.from(slide3.querySelectorAll('table')).map(table => {
    const computed = getComputedStyle(table)
    const rect = relativeRect(table, slide3)
    return {
      ...rect,
      declaredWidth: Number.parseFloat(table.style.width),
      declaredHeight: Number.parseFloat(table.style.height),
      tableLayout: computed.tableLayout,
      boxSizing: computed.boxSizing,
      overflow: computed.overflow,
    }
  })
  const cells = Array.from(slide3.querySelectorAll('td')).map(cell => {
    const content = cell.querySelector(':scope > .pptx-table-cell-content')
    const computed = getComputedStyle(cell)
    const contentComputed = getComputedStyle(content)
    return {
      cell: relativeRect(cell, slide3),
      cellBoxSizing: computed.boxSizing,
      cellOverflow: computed.overflow,
      cellPadding: computed.padding,
      content: relativeRect(content, slide3),
      contentOverflow: contentComputed.overflow,
      contentBoxSizing: contentComputed.boxSizing,
      contentPadding: contentComputed.padding,
      clientHeight: content.clientHeight,
      scrollHeight: content.scrollHeight,
      text: (content.textContent || '').replace(/\s+/g, ' ').trim(),
    }
  })
  const textLineHeights = Array.from(slide3.querySelectorAll('.text-block')).map(element => ({
    text: (element.textContent || '').trim(),
    lineHeight: getComputedStyle(element).lineHeight,
  }))
  const paragraphLineHeights = Array.from(slide3.querySelectorAll('.slide-prgrph')).map(paragraph => ({
    text: (paragraph.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    lineHeight: getComputedStyle(paragraph).lineHeight,
    innerLineHeight: paragraph.firstElementChild ? getComputedStyle(paragraph.firstElementChild).lineHeight : '',
  }))
  const narrative2 = Array.from(slide3.querySelectorAll('.slide-prgrph'))
    .find(element => (element.textContent || '').replace(/\s+/g, '').startsWith('2、测试'))
  const labels = ['项目背景', '平台定位', '平台规划', '建设情况', '需决策问题', '附：阶段成果']
    .map(label => {
      const element = Array.from(slide4.querySelectorAll('div.block.content'))
        .find(candidate => (candidate.textContent || '').replace(/\s+/g, '').trim() === label.replace(/\s+/g, ''))
      return {
        label,
        transform: getComputedStyle(element).transform,
        rect: relativeRect(element, slide4),
      }
    })
  const diagram = slide5.querySelector('.diagram-content')
  const diagramSvgs = Array.from(diagram.children).filter(element => element.localName === 'svg')
  return {
    slideCount: slides.length,
    slide3: {
      rect: relativeRect(slide3, slide3),
      tables,
      cells,
      textLineHeights,
      paragraphLineHeights,
      narrative2: narrative2 ? relativeRect(narrative2, slide3) : null,
    },
    slide4: { labels },
    slide5: {
      diagram: relativeRect(diagram, slide5),
      shapes: diagramSvgs.map(element => ({
        rect: relativeRect(element, slide5),
        visible: getComputedStyle(element).visibility !== 'hidden' && Number(getComputedStyle(element).opacity) > 0,
        hasPath: Boolean(element.querySelector('path')),
      })),
    },
  }
})

const assertIdentityTransform = (transform, label) => {
  assert(
    transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)',
    `${label} must be horizontal, received transform ${transform}`
  )
}

const verifyBrowserMetrics = (metrics, browserName) => {
  const prefix = `[${browserName}]`
  assert.equal(metrics.slideCount, 5, `${prefix} must mount all five fixture slides`)
  assert.equal(metrics.slide3.tables.length, 4, `${prefix} slide 3 must render four tables`)
  for (const [index, table] of metrics.slide3.tables.entries()) {
    assert.equal(table.tableLayout, 'fixed', `${prefix} table ${index + 1} host CSS overrode table-layout`)
    assert.equal(table.boxSizing, 'border-box', `${prefix} table ${index + 1} host CSS overrode box-sizing`)
    assert.equal(table.overflow, 'hidden', `${prefix} table ${index + 1} must bound its content`)
    assert(table.left >= -0.1 && table.right <= 1280.1, `${prefix} table ${index + 1} exceeds slide width`)
    assert(table.top >= -0.1 && table.bottom <= 720.1, `${prefix} table ${index + 1} exceeds slide height`)
    assert(Number.isFinite(table.declaredWidth), `${prefix} table ${index + 1} is missing its DrawingML grid width`)
    assert(Math.abs(table.width - table.declaredWidth) <= 2, `${prefix} table ${index + 1} did not retain its DrawingML grid width`)
    assert(Number.isNaN(table.declaredHeight), `${prefix} table ${index + 1} must size from DrawingML rows instead of graphicFrame height`)
  }
  assert(metrics.slide3.tables[0].bottom <= metrics.slide3.tables[1].top + 1, `${prefix} slide 3 upper tables overlap`)
  assert(metrics.slide3.tables[2].bottom <= metrics.slide3.tables[3].top + 1, `${prefix} slide 3 lower tables overlap`)
  assert(metrics.slide3.narrative2, `${prefix} slide 3 second narrative is missing`)
  assert(metrics.slide3.tables[1].bottom <= metrics.slide3.narrative2.top + 1, `${prefix} upper table covers the second narrative`)

  assert(metrics.slide3.cells.length > 40, `${prefix} slide 3 table cells are missing`)
  for (const [index, cell] of metrics.slide3.cells.entries()) {
    assert.equal(cell.cellBoxSizing, 'border-box', `${prefix} cell ${index + 1} host CSS overrode box-sizing`)
    assert.equal(cell.cellOverflow, 'hidden', `${prefix} cell ${index + 1} must bound its contents`)
    assert.equal(cell.cellPadding, '0px', `${prefix} cell ${index + 1} inherited host padding`)
    assert.equal(cell.contentBoxSizing, 'border-box', `${prefix} cell ${index + 1} inset box must use border-box`)
    assert.equal(cell.contentOverflow, 'hidden', `${prefix} cell ${index + 1} inset box must bound its contents`)
    assert(cell.clientHeight > 0, `${prefix} cell ${index + 1} content collapsed`)
    assert(cell.scrollHeight <= cell.clientHeight + 1, `${prefix} cell ${index + 1} vertically clips its text (${cell.scrollHeight}px > ${cell.clientHeight}px)`)
  }
  assert.equal(metrics.slide3.cells[0].contentPadding, '0.933228px 0.933228px 0px', `${prefix} first cell lost its OOXML tcMar insets`)
  assert(metrics.slide3.textLineHeights.length > 40, `${prefix} slide 3 text runs are missing`)
  assert(
    metrics.slide3.textLineHeights.every(entry => entry.lineHeight !== '48px'),
    `${prefix} host body line-height leaked into a PPTX text run`
  )
  assert(
    metrics.slide3.paragraphLineHeights.every(entry => entry.lineHeight !== '48px' && entry.innerLineHeight !== '48px'),
    `${prefix} host body line-height leaked into a PPTX paragraph`
  )

  assert.equal(metrics.slide4.labels.length, 6, `${prefix} slide 4 SmartArt labels are missing`)
  metrics.slide4.labels.forEach(({ label, transform, rect }, index) => {
    assertIdentityTransform(transform, `${prefix} slide 4 ${label}`)
    closeTo(rect.left, 351.58, 0.4, `${prefix} slide 4 ${label} x`)
    closeTo(rect.top, 188 + index * 74.1, 0.5, `${prefix} slide 4 ${label} y`)
    closeTo(rect.width, 606.48, 0.5, `${prefix} slide 4 ${label} width`)
    assert(rect.width > rect.height * 8, `${prefix} slide 4 ${label} regressed to vertical text geometry`)
  })

  assert.equal(metrics.slide5.shapes.length, 5, `${prefix} slide 5 must render a quadArrow plus four cards`)
  const [arrow, ...cards] = metrics.slide5.shapes
  assert(arrow.visible && arrow.hasPath, `${prefix} slide 5 quadArrow is not visible`)
  closeTo(arrow.rect.left, 326.27, 0.4, `${prefix} slide 5 quadArrow x`)
  closeTo(arrow.rect.width, 601.56, 0.5, `${prefix} slide 5 quadArrow width`)
  closeTo(arrow.rect.height, 601.56, 0.5, `${prefix} slide 5 quadArrow height`)
  closeTo(cards[0].rect.left, 280.61, 0.4, `${prefix} slide 5 left card x`)
  closeTo(cards[1].rect.left, 660.67, 0.4, `${prefix} slide 5 right card x`)
  cards.forEach((card, index) => {
    assert(card.visible && card.hasPath, `${prefix} slide 5 card ${index + 1} is not visible`)
    closeTo(card.rect.width, 320.94, 0.5, `${prefix} slide 5 card ${index + 1} width`)
    assert(card.rect.left >= -0.1 && card.rect.right <= 1280.1, `${prefix} slide 5 card ${index + 1} exceeds slide width`)
    assert(card.rect.top >= -0.1 && card.rect.bottom <= 720.1, `${prefix} slide 5 card ${index + 1} exceeds slide height`)
  })
}

const verifyBrowsers = async (tempRoot, baseUrl) => {
  const playwrightModule = await importPlaywright()
  const playwright = playwrightModule.default || playwrightModule
  const browserNames = String(process.env.FILE_VIEWER_ISSUE_200_BROWSERS || 'chromium,firefox,webkit')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  const supportedBrowsers = new Set(['chromium', 'firefox', 'webkit'])
  assert(browserNames.length > 0, 'At least one issue #200 browser engine is required')
  browserNames.forEach(browserName => assert(supportedBrowsers.has(browserName), `Unsupported issue #200 browser: ${browserName}`))

  const outputRoot = process.env.FILE_VIEWER_ISSUE_200_OUTPUT
    ? resolve(process.env.FILE_VIEWER_ISSUE_200_OUTPUT)
    : null
  if (outputRoot) {
    await mkdir(outputRoot, { recursive: true })
  }

  for (const browserName of browserNames) {
    const browserType = playwright[browserName]
    assert(browserType, `Playwright did not expose ${browserName}`)
    const browser = await launchBrowserForTest(browserType, browserName, { headless: true })
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
      page.setDefaultTimeout(timeout)
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') {
          errors.push(`console: ${message.text()}`)
        }
      })
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
      page.on('requestfailed', request => errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText || 'unknown'})`))
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => window.__issue200Ready === true, null, { timeout })
      const renderError = await page.evaluate(() => window.__issue200Error || '')
      assert.equal(renderError, '', `[${browserName}] fixture render failed: ${renderError}`)
      const slideLocator = page.locator('.flyfish-pptx-content > .slide')
      await slideLocator.nth(4).waitFor({ state: 'visible', timeout })
      const metrics = await collectBrowserMetrics(page)
      verifyBrowserMetrics(metrics, browserName)
      assert.deepEqual(errors, [], `[${browserName}] browser errors:\n${errors.join('\n')}`)

      if (outputRoot) {
        await writeFile(join(outputRoot, `${browserName}-metrics.json`), JSON.stringify(metrics, null, 2))
        for (const slideNumber of [3, 4, 5]) {
          await slideLocator.nth(slideNumber - 1).screenshot({
            path: join(outputRoot, `${browserName}-slide-${slideNumber}.png`),
          })
        }
      }
      console.log(`[issue-200-pptx] ${browserName} verified grid-sized tables, horizontal SmartArt text, and slide 5 geometry.`)
      // BEGIN PREPACK COMPLETION OBSERVATION
      await recordBrowserGateCompletion({ gateId: 'issue-200-pptx-layout', engine: browserName, phase: 'full',
        caseIds: ['five-slide-mount', 'slide3-tables-and-paragraphs', 'slide4-horizontal-smartart', 'slide5-geometry'], fixtures: ['issue-200-reporter-pptx'],
        summary: { slideCount: metrics.slideCount, sharedWorkerMarkupPrerequisite: true } })
      // END PREPACK COMPLETION OBSERVATION
    } finally {
      await browser.close()
    }
  }
}

const main = async () => {
  assert(existsSync(fixturePath), `Missing issue #200 fixture: ${fixturePath}`)
  assert(existsSync(workerPath), `Missing built PPTX worker: ${workerPath}; run pnpm --filter @file-viewer/pptx build first`)
  // BEGIN PREPACK COMPLETION OBSERVATION
  if (process.env.FILE_VIEWER_PREPACK_TRACE_DIR) {
    await recordBrowserGateFixture('issue-200-pptx-layout', 'test/fixtures/issue-200/layout.pptx', await readFile(fixturePath))
  }
  // END PREPACK COMPLETION OBSERVATION
  const tempRoot = await mkdtemp(join(tmpdir(), 'file-viewer-issue-200-'))
  let server
  try {
    const workerOutputPath = join(tempRoot, 'worker-output.json')
    const messages = await runWorkerChild(workerOutputPath)
    await verifyWorkerMarkup(messages)
    const files = await createBrowserHarness(tempRoot)
    const started = await startHarnessServer(files)
    server = started.server
    await verifyBrowsers(tempRoot, started.url)
  } finally {
    if (server) {
      await new Promise(resolveClose => server.close(resolveClose))
    }
    await rm(tempRoot, { recursive: true, force: true })
  }
}

await main()
