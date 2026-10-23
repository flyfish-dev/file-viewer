import { writeFileSync, mkdirSync, mkdtempSync, copyFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// Project-authored demonstration. All organizations, numbers and decisions are
// fictional. Native text, tables, links and fields are authored by office-cli.
const appRoot = resolve(import.meta.dirname, '..')
const output = resolve(appRoot, 'public/example/en/quarterly-operations-report.docx')
const sourceDirectory = resolve(appRoot, 'public/example/sources/quarterly-operations-report')
const work = mkdtempSync(resolve(tmpdir(), 'file-viewer-business-report-'))
const file = resolve(work, 'quarterly-operations-report.docx')
const commands = []
let paragraph = 0,
  tableIndex = 0
const props = (values) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)]))
const set = (path, values) => commands.push({ command: 'set', path, props: props(values) })
const add = (parent, type, values) =>
  commands.push({ command: 'add', parent, type, props: props(values) })
const p = (text, style = 'Normal', extra = {}) => {
  add('/body', 'paragraph', { text, style, ...extra })
  paragraph++
  return `/body/p[${paragraph}]`
}
const h = (text, bookmark, page = true) => {
  const path = p(text, 'Heading1', { pageBreakBefore: page, keepNext: true })
  if (bookmark) add(path, 'bookmark', { name: bookmark })
  return path
}
const sub = (text) => p(text, 'Heading2', { keepNext: true })
const csv = (rows) =>
  rows.map((row) => row.map((c) => '"' + String(c).replaceAll('"', '""') + '"').join(',')).join(';')
function table(rows, widths, { headers = 1, numeric = [], merged = false } = {}) {
  const index = ++tableIndex,
    path = `/body/tbl[${index}]`
  add('/body', 'table', {
    data: csv(rows),
    width: '6.9in',
    colWidths: widths.map((v) => Math.round(v * 1440)).join(','),
    layout: 'fixed',
    padding: 100,
    'border.all': 'single;0.5pt;D9D9D9'
  })
  for (let r = 1; r <= rows.length; r++) {
    if (r <= headers) set(path + `/tr[${r}]`, { header: true })
    for (let c = 1; c <= rows[r - 1].length; c++)
      set(path + `/tr[${r}]/tc[${c}]`, {
        font: 'Arial',
        size: r <= headers ? 10 : 10.5,
        color: '000000',
        fill: r <= headers ? 'E6EFF5' : 'FFFFFF',
        bold: r <= headers,
        align: numeric.includes(c) ? 'center' : 'left',
        valign: 'center',
        'padding.top': '4pt',
        'padding.bottom': '4pt',
        'padding.left': '6pt',
        'padding.right': '6pt',
        'border.all': 'single;0.5pt;D9D9D9'
      })
  }
  if (merged) {
    for (const c of [6, 4, 2]) set(path + `/tr[1]/tc[${c}]`, { colspan: 2 })
    set(path + '/tr[1]/tc[1]', { vmerge: 'restart' })
    set(path + '/tr[2]/tc[1]', { vmerge: 'continue' })
  }
  return path
}
const caption = (text) => p(text, 'Caption')
const picture = (source, width, height, alt, floating = false) => {
  const path = p('', 'Normal', { spaceBefore: '4pt', spaceAfter: '8pt' })
  add(path, 'picture', {
    src: resolve(work, source),
    width,
    height,
    alt,
    ...(floating
      ? {
          anchor: true,
          wrap: 'square',
          hRelative: 'margin',
          hAlign: 'right',
          vRelative: 'paragraph',
          vPosition: '0cm'
        }
      : {})
  })
}

