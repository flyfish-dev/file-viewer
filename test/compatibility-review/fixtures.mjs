/** Original deterministic test data: no embedded documents, images or fonts. */
export const markdownFixture = `# Contents
[Unicode heading](#章节-一) · [Repeated heading](#repeat-1)

${Array.from({ length: 18 }, (_, i) => `Paragraph ${i + 1}: predictable scrolling content.`).join('\n\n')}

## 章节 一
Unicode destination.

## Repeat
First occurrence.

## Repeat
Second occurrence.
`

export function tableModel({ tablePropsToState, paraPropsToState, charPropsToState }) {
  const state = { ...tablePropsToState([]), alignment: 1, leftIndent: -120 }
  const paragraph = (text) => ({
    type: 'paragraph',
    id: text,
    text,
    styleName: '',
    paraState: paraPropsToState([]),
    inlines: [{ type: 'text', text, style: charPropsToState([]) }]
  })
  const cell = (left, right, colIndex, colspan, label, vertical = false) => ({
    id: label,
    colIndex,
    colspan,
    rowspan: 1,
    hidden: false,
    paragraphs: [paragraph(label)],
    meta: {
      leftBoundary: left,
      rightBoundary: right,
      width: right - left,
      vertAlign: 1,
      textFlow: vertical ? 5 : 0,
      borders: { all: { borderType: 1, lineWidth: 8, colorIndex: 1 } }
    }
  })
  return {
    assets: [],
    warnings: [],
    metadata: {},
    blocks: [
      {
        type: 'table',
        id: 'layout',
        depth: 1,
        gridWidthTwips: 6000,
        state,
        rows: [
          {
            id: 'r1',
            state: { ...state, rowHeight: 900 },
            cells: [cell(0, 1200, 0, 1, 'Header'), cell(1200, 6000, 1, 2, 'Merged heading')]
          },
          {
            id: 'r2',
            state: { ...state, rowHeight: 1800 },
            cells: [
              cell(0, 1200, 0, 1, '纵向文字', true),
              cell(1200, 3000, 1, 1, 'Narrow'),
              cell(3000, 6000, 2, 1, 'Wide')
            ]
          }
        ]
      }
    ]
  }
}

const A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const C = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const standard = '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}'
const rels = (items) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join('')}</Relationships>`
const frame = (id, x, y, width, height, data) =>
  `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Object ${id}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${x * 9525}" y="${y * 9525}"/><a:ext cx="${width * 9525}" cy="${height * 9525}"/></p:xfrm><a:graphic><a:graphicData uri="${data.startsWith('<a:tbl') ? A.replace('/main', '/table') : C}">${data}</a:graphicData></a:graphic></p:graphicFrame>`
const slide = (content) =>
  `<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" xmlns:c="${C}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${content}</p:spTree></p:cSld></p:sld>`
const cellXml = (text) =>
  `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${text}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`
const chart = (kind) =>
  `<c:chartSpace xmlns:c="${C}" xmlns:a="${A}"><c:chart><c:plotArea><c:layout/><c:${kind}><c:barDir val="col"/><c:grouping val="standard"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Series</c:v></c:tx><c:cat><c:strLit><c:ptCount val="3"/>${['A', 'B', 'C'].map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:strLit></c:cat><c:val><c:numLit><c:ptCount val="3"/>${[3, 7, 4].map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numLit></c:val></c:ser></c:${kind}></c:plotArea></c:chart></c:chartSpace>`

