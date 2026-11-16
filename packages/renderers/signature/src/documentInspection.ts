import { createFileViewerTranslator, type FileViewerDocumentInspectionRequest, type FileViewerMessageKey } from '@file-viewer/core'
import { createSignatureDetailsPanel, normalizeSignatureDetailsPanelOptions, signatureDetailsPanelStyle } from './detailsPanel.js'
import { inspectDocumentSignatureMetadata } from './documentMetadata.js'

const style = `
.signature-document-inspection{width:100%;height:100%;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden;color:inherit;box-sizing:border-box}
.signature-document-inspection *{box-sizing:border-box}
.signature-document-inspection>.signature-header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none;flex-wrap:wrap;padding:7px 10px;border-bottom:1px solid #94a3b844;background:var(--file-viewer-toolbar-background,#f1f5f9)}
.signature-document-inspection .signature-main{flex:1;min-height:0;min-width:0;overflow:hidden}
.signature-document-inspection .signature-main:not([data-panel-position='left']){display:flex;flex-direction:column}
.signature-document-inspection .signature-details-panel{flex:none;max-height:40%;overflow:auto;overscroll-behavior:contain;padding:8px;gap:8px;background:var(--file-viewer-toolbar-background,#f1f5f9)}
.signature-document-inspection .signature-preview{height:100%;min-height:0;min-width:0;flex:1;overflow:hidden}
.signature-document-inspection .signature-card{border:1px solid #94a3b844;border-radius:6px;padding:10px;margin:0 0 8px;background:var(--file-viewer-background,#fff)}
.signature-document-inspection h3{font-size:14px;margin:0 0 8px}.signature-document-inspection h4{font-size:12px;margin:9px 0 5px}
.signature-document-inspection .signature-grid{display:grid;grid-template-columns:minmax(100px,auto) minmax(0,1fr);gap:4px 8px;font-size:12px;margin:0}
.signature-document-inspection dt{color:inherit;opacity:.75}.signature-document-inspection dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.signature-document-inspection .signature-warning{font-size:12px;line-height:1.5;overflow-wrap:anywhere;padding:5px 0}
.signature-document-inspection [data-state='pending']{color:inherit}
`
const labels: Record<string, FileViewerMessageKey> = {
  signatureAlgorithm: 'signature.ui.signature.algorithm.601824', digestAlgorithm: 'signature.ui.digest.algorithm.5b4cb2',
  claimedSigningTime: 'signature.ui.signing.time.f74d88', M: 'signature.ui.signing.time.f74d88',
  signerIdentifier: 'signature.ui.signer.identifier.6aa443', Name: 'signature.ui.signer.58e1dd',
  serialization: 'signature.ui.serialization.892823',
  subject: 'signature.ui.subject.8d183d', issuer: 'signature.ui.issuer.2587e4', serialNumber: 'signature.ui.serial.number.a5349d',
  notBefore: 'signature.ui.valid.from.160fde', notAfter: 'signature.ui.valid.until.c8214d', fingerprintSha256: 'signature.ui.fingerprint.fed4c9'
}