set('/', {
  title: 'Quarterly operations and risk review',
  subject: 'Fictional business report for the File Viewer demonstration',
  author: 'File Viewer contributors',
  lastModifiedBy: 'File Viewer contributors',
  keywords: 'fictional example operations quarterly report File Viewer',
  locale: 'en-US',
  created: '2026-10-20T00:00:00Z',
  modified: '2026-10-20T00:00:00Z',
  pageWidth: '8.5in',
  pageHeight: '11in',
  marginTop: '0.75in',
  marginBottom: '0.7in',
  marginLeft: '0.8in',
  marginRight: '0.8in',
  marginHeader: '0.3in',
  marginFooter: '0.3in',
  'docDefaults.font': 'Arial',
  'docDefaults.font.eastAsia': 'Arial',
  'docDefaults.fontSize': '11.5',
  'docDefaults.color': '000000',
  updateFields: true
})
set('/styles/Normal', {
  font: 'Arial',
  size: 11.5,
  color: '000000',
  spaceAfter: '7pt',
  lineSpacing: '1.15x'
})
for (const [id, size, bold, before, after] of [
  ['Title', 32, true, 0, 18],
  ['Subtitle', 16, false, 0, 12],
  ['Heading1', 20, true, 0, 12],
  ['Heading2', 13, true, 12, 6],
  ['Caption', 9.5, false, 4, 9],
  ['TOC1', 11.5, false, 0, 10]
])
  add('/styles', 'style', {
    id,
    name: id,
    type: 'paragraph',
    basedOn: 'Normal',
    next: 'Normal',
    font: 'Arial',
    size,
    color: '000000',
    bold,
    spaceBefore: before + 'pt',
    spaceAfter: after + 'pt',
    lineSpacing: '1.15x'
  })
add('/', 'header', {
  type: 'default',
  text: 'EXAMPLE OPERATIONS    Fictional business report',
  font: 'Arial',
  size: 9,
  color: '000000'
})
add('/', 'footer', {
  type: 'default',
  text: 'Fictional example    Page ',
  field: 'page',
  font: 'Arial',
  size: 9,
  color: '000000',
  align: 'right'
})
add('/footer[1]/p[1]', 'run', { text: ' of ', font: 'Arial', size: 9 })
add('/footer[1]/p[1]', 'field', { fieldType: 'numpages' })

p('Quarterly operations and risk review', 'Title')
p('Third quarter 2026', 'Subtitle')
p(
  'Example Operations is a fictional service business. This project-authored report contains invented organizations, operating data and decisions for the File Viewer demonstration. It describes no real company, customer or financial result.'
)
p(
  'The quarter closed above plan. Delivery reliability improved and the renewal pipeline remained healthy, but specialist capacity and supplier concentration require attention. The recommended response is four targeted hires, a staged renewal plan and a weekly capacity review.'
)
sub('Quarter at a glance')
table(
  [
    ['Measure', 'Q3 actual', 'Q3 plan', 'Q2 actual'],
    ['Revenue in USD millions', '4.82', '4.65', '4.29'],
    ['Gross margin', '38.6%', '37.5%', '36.8%'],
    ['On time delivery', '95.8%', '95.0%', '93.7%'],
    ['Active customers', '42', '40', '37'],
    ['Net promoter score', '46', '45', '43'],
    ['Average full time equivalent staff', '168', '170', '156']
  ],
  [2.7, 1.4, 1.4, 1.4],
  { numeric: [2, 3, 4] }
)
caption('Reporting period 1 July to 30 September 2026. Currency is USD. Every value is fictional.')
p(
  'Prepared for the demonstration management team by File Viewer contributors. The review covers service delivery, customer quality and operating risk for one quarter. Its proposed actions and planning assumptions are illustrative.',
  'Normal',
  { spaceBefore: '10pt' }
)