export async function makePresentation(
  JSZip,
  { unknownStyle = false, explicitStyle = false, missingTableProperties = false } = {}
) {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>${[1, 2, 3].map((i) => `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`
  )
  zip.file('_rels/.rels', rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]))
  zip.file(
    'ppt/presentation.xml',
    `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId5"/></p:sldMasterIdLst><p:sldIdLst>${[1, 2, 3].map((i) => `<p:sldId id="${255 + i}" r:id="rId${i}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`
  )
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    rels([
      ...[1, 2, 3].map((i) => [`rId${i}`, 'slide', `slides/slide${i}.xml`]),
      ['rId4', 'theme', 'theme/theme1.xml'],
      ['rId5', 'slideMaster', 'slideMasters/slideMaster1.xml'],
      ['rId6', 'tableStyles', 'tableStyles.xml']
    ])
  )
  const emptyTree =
    '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree>'
  zip.file(
    'ppt/slideMasters/slideMaster1.xml',
    `<p:sldMaster xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld>${emptyTree}</p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" tx1="dk1" tx2="dk2" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`
  )
  zip.file(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    rels([
      ['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'],
      ['rId2', 'theme', '../theme/theme1.xml']
    ])
  )
  zip.file(
    'ppt/slideLayouts/slideLayout1.xml',
    `<p:sldLayout xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" type="blank" preserve="1"><p:cSld>${emptyTree}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
  )
  zip.file(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']])
  )
  for (const i of [1, 3])
    zip.file(
      `ppt/slides/_rels/slide${i}.xml.rels`,
      rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']])
    )
  const colors = {
    dk1: '000000',
    lt1: 'FFFFFF',
    dk2: '172033',
    lt2: 'EEEEEE',
    accent1: '28649B',
    accent2: 'B85A27',
    accent3: '60842B',
    accent4: '6E5096',
    accent5: '258E97',
    accent6: 'CBAC22',
    hlink: '0000FF',
    folHlink: '800080'
  }
  zip.file(
    'ppt/theme/theme1.xml',
    `<a:theme xmlns:a="${A}" name="Test"><a:themeElements><a:clrScheme name="Test">${Object.entries(
      colors
    )
      .map(([k, v]) => `<a:${k}><a:srgbClr val="${v}"/></a:${k}>`)
      .join(
        ''
      )}</a:clrScheme><a:fontScheme name="Test"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Test"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements></a:theme>`
  )
  const definitions = explicitStyle
    ? `<a:tblStyle styleId="${standard}" styleName="Explicit"><a:wholeTbl><a:tcStyle><a:tcBdr>${['left', 'right', 'top', 'bottom'].map((s) => `<a:${s}><a:ln w="25400"><a:solidFill><a:srgbClr val="AA1122"/></a:solidFill></a:ln></a:${s}>`).join('')}</a:tcBdr></a:tcStyle></a:wholeTbl></a:tblStyle>`
    : ''
  zip.file(
    'ppt/tableStyles.xml',
    `<a:tblStyleLst xmlns:a="${A}" def="${standard}">${definitions}</a:tblStyleLst>`
  )
  const table = `<a:tbl>${missingTableProperties ? '' : `<a:tblPr firstRow="1" bandRow="1" firstCol="1">${unknownStyle ? '<a:tableStyleId>{00000000-0000-0000-0000-000000000001}</a:tableStyleId>' : ''}</a:tblPr>`}<a:tblGrid><a:gridCol w="2857500"/><a:gridCol w="3810000"/></a:tblGrid>${['Header', 'Row 1', 'Row 2'].map((t, i) => `<a:tr h="571500">${cellXml(t)}${cellXml('Value ' + i)}</a:tr>`).join('')}</a:tbl>`
  zip.file('ppt/slides/slide1.xml', slide(frame(2, 60, 80, 700, 180, table)))
  zip.file(
    'ppt/slides/slide2.xml',
    slide(
      frame(2, 40, 100, 540, 420, '<c:chart r:id="rId1"/>') +
        frame(3, 660, 100, 540, 420, '<c:chart r:id="rId2"/>')
    )
  )
  zip.file(
    'ppt/slides/_rels/slide2.xml.rels',
    rels([
      ['rId1', 'chart', '../charts/chart1.xml'],
      ['rId2', 'chart', '../charts/chart2.xml'],
      ['rId3', 'slideLayout', '../slideLayouts/slideLayout1.xml']
    ])
  )
  zip.file('ppt/charts/chart1.xml', chart('lineChart'))
  zip.file('ppt/charts/chart2.xml', chart('barChart'))
  zip.file('ppt/slides/slide3.xml', slide(frame(2, 60, 80, 700, 180, table)))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

export async function makeDocument(JSZip) {
  const zip = new JSZip()
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  zip.file(
    '[Content_Types].xml',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  )
  zip.file('_rels/.rels', rels([['rId1', 'officeDocument', 'word/document.xml']]))
  zip.file(
    'word/document.xml',
    `<w:document xmlns:w="${W}"><w:body>${Array.from({ length: 65 }, (_, i) => `<w:p><w:pPr><w:spacing after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>Paragraph ${i + 1}: stable pagination and independent responsive page frames.</w:t></w:r></w:p>`).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`
  )
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
