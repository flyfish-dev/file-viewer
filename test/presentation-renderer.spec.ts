import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolvePptxPreviewErrorMessage } from '../packages/renderers/presentation/src/pptx'

const readSource = (relativePath: string) => {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('@file-viewer/renderer-presentation regressions', () => {
  it('keeps PPTX worker assets configurable for self-hosted deployments', () => {
    const source = readSource('packages/renderers/presentation-pptx/src/index.ts')

    expect(source).toContain('const presentationOptions = context?.options?.presentation')
    expect(source).toContain('const workerUrl = presentationOptions?.workerUrl')
    expect(source).toContain('? resolveFileViewerPresentationWorkerUrl(')
    expect(source).toContain('presentationOptions,')
    expect(source).toContain('resolveFileViewerRuntimeAssetBaseUrl(documentRef)')
    expect(source).toContain("resolveFileViewerCopiedAssetUrl(documentRef, 'office-presentation', 'pptx-worker', context?.signal)")
    expect(source).toContain('workerType: presentationOptions?.workerType')
  })

  it('uses core i18n for PPTX renderer copy and errors', () => {
    const source = readSource('packages/renderers/presentation-pptx/src/index.ts')

    expect(source).toContain('createFileViewerTranslator(context?.options)')
    expect(source).toContain("t('presentation.state.loading')")
    expect(source).toContain("t('presentation.error.title')")
    expect(source).toContain("t('presentation.error.parseFailed')")
    expect(source).toContain('normalizeFileViewerErrorMessage(error, context?.options)')
  })

  it('shows structured PPTX diagnostics instead of only the parse-failed fallback', () => {
    const message = resolvePptxPreviewErrorMessage(
      {
        name: 'PptxDiagnosticError',
        code: 'PPTX_INVALID_ZIP',
        stage: 'read-zip',
        message: 'PPTX 文件不是有效的 OpenXML 压缩包。',
        detail: "Can't find end of central directory"
      },
      'PPTX 解析失败',
      {
        options: {
          locale: 'zh-CN'
        }
      } as any
    )

    expect(message).toContain('PPTX 解析失败：PPTX 文件不是有效的 OpenXML 压缩包。')
    expect(message).toContain('阶段：read-zip')
    expect(message).toContain("详情：Can't find end of central directory")
    expect(message).toContain('建议：请确认接口返回的是原始 .pptx 二进制文件')
  })

  it('localizes known structured PPTX diagnostic codes for English viewers', () => {
    const message = resolvePptxPreviewErrorMessage(
      {
        name: 'PptxDiagnosticError',
        code: 'PPTX_INVALID_ZIP',
        stage: 'read-zip',
        message: 'PPTX 文件不是有效的 OpenXML 压缩包。',
        detail: "Can't find end of central directory"
      },
      'Failed to parse PPTX',
      {
        options: {
          locale: 'en-US'
        }
      } as any
    )

    expect(message).toContain(
      'Failed to parse PPTX: The file is not a valid PowerPoint OpenXML package.'
    )
    expect(message).toContain('Stage: read-zip')
    expect(message).toContain("Detail: Can't find end of central directory")
    expect(message).toContain('Hint: Confirm that the response is the original .pptx binary')
  })

  it('classifies legacy raw zip errors into actionable PPTX diagnostics', () => {
    const message = resolvePptxPreviewErrorMessage(
      new Error("Can't find end of central directory : is this a zip file ?"),
      'PPTX 解析失败',
      {
        options: {
          locale: 'zh-CN'
        }
      } as any
    )

    expect(message).toContain('PPTX 解析失败：文件不是有效的 PowerPoint OpenXML 压缩包。')
    expect(message).toContain('阶段：read-zip')
    expect(message).toContain("详情：Can't find end of central directory")
  })

  it('emits structured worker diagnostics for unreadable PPTX buffers', async () => {
    const processPptx = (await import('../packages/renderers/pptx/src/engine/process.js')).default
    const messages: any[] = []
    let pending = Promise.resolve()

    processPptx(
      (messageHandler) => {
        pending = messageHandler({
          type: 'processPPTX',
          data: new ArrayBuffer(0),
          options: {
            themeProcess: true
          },
          IE11: false
        })
      },
      (message) => {
        messages.push(message)
      }
    )

    await pending

    expect(messages).toContainEqual({
      type: 'ERROR',
      data: expect.objectContaining({
        name: 'PptxDiagnosticError',
        code: 'PPTX_FILE_EMPTY',
        stage: 'read-zip',
        message: 'PPTX 文件为空或过小，无法读取。'
      })
    })
  })
})