h('Contents', 'contents')
p(
  'The review moves from the quarter result to the actions needed for the next ninety days. Use the linked sections to move between the operating evidence, the decisions requested and the definitions used in each comparison.'
)
const contents = [
  ['Executive review', 'executive', 3],
  ['Delivery performance', 'delivery', 4],
  ['Customers and quality', 'customers', 5],
  ['Risks and controls', 'risks', 6],
  ['Next ninety days', 'actions', 7],
  ['Planning scenarios', 'scenarios', 8],
  ['Metric definitions', 'definitions', 9]
]
for (const [title, bookmark, pageNumber] of contents) {
  const path = p('', 'TOC1')
  add(path, 'hyperlink', {
    anchor: bookmark,
    text: String(pageNumber).padStart(2, '0') + '   ' + title,
    color: '174F68',
    underline: false,
    font: 'Arial',
    size: 11.5
  })
}
sub('How to read this report')
p(
  'Actual and plan refer to the same quarter and accounting boundary. Percentages describe the stated population; a change in percentage points is not a relative growth rate. Operational measures use completed work, while the backlog describes approved work not yet delivered.'
)
p(
  'Read the quarter scorecard together with the narrative. A favorable revenue result can coexist with a capacity constraint or a weakening renewal position. The next ninety days section identifies the evidence needed before each proposed action is considered complete.'
)
sub('Scenario boundary')
p(
  'The fictional organization provides customer onboarding, managed delivery and platform enablement services. It operates one reporting currency and a shared delivery team. No acquisitions, restructuring charges or foreign exchange movements are included in the comparison.'
)

h('Executive review', 'executive')
p(
  'Revenue reached USD 4.82 million, USD 0.17 million above the quarterly plan and 12.4 percent above the prior quarter after rounding. The improvement came from a steadier delivery schedule and the completion of work that had remained in the opening backlog. It did not depend on a single new customer or a one time accounting adjustment.'
)
p(
  'Gross margin rose to 38.6 percent as fewer projects required unplanned rework. This gain should be treated as an operating improvement that still needs to hold through the renewal cycle. A higher share of specialist work also lifted the average price per completed engagement, which limits how much of the margin change can be attributed to process efficiency alone.'
)
p(
  'The main constraint has shifted from the availability of general delivery capacity to the availability of experienced specialists. Four planned hires would reduce that constraint, but recruitment should follow confirmed demand. Team leads should protect time for training and handover so that the existing team does not absorb all of the onboarding cost.'
)
sub('Decisions requested')
table(
  [
    ['Decision', 'Proposed action', 'Owner and review date'],
    [
      'Specialist capacity',
      'Approve four hires in two stages tied to signed demand.',
      'Operations lead  15 November 2026'
    ],
    [
      'Renewal exposure',
      'Review the six largest renewals with a named backup owner.',
      'Customer lead  6 November 2026'
    ],
    [
      'Supplier continuity',
      'Complete a fallback test for the primary service provider.',
      'Technology lead  20 November 2026'
    ]
  ],
  [1.6, 3.1, 2.2]
)
caption(
  'These are fictional management decisions, included to demonstrate a usable review document.'
)
sub('What would change the recommendation')
p(
  'The hiring sequence should pause if contracted demand falls below the base case for two consecutive monthly reviews. The supplier test should proceed in every scenario because it addresses continuity rather than growth. Management should review the same measures together and record any exception with an owner and an expiry date.'
)

h('Delivery performance', 'delivery')
p(
  'The team completed 326 service engagements and ended the quarter with 87 approved engagements in backlog. Customer onboarding improved its on time result, while managed delivery accounted for most of the remaining late work. The two row header groups related measures without changing the unit of any column.'
)
table(
  [
    ['Workstream', 'Volume', '', 'Service', '', 'Capacity', ''],
    ['', 'Closed', 'Backlog', 'On time', 'CSAT of 5', 'FTE', 'Utilization'],
    ['Customer onboarding', '118', '24', '97.5%', '4.6', '45', '81%'],
    ['Managed delivery', '146', '46', '94.0%', '4.4', '87', '85%'],
    ['Platform enablement', '62', '17', '96.8%', '4.5', '36', '82%'],
    ['Quarter total', '326', '87', '95.8%', '4.5', '168', '83%']
  ],
  [1.65, 0.86, 0.78, 1, 0.8, 0.72, 1.09],
  { headers: 2, numeric: [2, 3, 4, 5, 6, 7], merged: true }
)
caption(
  'Table 1 Delivery scorecard. Totals are weighted where appropriate; displayed values are rounded.'
)
picture(
  'revenue-chart.png',
  '6.9in',
  '2.15625in',
  'Fictional monthly revenue and plan in USD millions for July August and September 2026'
)
caption(
  'Figure 1 Monthly revenue and plan. Actual 1.52 plus 1.57 plus 1.73 equals the quarterly total of USD 4.82 million.'
)
p(
  'September was the strongest month, but the quarter did not end with an unusual spike in completed engagements. The operating review should therefore track both invoicing and completion dates to avoid interpreting billing timing as a change in customer demand.'
)

