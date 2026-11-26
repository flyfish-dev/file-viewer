import type { FileRenderContext, FileViewerOptions } from '../contracts/types'
import { isFileViewerToolbarOperationPermitted } from '../lifecycle/operations'
import { triggerFileViewerBlobDownload } from './export'

export const isFileViewerSnapshotDownloadPermitted = (options?: FileViewerOptions) =>
  isFileViewerToolbarOperationPermitted(options?.toolbar, 'download') &&
  isFileViewerToolbarOperationPermitted(options?.toolbar, 'export-html')

/** Renderer-local downloads still use the owning viewer's hooks and request version. */
export const createFileViewerSnapshotDownload =
  ({
    getOptions,
    isCurrent,
    beforeDownload
  }: {
    getOptions: () => FileViewerOptions | undefined
    isCurrent: () => boolean
    beforeDownload: () => Promise<boolean>
  }): NonNullable<FileRenderContext['requestSnapshotDownload']> =>
  async (create) => {
    const allowed = () => isCurrent() && isFileViewerSnapshotDownloadPermitted(getOptions())
    if (!allowed() || !(await beforeDownload()) || !allowed()) return false
    const watermark = getOptions()?.watermark
    const watermarkState = JSON.stringify(watermark)
    const capturedWatermark =
      watermark && typeof watermark === 'object' ? Object.freeze({ ...watermark }) : watermark
    const result = await create(capturedWatermark)
    if (!allowed() || JSON.stringify(getOptions()?.watermark) !== watermarkState) return false
    triggerFileViewerBlobDownload(result.blob, result.filename)
    return true
  }
