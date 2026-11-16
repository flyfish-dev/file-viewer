import { describe, expect, it } from 'vitest'
import { FILE_VIEWER_SUPPORTED_LOCALES } from '../packages/core/src/i18n/messages'
import { getMsgLabels } from '../packages/renderers/email/src/msgMessages'

describe('MSG locale coverage', () => {
  it.each(FILE_VIEWER_SUPPORTED_LOCALES)('provides every nonempty notice for %s', locale => {
    const labels = getMsgLabels({ locale })
    expect(Object.keys(labels).sort()).toEqual(Object.keys(getMsgLabels({ locale: 'en-US' })).sort())
    for (const message of Object.values(labels)) expect(message.trim()).not.toBe('')
  })

  it.each([
    ['zh-TW', '密件副本', '簽章'], ['zh-Hant', '密件副本', '簽章'],
    ['zh_Hant_TW', '密件副本', '簽章'], ['zh-HK', '密送', '簽名'],
    ['zh-Hant-HK', '密送', '簽名'], ['zh-MO', '密送', '簽名']
  ])('resolves regional labels and protection notice for %s', (locale, bcc, signature) => {
    const labels = getMsgLabels({ locale })
    expect(labels.bcc).toBe(bcc)
    expect(labels.close).toBe('關閉附件預覽')
    expect(labels['email.msg.protected']).toContain(`不會進行解密或${signature}驗證`)
    expect(labels['email.msg.rtfUnavailable']).toContain('RTF')
  })

  it('preserves shared explicit-script, unsupported-locale and nested-option precedence', () => {
    expect(getMsgLabels({ locale: 'zh-Hans-TW' })).toEqual(getMsgLabels({ locale: 'zh-CN' }))
    expect(getMsgLabels({ locale: 'fr-FR' })).toEqual(getMsgLabels({ locale: 'en-US' }))
    expect(getMsgLabels({ locale: 'en-US', i18n: { locale: 'zh-TW' } }).bcc).toBe('密件副本')
  })
})