h('Customers and quality', 'customers')
p(
  'Active customers increased from 37 to 42 across the three service lines. No customer represented more than one tenth of revenue. Six large renewals fall in the next quarter, making handover quality a retention priority.'
)
picture(
  'delivery-cycle.png',
  '2.2in',
  '2.42in',
  'The fictional service cycle from intake through capacity check delivery and review',
  true
)
sub('A consistent service cycle')
p(
  'Agree the outcome and owner before checking specialist availability. Promise a date only after that check. At delivery, record acceptance and assign any remaining work.'
)
p(
  'Review customer concerns as specific process changes. Carry those lessons into the next capacity review while they can still change a delivery decision.'
)
sub('Quality signals')
table(
  [
    ['Measure', 'Q2', 'Q3', 'Interpretation'],
    ['Confirmed service incidents', '21', '17', 'Fewer repeat issues after handover checks.'],
    [
      'Median issue response time',
      '5.2 hours',
      '4.1 hours',
      'Faster initial ownership of reported issues.'
    ],
    ['Customer survey responses', '104', '126', 'A wider response base supports the comparison.'],
    ['Net promoter score', '43', '46', 'Positive direction with normal sampling uncertainty.']
  ],
  [2.05, 1.0, 1.0, 2.85],
  { numeric: [2, 3] }
)
caption('Table 2 Fictional reporting population. These values are not industry benchmarks.')
p(
  'Read individual comments alongside the scores. Separate recurring problems from one off preferences, and confirm that the agreed action reached the customer.'
)

h('Risks and controls', 'risks')
p(
  'The risk register focuses on events that could change a decision in the next quarter. Likelihood and impact are assessed on a three level scale. The owner is responsible for the next evidence check, not merely for reporting that a control exists.'
)
table(
  [
    ['Risk', 'Likelihood', 'Impact', 'Current control', 'Next evidence and owner'],
    [
      'Specialist capacity',
      'Medium',
      'High',
      'Weekly allocation review and two stage hiring.',
      'Signed demand and hiring gate  Operations'
    ],
    [
      'Renewal concentration',
      'Medium',
      'High',
      'Named sponsor and backup for six major renewals.',
      'Documented renewal plans  Customer team'
    ],
    [
      'Supplier interruption',
      'Low',
      'High',
      'Secondary route and documented recovery steps.',
      'Observed fallback test  Technology'
    ],
    [
      'Unplanned rework',
      'Medium',
      'Medium',
      'Acceptance criteria and peer review before handover.',
      'Repeat incident trend  Quality'
    ],
    [
      'Data access errors',
      'Low',
      'High',
      'Role review and time limited elevated access.',
      'Completed access sample  Security'
    ],
    [
      'Forecast optimism',
      'Medium',
      'Medium',
      'Separate contracted backlog from unapproved pipeline.',
      'Monthly reconciliation  Finance'
    ]
  ],
  [1.2, 1.05, 0.85, 1.8, 2.0]
)
caption(
  'Table 3 A fictional risk register with proportionate controls and specific evidence checks.'
)
sub('Escalation and review')
p(
  'An owner should escalate when a promised control cannot be demonstrated, when a high impact event occurs, or when the review date passes without evidence. Escalation should name the decision required and the safe operating limit until it is made. A longer register is not the objective; a clear link from risk to action is.'
)
p(
  'The supplier continuity test is the most useful near term check because a written fallback can become outdated without visible symptoms. The test should record the time to resume service, the transactions reconciled and the remaining manual work. Those observations determine the next control improvement.'
)