/** Attach the existing panel to the existing preview; it never renders the document again. */
export const attachDocumentSignatureInspection = async (request: FileViewerDocumentInspectionRequest) => {
  const { target, context, signal } = request
  const original = Array.from(target.childNodes)
  const inspection = await inspectDocumentSignatureMetadata(request)
  if (!inspection || signal.aborted || !original.every(node => node.parentNode === target)) return null
  // Shared certificates/headers can appear under many signers. Bound the
  // rendered projection as well as source parsing, before allocating DOM nodes.
  const pending: unknown[] = [inspection]
  let nodes = 0, characters = 0
  while (pending.length) {
    const value = pending.pop()
    if (++nodes > 10000) throw new Error('Signature metadata display exceeds its structural limit; preview remains available.')
    if (typeof value === 'string') {
      characters += value.length
      if (characters > 2 * 1024 * 1024) throw new Error('Signature metadata display exceeds its text limit; preview remains available.')
    } else if (value && typeof value === 'object') pending.push(...Object.values(value))
  }
  const doc = target.ownerDocument
  const t = createFileViewerTranslator(context?.i18n || context?.options)
  const shell = doc.createElement('section'); shell.className = 'signature-shell signature-document-inspection'
  shell.dataset.verification = 'not-checked'
  const sheet = doc.createElement('style'); sheet.textContent = signatureDetailsPanelStyle + style
  const header = doc.createElement('header'); header.className = 'signature-header'
  const title = t.element(doc, 'strong', '', () => `${t('signature.panel.title')} · ${t('signature.ui.parsed.metadata.only.f0ba09')} · ${t('signature.ui.not.checked.22705e')}`)
  header.append(title)
  const main = doc.createElement('div'); main.className = 'signature-main'
  const sidebar = doc.createElement('div'); sidebar.className = 'signature-sidebar'; sidebar.hidden = true
  const preview = doc.createElement('div'); preview.className = 'signature-preview signature-preview-target'
  const cards = doc.createElement('div'); cards.className = 'signature-document-metadata'
  const makeText = (tag: 'p' | 'h3' | 'h4' | 'dt' | 'dd', text: string) => { const element = doc.createElement(tag); element.textContent = text; return element }
  const renderCards = () => {
    t.release(cards); cards.replaceChildren()
    for (const signature of inspection.signatures) {
      const card = doc.createElement('section'); card.className = 'signature-card'; card.dataset.signatureId = signature.id; card.dataset.verification = 'not-checked'
      card.append(makeText('h3', `${signature.format} · ${signature.id}`))
      card.append(t.element(doc, 'p', '', () => t('signature.ui.not.checked.22705e')))
      const grid = doc.createElement('dl'); grid.className = 'signature-grid'
      for (const [key, value] of Object.entries(signature.fields)) {
        const label = labels[key]; const term = label ? t.element(doc, 'dt', '', () => t(label)) : makeText('dt', key)
        grid.append(term, value === undefined || value === '' ? t.element(doc, 'dd', '', () => t('signature.ui.content.unavailable.6886f1')) : makeText('dd', value))
      }
      card.append(grid)
      signature.certificates.forEach((certificate, index) => {
        card.append(t.element(doc, 'h4', '', () => t('signature.ui.certificate.042c9a', { p0: index + 1 })))
        const fields = doc.createElement('dl'); fields.className = 'signature-grid'
        for (const key of ['subject', 'issuer', 'serialNumber', 'notBefore', 'notAfter', 'fingerprintSha256'] as const) {
          fields.append(t.element(doc, 'dt', '', () => t(labels[key]!)), certificate[key] ? makeText('dd', certificate[key]!) : t.element(doc, 'dd', '', () => t('signature.ui.content.unavailable.6886f1')))
        }
        card.append(fields)
      })
      for (const reference of signature.references) {
        const field = makeText('p', `${reference.uri} — ${reference.availability}${reference.transforms?.length ? `; transforms not executed: ${reference.transforms.join(', ')}` : ''}`)
        field.dataset.referenceAvailability = reference.availability; card.append(field)
      }
      for (const limitation of signature.limitations) {
        const notice = makeText('p', limitation); notice.className = 'signature-warning'; notice.dataset.state = 'pending'; card.append(notice)
      }
      cards.append(card)
    }
    for (const limitation of inspection.limitations) { const notice = makeText('p', limitation); notice.className = 'signature-warning'; cards.append(notice) }
  }
  renderCards()
  preview.append(...original); main.append(cards, preview); shell.append(sheet, header, sidebar, main); target.append(shell)
  const panel = createSignatureDetailsPanel({ shell, header, sidebar, main, state: normalizeSignatureDetailsPanelOptions(context?.options?.signature?.detailsPanel), options: context?.options, i18n: context?.i18n, checks: [], onExpandedChange: () => {} })
  const stopLanguage = context?.i18n?.subscribe(renderCards)
  let disposed = false
  return { dispose() {
    if (disposed) return
    disposed = true; stopLanguage?.(); panel.dispose(); t.release(shell)
    if (shell.parentNode === target) { target.replaceChildren(...Array.from(preview.childNodes)) }
  } }
}
