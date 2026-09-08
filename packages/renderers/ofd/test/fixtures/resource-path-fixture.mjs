import { posix } from 'node:path'
import JSZip from 'jszip'

export const pixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)
export const resourcePathCases = [
  ['standard', {}],
  ['nested-namespace-combination', { docRoot: 'Packets/Doc_0/Document.xml', resource: 'Catalog/DocumentRes.xml', baseLoc: '../Media', prefix: 'document', lowercaseEntries: true }],
  ['nested-document', { docRoot: 'Packets/Doc_0/Document.xml' }],
  ['root-document', { docRoot: 'Document.xml' }],
  ['nested-resource', { resource: 'Catalog/DocumentRes.xml' }],
  ['parent-resource', { resource: 'Catalog/DocumentRes.xml', baseLoc: '../Media' }],
  ['alternate-prefix', { prefix: 'document' }],
  ['default-namespace', { prefix: '' }],
  ['case-insensitive', { lowercaseEntries: true }],
  ['encoded-media', { media: 'stamp%20one.png' }],
  ['absolute-media', { media: '/Doc_0/Res/pixel.png' }],
  ['relative-parent-media', { baseLoc: 'Res/Nested', media: '../pixel.png' }],
  ['declared-resource-priority', { decoy: true }],
  ['casefold-resource-priority', { decoy: true, lowercaseEntries: true }],
  ['missing-image', { missingImage: true }],
  ['missing-resource-catalog', { missingResource: true }],
  ['missing-font-catalog', { missingFont: true }]
]

export async function createResourcePathFixture(options = {}) {
  const {
    docRoot = 'Doc_0/Document.xml',
    resource = 'DocumentRes.xml',
    baseLoc = 'Res',
    media = 'pixel.png',
    prefix = 'ofd',
    lowercaseEntries = false
  } = options
  const zip = new JSZip()
  const docDirectory = posix.dirname(docRoot)
  const resourcePath = posix.join(docDirectory, resource)
  const mediaPath = posix
    .resolve('/', posix.dirname(resourcePath), baseLoc, decodeURIComponent(media))
    .slice(1)
  const file = (path, content) =>
    zip.file(
      lowercaseEntries ? path.toLowerCase() : path,
      options.malformedPage && path.endsWith('/Content.xml')
        ? '<ofd:Page xmlns:ofd="http://www.ofdspec.org/2016"><broken></ofd:Page>'
        : content,
      { date: new Date('2026-09-08T00:00:00Z') }
    )
  const xml = (content) => {
    const qualified = prefix ? `${prefix}:` : ''
    return content
      .replaceAll('ofd:', qualified)
      .replaceAll('xmlns:ofd=', prefix ? `xmlns:${prefix}=` : 'xmlns=')
  }
  file(
    'OFD.xml',
    xml(
      `<ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" Version="1.2"><ofd:DocBody><ofd:DocInfo><ofd:DocID>resource-path-regression</ofd:DocID></ofd:DocInfo><ofd:DocRoot>${docRoot}</ofd:DocRoot></ofd:DocBody></ofd:OFD>`
    )
  )
  file(
    docRoot,
    xml(
      `<ofd:Document xmlns:ofd="http://www.ofdspec.org/2016"><ofd:CommonData><ofd:MaxUnitID>20</ofd:MaxUnitID><ofd:PageArea><ofd:PhysicalBox>0 0 100 140</ofd:PhysicalBox></ofd:PageArea><ofd:PublicRes>PublicRes.xml</ofd:PublicRes><ofd:DocumentRes>${resource}</ofd:DocumentRes></ofd:CommonData><ofd:Pages><ofd:Page ID="1" BaseLoc="Pages/Page_0/Content.xml"/></ofd:Pages></ofd:Document>`
    )
  )
  if (!options.missingFont)
    file(
      posix.join(docDirectory, 'PublicRes.xml'),
      xml(
        '<ofd:Res xmlns:ofd="http://www.ofdspec.org/2016" BaseLoc="Res"><ofd:Fonts><ofd:Font ID="7" FontName="sans-serif" FamilyName="sans-serif"/></ofd:Fonts></ofd:Res>'
      )
    )
  if (!options.missingPage)
    file(
      posix.join(docDirectory, 'Pages/Page_0/Content.xml'),
      xml(
        '<ofd:Page xmlns:ofd="http://www.ofdspec.org/2016"><ofd:Content><ofd:Layer ID="2"><ofd:TextObject ID="3" Boundary="10 10 80 20" Font="7" Size="4"><ofd:TextCode X="0" Y="8">Invoice resource reference</ofd:TextCode></ofd:TextObject><ofd:ImageObject ID="4" ResourceID="20" Boundary="10 40 20 20"/></ofd:Layer></ofd:Content></ofd:Page>'
      )
    )
  if (!options.missingResource)
    file(
      resourcePath,
      xml(
        `<ofd:Res xmlns:ofd="http://www.ofdspec.org/2016" BaseLoc="${baseLoc}"><ofd:MultiMedias><ofd:MultiMedia ID="20" Type="Image" Format="PNG"><ofd:MediaFile>${media}</ofd:MediaFile></ofd:MultiMedia></ofd:MultiMedias></ofd:Res>`
      )
    )
  if (!options.missingImage) file(mediaPath, options.imageBytes || pixelPng)
  if (options.decoy) {
    file('pixel.png', Buffer.from('unrelated root resource'))
    file(posix.join(docDirectory, 'pixel.png'), Buffer.from('unrelated document resource'))
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