h('Next ninety days', 'actions')
p(
  'The plan converts the review into a short sequence of decisions and verifiable outcomes. The first month establishes ownership and baseline evidence. The second month tests the proposed controls. The third month checks whether the changes worked before the next quarterly review.'
)
table(
  [
    ['Period', 'Priority', 'Deliverable', 'Owner', 'Completion evidence'],
    [
      'Days 1 to 30',
      'Confirm demand and ownership',
      'Signed demand view and renewal plans.',
      'Operations and Customer',
      'Approved allocation and six plans.'
    ],
    [
      'Days 1 to 30',
      'Complete access review',
      'Risk based sample of active access.',
      'Security',
      'Exceptions assigned and dated.'
    ],
    [
      'Days 31 to 60',
      'Test continuity',
      'Observed supplier fallback exercise.',
      'Technology',
      'Recovery log and reconciliation.'
    ],
    [
      'Days 31 to 60',
      'Add targeted capacity',
      'First two specialists and handover plan.',
      'Operations',
      'Training and supervised delivery.'
    ],
    [
      'Days 61 to 90',
      'Evaluate the change',
      'Compare late work and repeat incidents.',
      'Quality',
      'Same definitions and population.'
    ],
    [
      'Days 61 to 90',
      'Decide the second hiring stage',
      'Confirm the demand and margin case.',
      'Management',
      'Recorded decision and assumptions.'
    ]
  ],
  [0.95, 1.35, 1.85, 1.05, 1.7]
)
caption(
  'Table 4 Owners are fictional roles. Dates and actions are examples, not commitments by the File Viewer project.'
)
sub('Operating rhythm')
p(
  'Use a weekly delivery review for immediate allocation problems and a monthly management review for changes to the plan. Keep a single decision log so that the same exception is not reconsidered without new information. Each item should include the observed fact, the decision, the owner and the date of the next check.'
)
p(
  'At the end of ninety days, the review should be able to show whether the process reduced repeated late work, whether specialists became available when promised and whether customers received a clearer handover. A completed task list alone is not sufficient evidence of an operating improvement.'
)

h('Planning scenarios', 'scenarios')
p(
  'The scenarios are planning boundaries built from the same fictional service mix. They are not predictions. Management can use them to decide which commitments are reversible and which controls should continue even when demand changes.'
)
table(
  [
    ['Planning measure', 'Lower demand', 'Base case', 'Higher demand'],
    ['Next quarter revenue USD million', '4.40', '5.05', '5.45'],
    ['Gross margin assumption', '36.5%', '38.5%', '39.0%'],
    [
      'Specialist hiring sequence',
      'First two only',
      'Two then two',
      'Two then two with contractor cover'
    ],
    ['Capacity review', 'Weekly', 'Weekly', 'Twice weekly during peaks'],
    ['Continuity test', 'Proceed', 'Proceed', 'Proceed']
  ],
  [2.3, 1.45, 1.45, 1.7]
)
caption(
  'Table 5 Fictional planning assumptions. Scenario values are deliberately distinct from the Q3 actuals.'
)
sub('Sensitivity and decision limits')
p(
  'The hiring decision is most sensitive to the conversion of contracted backlog into scheduled work. A lower revenue case does not justify removing basic controls, but it can justify delaying the second hiring stage. The higher case needs the same evidence of deliverable capacity before additional dates are promised to customers.'
)
p(
  'Do not combine the best revenue assumption with the lowest cost assumption without explaining how both could occur. Each scenario should remain internally coherent. The monthly review should replace an assumption with an observation as soon as the information becomes available.'
)
sub('What to monitor next')
p(
  'Monitor signed backlog by start date, specialist availability by skill, renewal decisions and repeated service incidents. Read these together. A growing backlog with a stable completion rate may indicate a capacity constraint; a growing backlog with delayed customer approval may indicate a scheduling problem that hiring would not solve.'
)

