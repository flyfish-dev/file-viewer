import {
  createFileViewerNestedI18n,
  type FileRenderContext,
  type FileViewerI18nContext,
  type FileViewerOptions,
  type FileViewerRenderedInstance as Rendered
} from '@file-viewer/core'
import { createVueRenderSession } from '../components/FileViewer/rendererBridge'

/** Nested previews keep their parser/session; only viewer-owned UI language follows the parent. */
export const renderNestedBuffer = async (
  buffer: ArrayBuffer,
  type: string,
  target: HTMLDivElement,
  context?: FileRenderContext,
  parentI18n?: FileViewerI18nContext,
  inheritedOptions?: FileViewerOptions,
  onError?: (error: unknown) => void,
): Promise<Rendered> => {
  const languageScope = createFileViewerNestedI18n({
    ...context,
    options: { ...inheritedOptions, ...((context?.i18n || parentI18n) ? { locale: undefined, messages: undefined, i18n: undefined } : {}), ...context?.options },
  }, parentI18n, target.ownerDocument, onError)
  const options = languageScope.options
  const nestedRender: NonNullable<FileRenderContext['renderNestedBuffer']> = (buffer, type, target, nextContext) =>
    renderNestedBuffer(buffer, type, target, {
      ...nextContext,
      renderNestedBuffer: nextContext?.renderNestedBuffer === nestedRender ? undefined : nextContext?.renderNestedBuffer,
    }, languageScope, options, onError)
  try {
    const session = await createVueRenderSession(buffer, type.toLowerCase(), target, {
      ...context,
      options,
      i18n: languageScope,
      renderNestedBuffer: context?.renderNestedBuffer || nestedRender,
    })
    return {
      $el: session.rendered?.$el,
      destroy: () => {
        languageScope.destroy()
        return session.destroy?.()
      }
    }
  } catch (error) {
    languageScope.destroy()
    throw error
  }
}
