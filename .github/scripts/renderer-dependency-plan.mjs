export const rendererModularizationLines = [
  {
    id: 'core-html-sanitizer',
    group: 'core',
    targetPackage: '@file-viewer/core',
    phase: 1,
    status: 'retained',
    renderers: [],
    dependencies: ['dompurify']
  },
  {
    id: 'office-word',
    group: 'office',
    targetPackage: '@file-viewer/renderer-word',
    phase: 2,
    status: 'extracted',
    renderers: ['office-word-openxml', 'office-word-binary', 'open-document'],
    dependencies: ['@file-viewer/docx', '@file-viewer/doc', 'rtf.js', 'jszip', 'linkedom']
  },
  {
    id: 'office-presentation-aggregate',
    group: 'office',
    targetPackage: '@file-viewer/renderer-presentation',
    phase: 2,
    status: 'extracted',
    renderers: ['office-presentation-binary', 'office-presentation'],
    dependencies: ['@file-viewer/renderer-ppt', '@file-viewer/renderer-pptx']
  },
  {
    id: 'office-presentation-binary',
    group: 'office',
    targetPackage: '@file-viewer/renderer-ppt',
    phase: 2,
    status: 'extracted',
    renderers: ['office-presentation-binary'],
    dependencies: ['@file-viewer/ppt']
  },
  {
    id: 'office-presentation-openxml',
    group: 'office',
    targetPackage: '@file-viewer/renderer-pptx',
    phase: 2,
    status: 'extracted',
    renderers: ['office-presentation'],
    dependencies: ['@file-viewer/pptx']
  },
  {
    id: 'office-spreadsheet',
    group: 'office',
    targetPackage: '@file-viewer/renderer-spreadsheet',
    phase: 2,
    status: 'extracted',
    renderers: ['spreadsheet-openxml', 'spreadsheet-dbf'],
    dependencies: ['styled-exceljs', 'e-virt-table', 'tinycolor2']
  },
  {
    id: 'office-iwork',
    group: 'office',
    targetPackage: '@file-viewer/renderer-iwork',
    phase: 5,
    status: 'extracted',
    renderers: ['apple-pages', 'apple-numbers', 'apple-keynote'],
    dependencies: ['@xmldom/xmldom', 'jszip', 'pako', 'styled-exceljs']
  },
  {
    id: 'office-wordperfect',
    group: 'office',
    targetPackage: '@file-viewer/renderer-wordperfect',
    phase: 5,
    status: 'extracted',
    renderers: ['office-wordperfect'],
    dependencies: []
  },
  {
    id: 'office-hangul',
    group: 'office',
    targetPackage: '@file-viewer/renderer-hangul',
    phase: 5,
    status: 'extracted',
    renderers: ['office-hangul'],
    dependencies: ['@xmldom/xmldom', 'cfb', 'jszip', 'pako']
  },
  {
    id: 'document-pdf',
    group: 'document',
    targetPackage: '@file-viewer/renderer-pdf',
    phase: 2,
    status: 'extracted',
    renderers: ['pdf'],
    dependencies: ['pdfjs-dist']
  },
  {
    id: 'document-ofd',
    group: 'document',
    targetPackage: '@file-viewer/renderer-ofd',
    phase: 2,
    status: 'extracted',
    renderers: ['ofd'],
    dependencies: ['ofd-xml-parser', 'jszip']
  },
  {
    id: 'document-typst',
    group: 'document',
    targetPackage: '@file-viewer/renderer-typst',
    phase: 2,
    status: 'extracted',
    renderers: ['typst'],
    dependencies: [
      '@myriaddreamin/typst.ts',
      '@myriaddreamin/typst-ts-renderer',
      '@myriaddreamin/typst-ts-web-compiler'
    ]
  },
  {
    id: 'engineering-cad',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-cad',
    phase: 2,
    status: 'extracted',
    renderers: ['cad'],
    dependencies: ['@flyfish-dev/cad-viewer']
  },
  {
    id: 'engineering-model',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-3d',
    phase: 3,
    status: 'extracted',
    renderers: ['model'],
    dependencies: ['three', '@file-viewer/geometry-engine', 'occt-import-js']
  },
  {
    id: 'engineering-drawing',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-drawing',
    phase: 3,
    status: 'extracted',
    renderers: ['drawing'],
    dependencies: ['roughjs', 'mermaid', 'plantuml-encoder', '@panzoom/panzoom']
  },
  {
    id: 'engineering-mindmap',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-mindmap',
    phase: 3,
    status: 'extracted',
    renderers: ['mindmap'],
    dependencies: ['@ljheee/xmind-parser']
  },
  {
    id: 'engineering-geo',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-geo',
    phase: 3,
    status: 'extracted',
    renderers: ['geo'],
    dependencies: ['@tmcw/togeojson', 'shpjs']
  },
  {
    id: 'engineering-eda',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-eda',
    phase: 4,
    status: 'extracted',
    renderers: ['eda'],
    dependencies: ['cfb', '@file-viewer/eda-layout', '@file-viewer/eda-orcad']
  },
  {
    id: 'archive',
    group: 'archiveEmailEbook',
    targetPackage: '@file-viewer/renderer-archive',
    phase: 2,
    status: 'extracted',
    renderers: ['archive'],
    dependencies: ['libarchive.js', 'jszip']
  },
  {
    id: 'chm',
    group: 'archiveEmailEbook',
    targetPackage: '@file-viewer/renderer-chm',
    phase: 3,
    status: 'extracted',
    renderers: ['chm'],
    dependencies: []
  },
  {
    id: 'email',
    group: 'archiveEmailEbook',
    targetPackage: '@file-viewer/renderer-email',
    phase: 3,
    status: 'extracted',
    renderers: ['email'],
    dependencies: ['postal-mime', '@kenjiuno/msgreader']
  },
  {
    id: 'ebook',
    group: 'archiveEmailEbook',
    targetPackage: '@file-viewer/renderer-epub',
    phase: 3,
    status: 'extracted',
    renderers: ['epub', 'ebook-fb2', 'umd'],
    dependencies: ['epubjs', 'pako']
  },
  {
    id: 'code-markdown',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-text',
    phase: 3,
    status: 'extracted',
    renderers: ['code', 'markdown'],
    dependencies: ['highlight.js', 'marked', 'diff2html', 'pako']
  },
  {
    id: 'media',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-media',
    phase: 3,
    status: 'extracted',
    renderers: ['audio', 'video'],
    dependencies: ['hls.js', '@tonejs/midi']
  },
  {
    id: 'image',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-image',
    phase: 3,
    status: 'partially-extracted',
    renderers: ['image'],
    dependencies: ['heic2any', 'utif']
  },
  {
    id: 'medical-dicom',
    group: 'medical',
    targetPackage: '@file-viewer/renderer-dicom',
    phase: 5,
    status: 'extracted',
    renderers: ['dicom'],
    dependencies: [
      '@cornerstonejs/core',
      '@cornerstonejs/dicom-image-loader',
      '@cornerstonejs/metadata',
      'dicom-parser'
    ]
  },
  {
    id: 'document-signature',
    group: 'document',
    targetPackage: '@file-viewer/renderer-signature',
    phase: 5,
    status: 'extracted',
    renderers: ['signature'],
    dependencies: ['jszip']
  },
  {
    id: 'design-asset',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-design',
    phase: 5,
    status: 'extracted',
    renderers: ['photoshop-design', 'illustrator-pdf-design', 'postscript-design', 'adobe-palette-design', 'photoshop-resource-design', 'indesign-idml-design', 'indesign-exchange-design', 'adobe-animate-xfl-design', 'adobe-xd-design', 'indesign-native-design'],
    dependencies: ['@file-viewer/renderer-data', 'ag-psd', '@webtoon/psd', '@paged-media/introspect-wasm', '@xmldom/xmldom', 'saxes']
  },
  {
    id: 'data-asset',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-data',
    phase: 4,
    status: 'extracted',
    renderers: ['data-asset'],
    dependencies: ['ag-psd', 'sql.js', 'hyparquet', 'avsc']
  },
  {
    id: 'worker-dom',
    group: 'smallShared',
    targetPackage: '@file-viewer/renderer-word',
    phase: 2,
    status: 'extracted',
    renderers: ['office-word-openxml'],
    dependencies: ['@xmldom/xmldom']
  }
]

export const rendererDependencyGroups = rendererModularizationLines.reduce((result, line) => {
  if (line.status === 'extracted' || line.status === 'retained') {
    return result
  }
  result[line.group] ||= []
  line.dependencies.forEach((dependency) => {
    if (!result[line.group].includes(dependency)) {
      result[line.group].push(dependency)
    }
  })
  return result
}, {})

export const dependencyToRendererLines = rendererModularizationLines.reduce((result, line) => {
  line.dependencies.forEach((dependency) => {
    result.set(dependency, [...(result.get(dependency) || []), line])
  })
  return result
}, new Map())

export const dependencyToRendererLine = new Map(
  Array.from(dependencyToRendererLines.entries()).map(([dependency, lines]) => [
    dependency,
    lines.find((line) => line.status !== 'extracted' && line.status !== 'retained') || lines[0]
  ])
)

export const modularizedRendererLines = rendererModularizationLines.filter(
  (line) => line.status !== 'retained'
)

export const retainedCoreDependencyLines = rendererModularizationLines.filter(
  (line) => line.status === 'retained'
)