h('Metric definitions', 'definitions')
p(
  'The glossary keeps the comparisons consistent across the narrative, charts and tables. Rounding is applied only to the displayed result; underlying example values remain unchanged. No measure in this report represents a real customer, employee or commercial operation.'
)
table(
  [
    ['Measure', 'Definition', 'Reporting note'],
    ['Revenue', 'Service revenue recognized within the quarter.', 'Shown in USD millions.'],
    [
      'Gross margin',
      'Revenue less direct delivery cost divided by revenue.',
      'Expressed as a percentage.'
    ],
    [
      'On time delivery',
      'Engagements accepted by the agreed date divided by completed engagements.',
      'Weighted by engagement count.'
    ],
    [
      'Active customer',
      'A customer with recognized service revenue in the quarter.',
      'Counted once across service lines.'
    ],
    [
      'Backlog',
      'Approved engagements not yet completed at quarter end.',
      'Excludes unapproved pipeline.'
    ],
    [
      'Full time equivalent',
      'Average contracted working capacity during the quarter.',
      'Not a count of named people.'
    ],
    [
      'Utilization',
      'Delivery hours divided by available service hours.',
      'Training and leave remain visible.'
    ],
    [
      'CSAT',
      'Mean score on a five point customer satisfaction question.',
      'Rounded to one decimal place.'
    ],
    [
      'Net promoter score',
      'Share of promoters less share of detractors.',
      'Reported as points, not a percent.'
    ]
  ],
  [1.45, 3.35, 2.1]
)
caption(
  'Table 6 Definitions support this fictional example and should be adapted to a real reporting policy before use.'
)
sub('Document provenance')
p(
  'This report and its original figures were authored for the File Viewer project and are distributed under Apache License 2.0 with the repository. It contains no real company information, copied customer document, external corporate identity or third party business data.'
)
const back = p('', 'Normal')
add(back, 'hyperlink', {
  anchor: 'contents',
  text: 'Return to contents',
  color: '174F68',
  underline: false
})

const cycle = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="660" viewBox="0 0 600 660"><rect width="600" height="660" fill="white"/><g font-family="Arial,sans-serif" fill="black" text-anchor="middle">${[
  ['Intake', 'Agree the outcome'],
  ['Capacity', 'Confirm availability'],
  ['Deliver', 'Record acceptance'],
  ['Review', 'Close the feedback']
]
  .map(
    ([a, b], i) =>
      `<rect x="45" y="${20 + i * 160}" width="510" height="118" rx="10" fill="#e6eff5" stroke="#b4c7d4"/><text x="300" y="${65 + i * 160}" font-size="36" font-weight="bold">${a}</text><text x="300" y="${107 + i * 160}" font-size="29">${b}</text>${i < 3 ? `<path d="M300 ${140 + i * 160}v32m-10-10 10 10 10-10" fill="none" stroke="#174f68" stroke-width="4"/>` : ''}`
  )
  .join('')}</g></svg>`
mkdirSync(work, { recursive: true })
writeFileSync(resolve(work, 'delivery-cycle.svg'), cycle)
const figure = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="500" viewBox="0 0 1600 500"><rect width="1600" height="500" fill="white"/><g font-family="Arial,sans-serif" fill="#111" font-size="30"><text x="80" y="44" font-size="34">Monthly revenue and plan</text><text x="80" y="84" font-size="25">USD million Fictional data</text>${[0, 0.5, 1, 1.5, 2].map((v) => `<line x1="130" y1="${410 - v * 145}" x2="1510" y2="${410 - v * 145}" stroke="#d9d9d9"/><text x="55" y="${420 - v * 145}">${v.toFixed(1)}</text>`).join('')}${[
  ['July', 1.52, 1.48],
  ['August', 1.57, 1.52],
  ['September', 1.73, 1.65]
]
  .map(([m, a, b], i) => {
    const x = 300 + i * 410
    return `<rect x="${x}" y="${410 - a * 145}" width="100" height="${a * 145}" fill="#174f68"/><rect x="${x + 112}" y="${410 - b * 145}" width="100" height="${b * 145}" fill="#a6c9da"/><text x="${x + 50}" y="${392 - a * 145}" text-anchor="middle">${a.toFixed(2)}</text><text x="${x + 162}" y="${392 - b * 145}" text-anchor="middle">${b.toFixed(2)}</text><text x="${x + 100}" y="465" text-anchor="middle">${m}</text>`
  })
  .join(
    ''
  )}<rect x="1030" y="35" width="30" height="25" fill="#174f68"/><text x="1074" y="60">Actual</text><rect x="1240" y="35" width="30" height="25" fill="#a6c9da"/><text x="1284" y="60">Plan</text></g></svg>`
