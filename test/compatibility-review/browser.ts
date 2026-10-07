import * as helpers from './entry.js'
import renderMarkdown from '../../packages/renderers/text/src/markdown.js'
import renderDocx from '../../packages/renderers/word/src/wordDocx.js'
import {
  registerPptxChartLibraryLoader,
  renderPptxPostProcessing
} from '../../packages/renderers/pptx/src/chart.js'
import * as billboard from 'billboard.js'
import * as d3Format from 'd3-format'
registerPptxChartLibraryLoader(async () => ({ billboard, d3Format }))
Object.assign(window, {
  review: { ...helpers, renderMarkdown, renderDocx, renderPptxPostProcessing }
})
