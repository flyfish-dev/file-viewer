import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const output = join(fixtureDir, 'external-resources.docx')
const blobOutput = join(fixtureDir, 'external-blob.docx')
const archive = new JSZip()
const fixtureDate = new Date('2026-01-01T00:00:00.000Z')
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')

const add = (name, content, options = {}) => {
  archive.file(name, content, { date: fixtureDate, createFolders: false, ...options })
}

const picture = (relationshipId, name, index) => `
<w:p>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="9525" cy="9525"/>
        <wp:docPr id="${index}" name="${name}" descr="Security regression image ${index}"/>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr><pic:cNvPr id="${index}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>
              <pic:blipFill><a:blip r:link="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="9525" cy="9525"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`

add(
  '[Content_Types].xml',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
)

add(
  '_rels/.rels',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
)

add(
  'word/_rels/document.xml.rels',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdRemote" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="http://127.0.0.1:41799/external.svg" TargetMode="External"/>
  <Relationship Id="rIdUnsafe" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="javascript:top.__docxResourceSentinel+=100" TargetMode="External"/>
  <Relationship Id="rIdData" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" TargetMode="External"/>
  <Relationship Id="rIdBlob" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="blob:https://example.com/00000000-0000-4000-8000-000000000000" TargetMode="External"/>
  <Relationship Id="rIdEmbedded" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/embedded.gif"/>
</Relationships>`
)

add(
  'word/document.xml',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p><w:r><w:t>External resource security regression</w:t></w:r></w:p>
    ${picture('rIdRemote', 'remote-http', 1)}
    ${picture('rIdUnsafe', 'unsafe-scheme', 2)}
    ${picture('rIdData', 'data-url', 3)}
    ${picture('rIdBlob', 'blob-url', 4)}
    ${picture('rIdEmbedded', 'embedded-image', 5)}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`
)

add('word/media/embedded.gif', pixel, { binary: true })

await mkdir(fixtureDir, { recursive: true })
await writeFile(
  output,
  await archive.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'UNIX'
  })
)

const blobArchive = new JSZip()
const addBlob = (name, content, options = {}) => {
  blobArchive.file(name, content, { date: fixtureDate, createFolders: false, ...options })
}

addBlob(
  '[Content_Types].xml',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
)
addBlob(
  '_rels/.rels',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
)
addBlob(
  'word/_rels/document.xml.rels',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdInk" Type="http://schemas.microsoft.com/office/2007/relationships/ink" Target="http://127.0.0.1:41799/external-blob.svg" TargetMode="External"/>
</Relationships>`
)
addBlob(
  'word/document.xml',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:body>
    <w:p><w:r><w:t>External blob relationship security regression</w:t></w:r></w:p>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="9525" cy="9525"/>
            <wp:docPr id="1" name="external-blob"/>
            <a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"><w14:contentPart r:id="rIdInk"/></a:graphicData></a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`
)
await writeFile(
  blobOutput,
  await blobArchive.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'UNIX'
  })
)

console.log(output)
console.log(blobOutput)