writeFileSync(resolve(work, 'revenue-chart.svg'), figure)
const browser = await chromium.launch({ headless: true })
try {
  for (const [name, svg, width, height] of [
    ['revenue-chart', figure, 1600, 500],
    ['delivery-cycle', cycle, 600, 660]
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.setContent('<html><body style="margin:0">' + svg + '</body></html>')
    await page.locator('svg').screenshot({ path: resolve(work, name + '.png') })
    await page.close()
  }
} finally {
  await browser.close()
}
const create = spawnSync('office-cli', ['create', file, '--locale', 'en-US'], { encoding: 'utf8' })
if (create.status !== 0) throw new Error(create.stderr || create.stdout)
writeFileSync(resolve(work, 'report-batch.json'), JSON.stringify(commands, null, 2) + '\n')
const result = spawnSync(
  'office-cli',
  ['batch', file, '--input', resolve(work, 'report-batch.json'), '--stop-on-error', '--json'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
)
writeFileSync(resolve(work, 'authoring-result.json'), result.stdout)
writeFileSync(resolve(work, 'authoring-stderr.log'), result.stderr)
if (result.status !== 0) {
  console.error(result.stdout.slice(-6000), result.stderr)
  process.exit(result.status || 1)
}
for (const [style, level] of [
  ['Heading1', 0],
  ['Heading2', 1]
]) {
  const patch = spawnSync(
    'office-cli',
    [
      'raw-set',
      file,
      '/styles',
      '--xpath',
      `//w:style[@w:styleId='${style}']/w:pPr`,
      '--action',
      'append',
      '--xml',
      `<w:outlineLvl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:val="${level}"/>`
    ],
    { encoding: 'utf8' }
  )
  if (patch.status !== 0) {
    console.error(patch.stdout, patch.stderr)
    process.exit(patch.status || 1)
  }
}
const close = spawnSync('office-cli', ['close', file], { encoding: 'utf8' })
if (close.status !== 0) {
  console.error(close.stderr)
  process.exit(close.status || 1)
}
console.log(
  JSON.stringify({
    file,
    commands: commands.length,
    bodyParagraphs: paragraph,
    tables: tableIndex,
    nativePageSections: 9,
    allDataFictional: true
  })
)

mkdirSync(sourceDirectory, { recursive: true })
mkdirSync(resolve(appRoot, 'public/example/en'), { recursive: true })
copyFileSync(file, output)
for (const name of ['revenue-chart', 'delivery-cycle'])
  copyFileSync(resolve(work, name + '.svg'), resolve(sourceDirectory, name + '.svg'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const bytes = readFileSync(output)
writeFileSync(
  resolve(sourceDirectory, 'source.json'),
  JSON.stringify(
    {
      title: 'Quarterly operations and risk review',
      organization: 'Example Operations (fictional)',
      reportingPeriod: '2026 Q3 (fictional data)',
      author: 'File Viewer contributors',
      license: 'Apache-2.0',
      generator: 'apps/viewer-demo/scripts/generate-business-report.mjs',
      authoringTool: 'office-cli 1.0.157',
      disclosure:
        'Project-authored fictional organization, figures and decisions. No real company or customer data.',
      document: {
        path: '/example/en/quarterly-operations-report.docx',
        sha256: hash(bytes),
        bytes: bytes.length
      },
      figures: ['revenue-chart', 'delivery-cycle'].map((name) => ({
        path: name + '.svg',
        sha256: hash(readFileSync(resolve(sourceDirectory, name + '.svg')))
      }))
    },
    null,
    2
  ) + '\n'
)
console.log(
  'Rebuild the business-report thumbnail with generate-sample-previews.mjs after building the Demo.'
)
