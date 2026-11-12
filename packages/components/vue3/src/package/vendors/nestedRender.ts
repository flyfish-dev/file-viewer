import type {
  FileRenderContext,
  FileViewerRenderedInstance as Rendered
} from '@file-viewer/core'
import { createFileViewerI18n } from '@file-viewer/core'
import { createVueRenderSession } from '../components/FileViewer/rendererBridge'

/**
 * 压缩包内文件和邮件附件的嵌套预览入口。
 *
 * 主预览器和附件预览必须共享同一套 renderer registry。这里复用 Vue3
 * 顶层渲染桥，让 `options.renderers` / preset-all / 自定义 renderer 在嵌套文件中
 * 继续生效，避免只落到 core 轻量兜底而丢失 PDF、Word、代码等完整能力。
 */
export const renderNestedBuffer = async (
  buffer: ArrayBuffer,
  type: string,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<Rendered> => {
  const normalizedType = type.toLowerCase()
  const languageScope = createFileViewerI18n(context?.options, {
    parent: context?.i18n,
    signal: context?.signal
  })
  let session
  try {
    session = await createVueRenderSession(buffer, normalizedType, target, {
      ...context,
      options: languageScope.options,
      i18n: languageScope,
      renderNestedBuffer
    })
  } catch (error) {
    languageScope.destroy()
    throw error
  }

  return {
    $el: session.rendered?.$el,
    destroy: () => { languageScope.destroy(); return session.destroy?.() }
  }
}
