const allowedTitleTypes = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'test',
  'build',
  'ci',
  'chore',
  'revert'
]

const stripComments = (value) =>
  String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()

const normalizedHeading = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const extractSections = (body, level) => {
  const source = String(body || '')
  const marker = '#'.repeat(level)
  const pattern = new RegExp(`^${marker}\\s+(.+?)\\s*$`, 'gm')
  const matches = [...source.matchAll(pattern)]
  const sections = new Map()

  matches.forEach((match, index) => {
    const start = (match.index || 0) + match[0].length
    const end = matches[index + 1]?.index ?? source.length
    sections.set(normalizedHeading(match[1]), stripComments(source.slice(start, end)))
  })

  return sections
}

const isMeaningful = (value, minimum = 12) => {
  const text = stripComments(value)
    .replace(/^[-*]\s*/gm, '')
    .replace(/_No response_/gi, '')
    .trim()
  return text.length >= minimum && !/^(?:n\/?a|none|no|-)\s*$/i.test(text)
}

const hasNotApplicableReason = (value) =>
  /(?:^|\n)\s*[-*]?\s*(?:n\/?a|not applicable)\s*:\s*\S.{7,}/im.test(value)

const hasPublicArtifact = (value) => {
  const text = stripComments(value)
  const urls = text.match(/https?:\/\/[^\s)>]+/gi) || []
  const hasArtifactUrl = urls.some(
    (url) =>
      /github\.com\/user-attachments\/files\//i.test(url) ||
      /(?:github\.com|gitlab\.com|gitee\.com)\/[^/\s]+\/[^/\s]+(?:$|\/(?:archive|blob|commit|raw|releases|tree|source|-\/blob|-\/tree)\/)/i.test(
        url
      ) ||
      /(?:stackblitz\.com\/|codesandbox\.io\/|codepen\.io\/)/i.test(url) ||
      /\.(?:7z|ai|avif|bmp|csv|doc|docx|dwf|dwfx|dwg|dxf|eml|epub|gif|glb|gltf|heic|heif|hwp|hwpx|igs|iges|jpg|jpeg|json|key|mbox|msg|numbers|ods|odt|ofd|pages|pdf|png|ppt|pptx|rar|rtf|step|stp|svg|tar|tif|tiff|txt|webp|xls|xlsb|xlsm|xlsx|xmind|xml|zip)(?:[?#].*)?$/i.test(
        url
      )
  )
  return (
    hasArtifactUrl ||
    /(?:^|[\s`])(test\/fixtures|apps\/viewer-demo\/public\/example|examples\/)\/[\w./@+-]+/i.test(
      text
    )
  )
}

const hasPrivateArtifact = (value) => {
  const text = stripComments(value)
  return (
    /(?:sent|发送|已发送)[^\n]{0,80}admin@flyfish\.dev/i.test(text) &&
    /\b20\d{2}-\d{2}-\d{2}\b/.test(text) &&
    /[\w一-鿿 .()@+-]+\.[a-z0-9]{1,10}\b/i.test(text)
  )
}

const hasImageEvidence = (value) => {
  const text = stripComments(value)
  return (
    /!\[[^\]]*]\((?:https?:\/\/|\/)[^)\s]+\)/i.test(text) ||
    /<img\b[^>]*\bsrc=["'](?:https?:\/\/|\/)[^"']+["'][^>]*>/i.test(text) ||
    /https:\/\/github\.com\/user-attachments\/assets\/[\w-]+/i.test(text)
  )
}

const isChecked = (value, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^\\s*-\\s*\\[[xX]\\]\\s*${escaped}(?:\\s|$)`, 'm').test(value)
}

const countChecked = (value) => (String(value || '').match(/^\s*-\s*\[[xX]\]\s+/gm) || []).length

export function validatePullRequest({ title, body, files = [] }) {
  const errors = []
  const titlePattern = new RegExp(
    `^(?:${allowedTitleTypes.join('|')})(?:\\([a-z0-9][a-z0-9._/-]*\\))?: [^\\s].{5,}$`
  )

  if (!titlePattern.test(String(title || '').trim())) {
    errors.push(
      'Title must use `type(scope): concise outcome` (scope is optional; allowed types: ' +
        `${allowedTitleTypes.join(', ')}).`
    )
  }

  const sections = extractSections(body, 2)
  const requiredSections = [
    'summary',
    'related issue',
    'change classification',
    'verification',
    'sample / fixture evidence',
    'visual evidence',
    'risk and compatibility',
    'checklist'
  ]

  for (const sectionName of requiredSections) {
    if (!sections.has(sectionName)) {
      errors.push(
        `Missing required section: ## ${sectionName.replace(/(^|\s)\S/g, (value) => value.toUpperCase())}.`
      )
    }
  }

  const summary = sections.get('summary') || ''
  if (!isMeaningful(summary, 20)) {
    errors.push(
      'Summary must describe the focused outcome; template placeholders are not sufficient.'
    )
  }

  const relatedIssue = sections.get('related issue') || ''
  const hasIssueReference =
    /(?:^|\s)(?:closes|fixes|resolves)?\s*#\d+\b/i.test(relatedIssue) ||
    /https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/issues\/\d+/i.test(relatedIssue)
  if (!hasIssueReference && !hasNotApplicableReason(relatedIssue)) {
    errors.push('Related issue must contain an issue reference or `N/A: <specific reason>`.')
  }

  const classification = sections.get('change classification') || ''
  const userVisible = isChecked(classification, 'User-visible UI or rendering change')
  const nonVisual = isChecked(classification, 'Non-visual change')
  const formatBehavior = isChecked(classification, 'File-format or renderer behavior')
  const normalizedFiles = files.map((file) =>
    typeof file === 'string' ? file : file?.filename || ''
  )
  const changesRendererPath = normalizedFiles.some((file) =>
    /^packages\/renderers\/[^/]+\/(?:src|package\.json)/.test(file)
  )
  const changesVisualPath = normalizedFiles.some((file) =>
    /^(?:apps\/(?:viewer-demo|site)\/src|packages\/components\/[^/]+\/src)\/.*\.(?:css|jsx|scss|svelte|tsx|vue)$/.test(
      file
    )
  )
  if (Number(userVisible) + Number(nonVisual) !== 1) {
    errors.push('Select exactly one visibility option: user-visible or non-visual.')
  }
  if (changesRendererPath && !formatBehavior) {
    errors.push('Renderer source/package changes must select `File-format or renderer behavior`.')
  }
  if (changesVisualPath && !userVisible) {
    errors.push(
      'UI stylesheet/component changes must select `User-visible UI or rendering change`.'
    )
  }

  const verification = sections.get('verification') || ''
  const hasPassedCommand = verification.split(/\r?\n/).some((line) => {
    const commandMatch = line.match(/`([^`\n]{2,})`/)
    if (!commandMatch) return false

    const command = commandMatch[1].trim()
    const result = line.slice((commandMatch.index || 0) + commandMatch[0].length)
    return (
      !/[<>]/.test(command) &&
      /^(?:bun|cargo|go|node|npm|npx|pnpm|pytest|ruby|yarn)\b/.test(command) &&
      /\b(?:pass(?:ed)?|success(?:ful)?|通过)\b/i.test(result)
    )
  })
  if (!hasPassedCommand) {
    errors.push(
      'Verification must list at least one command actually run and mark its result as Pass/Passed/Success.'
    )
  }

  const sampleEvidence = sections.get('sample / fixture evidence') || ''
  if (formatBehavior) {
    if (!hasPublicArtifact(sampleEvidence) && !hasPrivateArtifact(sampleEvidence)) {
      errors.push(
        'File-format or renderer changes require a public/repository fixture or ' +
          '`Private sample sent to admin@flyfish.dev on YYYY-MM-DD: filename.ext`.'
      )
    }
  } else if (
    !hasPublicArtifact(sampleEvidence) &&
    !hasPrivateArtifact(sampleEvidence) &&
    !hasNotApplicableReason(sampleEvidence)
  ) {
    errors.push('Sample / fixture evidence must contain an artifact or `N/A: <specific reason>`.')
  }

  const visualEvidence = sections.get('visual evidence') || ''
  if (userVisible && !hasImageEvidence(visualEvidence)) {
    errors.push(
      'User-visible UI or rendering changes require at least one screenshot in Visual evidence.'
    )
  }
  if (nonVisual && !hasImageEvidence(visualEvidence) && !hasNotApplicableReason(visualEvidence)) {
    errors.push(
      'Non-visual changes must use `N/A: <specific reason>` when no screenshot is provided.'
    )
  }

  const risk = sections.get('risk and compatibility') || ''
  const hasRiskScope = /Affected packages\/formats:[ \t]*\S[^\r\n]{2,}/i.test(risk)
  const hasCompatibilityRisk = /Compatibility or migration risk:[ \t]*\S[^\r\n]{2,}/i.test(risk)
  const hasRollback = /Rollback:[ \t]*\S[^\r\n]{2,}/i.test(risk)
  if (!isMeaningful(risk, 25) || !hasRiskScope || !hasCompatibilityRisk || !hasRollback) {
    errors.push(
      'Risk and compatibility must identify affected scope, compatibility risk, and rollback.'
    )
  }

  const checklist = sections.get('checklist') || ''
  if (countChecked(checklist) < 4 || /^\s*-\s*\[\s]\s+/m.test(checklist)) {
    errors.push('Complete all four PR checklist confirmations.')
  }

  return {
    ok: errors.length === 0,
    errors,
    classification: {
      userVisible,
      nonVisual,
      formatBehavior,
      changesRendererPath,
      changesVisualPath
    }
  }
}

export function validateIssueReport({ title, body, labels = [] }) {
  const normalizedLabels = labels.map((label) =>
    normalizedHeading(typeof label === 'string' ? label : label?.name)
  )
  const applicable =
    normalizedLabels.includes('bug') ||
    /^\[(?:bug|compatibility)]\s*:/i.test(String(title || '').trim())

  if (!applicable) {
    return { applicable: false, ok: true, errors: [] }
  }

  const errors = []
  const sections = extractSections(body, 3)
  const sharingMethod = sections.get('sample sharing method') || ''
  const sample =
    sections.get('sample or reproduction artifact') || sections.get('sample file') || ''
  const privateMethod = /private sample sent to admin@flyfish\.dev/i.test(sharingMethod)
  const publicMethod =
    /public or sanitized sample attached|public (?:download or minimal reproduction|download) link/i.test(
      sharingMethod
    )

  if (!privateMethod && !publicMethod) {
    errors.push('Choose a supported sample sharing method in the bug form.')
  }
  if (!isMeaningful(sample, 12)) {
    errors.push(
      'Provide the sample attachment/link or the private-delivery receipt in the sample section.'
    )
  } else if (privateMethod && !hasPrivateArtifact(sample)) {
    errors.push(
      'Private delivery must use `Sent to admin@flyfish.dev on YYYY-MM-DD: filename.ext`.'
    )
  } else if (publicMethod && !hasPublicArtifact(sample)) {
    errors.push(
      'Public delivery must include an attachment URL, public link, or repository fixture path.'
    )
  }

  return { applicable: true, ok: errors.length === 0, errors }
}

export const governanceInternals = {
  extractSections,
  hasImageEvidence,
  hasPrivateArtifact,
  hasPublicArtifact,
  hasNotApplicableReason
}
