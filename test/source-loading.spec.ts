import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME,
  FILE_VIEWER_PREVIEW_LOAD_ERROR_PREFIXES,
  FILE_VIEWER_REMOTE_MISSING_DATA_ERROR_MESSAGE,
  FILE_VIEWER_PREVIEW_MESSAGES,
  applyFileViewerEmptyPreviewState,
  cancelFileViewerPreviewRequest,
  applyFileViewerPreviewFilenameState,
  applyFileViewerPreviewSourceUrlState,
  applyFileViewerReadPreviewState,
  applyFileViewerRenderReadinessState,
  applyFileViewerPreviewRequestResetState,
  commitFileViewerEmptyPreviewResetState,
  commitFileViewerLoadStartState,
  commitFileViewerPreviewRequestStartState,
  commitFileViewerRenderCompleteState,
  commitFileViewerRemoteDownloadState,
  createFileViewerEmptyPreviewState,
  createFileViewerLoadStartState,
  createFileViewerPreviewStateTarget,
  createFileViewerReadPreviewState,
  createFileViewerPreviewRequestResetState,
  createFileViewerRenderCompleteState,
  createFileViewerSourceLoadingActionHandlers,
  createFileViewerStreamingPdfPlaceholderFile,
  createFileViewerRequestController,
  finalizeFileViewerPreviewLoadState,
  hasFileViewerPreviewSource,
  isFileViewerAbortError,
  normalizeFileViewerSourceUrl,
  normalizePdfStreamingMode,
  resolveFileViewerFileRefSourcePlan,
  resolveFileViewerLoadStartMessage,
  resolveFileViewerMissingRemoteDataErrorMessage,
  resolveFileViewerPreviewLoadErrorMessage,
  resolveFileViewerPreviewRequestReason,
  resolveFileViewerRemoteSourcePlan,
  resolveFileViewerPageHref,
  resolveFileViewerSourceFilename,
  reportFileViewerMissingRemoteData,
  reportFileViewerPreviewLoadError,
  runFileViewerLocalFilePreview,
  runFileViewerPreviewComponentUnmount,
  runFileViewerPreviewRequest,
  runFileViewerPreviewSourceChange,
  runFileViewerRemoteFilePreview,
  runFileViewerReadAndRenderFile,
  runFileViewerStreamingPdfPreview,
  shouldStreamPdfUrl
} from '../packages/core/src'

const pageHref = 'https://demo.file-viewer.app/app/index.html'

describe('remote source loading helpers', () => {
  it('resolves display filenames from explicit names, file refs and urls', () => {
    expect(resolveFileViewerSourceFilename({
      filename: '/tmp/manual.PDF?token=1',
      file: new File(['demo'], 'ignored.docx'),
      url: '/example/report.docx'
    })).toBe('manual.PDF')
    expect(resolveFileViewerSourceFilename({
      file: new File(['demo'], '合同.docx')
    })).toBe('合同.docx')
    expect(resolveFileViewerSourceFilename({
      url: '/example/%E6%8A%A5%E5%91%8A.pdf?token=1'
    })).toBe('报告.pdf')
    expect(resolveFileViewerSourceFilename({ fallback: '' })).toBe('')
  })

  it('tracks current load versions and aborts stale remote requests', () => {
    const controller = createFileViewerRequestController()
    const firstVersion = controller.createVersion()
    const abortController = controller.createAbortController()

    expect(controller.version).toBe(firstVersion)
    expect(controller.isCurrent(firstVersion)).toBe(true)
    expect(abortController?.signal.aborted).toBe(false)

    const secondVersion = controller.createVersion()

    expect(controller.version).toBe(secondVersion)
    expect(controller.isCurrent(firstVersion)).toBe(false)
    expect(controller.isCurrent(secondVersion)).toBe(true)
    expect(abortController?.signal.aborted).toBe(true)

    const nextAbortController = controller.createAbortController()
    controller.abort()
    expect(nextAbortController?.signal.aborted).toBe(true)
  })

  it('detects browser, fetch and axios cancellation errors without framework code', () => {
    expect(isFileViewerAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(isFileViewerAbortError({ name: 'CanceledError' })).toBe(true)
    expect(isFileViewerAbortError({ code: 'ERR_CANCELED' })).toBe(true)
    expect(isFileViewerAbortError({ __CANCEL__: true })).toBe(true)
    expect(isFileViewerAbortError(new Error('network failed'))).toBe(false)
  })

  it('keeps preview source reset and refresh reason rules in core', () => {
    const file = new File(['demo'], 'demo.txt')

    expect(hasFileViewerPreviewSource({ file })).toBe(true)
    expect(hasFileViewerPreviewSource({ url: '/example/demo.pdf' })).toBe(true)
    expect(hasFileViewerPreviewSource()).toBe(false)
    expect(resolveFileViewerPreviewRequestReason({ file })).toBe('replace')
    expect(resolveFileViewerPreviewRequestReason({ url: '/example/demo.pdf' })).toBe('replace')
    expect(resolveFileViewerPreviewRequestReason()).toBe('reset')
    expect(normalizeFileViewerSourceUrl('/example/demo.pdf')).toBe('/example/demo.pdf')
    expect(normalizeFileViewerSourceUrl('/example/总平面图（05修改1）[1][1].dwg?token=a[1]#preview')).toBe(
      '/example/%E6%80%BB%E5%B9%B3%E9%9D%A2%E5%9B%BE%EF%BC%8805%E4%BF%AE%E6%94%B91%EF%BC%89%5B1%5D%5B1%5D.dwg?token=a[1]#preview'
    )
    expect(normalizeFileViewerSourceUrl('/example/%E6%80%BB%E5%B9%B3%E9%9D%A2%E5%9B%BE%EF%BC%8805%E4%BF%AE%E6%94%B91%EF%BC%89%5B1%5D%5B1%5D.dwg')).toBe(
      '/example/%E6%80%BB%E5%B9%B3%E9%9D%A2%E5%9B%BE%EF%BC%8805%E4%BF%AE%E6%94%B91%EF%BC%89%5B1%5D%5B1%5D.dwg'
    )
    expect(normalizeFileViewerSourceUrl()).toBeNull()
    expect(createFileViewerEmptyPreviewState()).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
    expect(createFileViewerPreviewRequestResetState()).toEqual({
      file: null,
      buffer: null,
      sourceUrl: null,
      progressiveReady: false
    })
  })

  it('keeps special DWG display names while normalizing remote request urls', () => {
    const plan = resolveFileViewerRemoteSourcePlan({
      pageHref,
      url: '/example/总平面图（05修改1）[1][1].dwg?token=a[1]'
    })

    expect(plan.filename).toBe('总平面图（05修改1）[1][1].dwg')
    expect(plan.extension).toBe('dwg')
    expect(plan.url).toBe(
      '/example/%E6%80%BB%E5%B9%B3%E9%9D%A2%E5%9B%BE%EF%BC%8805%E4%BF%AE%E6%94%B91%EF%BC%89%5B1%5D%5B1%5D.dwg?token=a[1]'
    )
  })

  it('applies preview reset state through framework-neutral mutable targets', () => {
    const requestTarget = {
      file: new File(['demo'], 'demo.txt'),
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/demo.txt',
      progressiveReady: true
    }

    expect(applyFileViewerPreviewRequestResetState(requestTarget)).toBe(requestTarget)
    expect(requestTarget).toEqual({
      file: null,
      buffer: null,
      sourceUrl: null,
      progressiveReady: false
    })

    const previewTarget = {
      filename: 'demo.txt',
      file: new File(['demo'], 'demo.txt'),
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/demo.txt',
      renderedReady: true,
      progressiveReady: true
    }

    expect(applyFileViewerEmptyPreviewState(previewTarget)).toBe(previewTarget)
    expect(previewTarget).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
  })

  it('creates mutable preview state targets from framework accessors', () => {
    const backing: {
      filename: string
      file: File | null
      buffer: ArrayBuffer | null
      sourceUrl: string | null
      renderedReady: boolean
      progressiveReady: boolean
    } = {
      filename: 'old.pdf',
      file: new File(['old'], 'old.pdf'),
      buffer: new ArrayBuffer(8),
      sourceUrl: '/old.pdf',
      renderedReady: true,
      progressiveReady: true
    }

    const target = createFileViewerPreviewStateTarget({
      filename: {
        get: () => backing.filename,
        set: value => {
          backing.filename = value
        }
      },
      file: {
        get: () => backing.file,
        set: value => {
          backing.file = value
        }
      },
      buffer: {
        get: () => backing.buffer,
        set: value => {
          backing.buffer = value
        }
      },
      sourceUrl: {
        get: () => backing.sourceUrl,
        set: value => {
          backing.sourceUrl = value
        }
      },
      renderedReady: {
        get: () => backing.renderedReady,
        set: value => {
          backing.renderedReady = value
        }
      },
      progressiveReady: {
        get: () => backing.progressiveReady,
        set: value => {
          backing.progressiveReady = value
        }
      }
    })

    expect(target.filename).toBe('old.pdf')
    expect(applyFileViewerEmptyPreviewState(target)).toBe(target)
    expect(backing).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
  })

  it('commits preview request start state in the shared core order', () => {
    const controller = createFileViewerRequestController()
    const file = new File(['demo'], 'demo.txt')
    const target = {
      file,
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/demo.txt',
      progressiveReady: true
    }
    const events: string[] = []

    const version = commitFileViewerPreviewRequestStartState({
      reason: 'reset',
      requestController: controller,
      previewTarget: target,
      onClearRenderedContent: reason => {
        events.push(`clear:${reason}:${controller.version}:${target.file?.name ?? 'none'}`)
      },
      onClearError: () => {
        events.push(`error:${target.file ? 'dirty' : 'reset'}`)
      }
    })

    expect(version).toBe(1)
    expect(events).toEqual([
      'clear:reset:1:demo.txt',
      'error:reset'
    ])
    expect(target).toEqual({
      file: null,
      buffer: null,
      sourceUrl: null,
      progressiveReady: false
    })
  })

  it('cancels preview requests through the shared core request state', () => {
    const controller = createFileViewerRequestController()
    const file = new File(['demo'], 'cancel.txt')
    const target = {
      file,
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/cancel.txt',
      progressiveReady: true
    }
    const events: string[] = []

    const version = cancelFileViewerPreviewRequest({
      requestController: controller,
      previewTarget: target,
      onClearRenderedContent: reason => {
        events.push(`clear:${reason}:${target.file?.name ?? 'none'}`)
      },
      onClearError: () => {
        events.push(`error:${target.file ? 'dirty' : 'reset'}`)
      }
    })

    expect(version).toBe(1)
    expect(events).toEqual([
      'clear:component-unmount:cancel.txt',
      'error:reset'
    ])
    expect(target).toEqual({
      file: null,
      buffer: null,
      sourceUrl: null,
      progressiveReady: false
    })
  })

  it('runs preview source changes and component unmount cleanup in core order', async () => {
    const events: string[] = []

    await runFileViewerPreviewSourceChange({
      onRefreshPreview: async () => {
        events.push('refresh')
      }
    })
    const unmount = runFileViewerPreviewComponentUnmount({
      onCancelPreview: reason => {
        events.push(`cancel:${reason}`)
      },
      onClearRenderedContent: reason => {
        events.push(`clear:${reason}`)
      },
      onResetLoading: () => {
        events.push('reset-loading')
      },
      onStopZoomObserver: () => {
        events.push('stop-zoom')
      }
    })

    expect(unmount).toEqual({ reason: 'component-unmount' })
    expect(events).toEqual([
      'refresh',
      'cancel:component-unmount',
      'reset-loading',
      'stop-zoom'
    ])
  })

  it('clears rendered content on component unmount when a cancel handler is not provided', () => {
    const events: string[] = []

    runFileViewerPreviewComponentUnmount({
      onClearRenderedContent: reason => {
        events.push(`clear:${reason}`)
      },
      onStopViewStateObserver: () => {
        events.push('stop-view-state')
      }
    })

    expect(events).toEqual([
      'clear:component-unmount',
      'stop-view-state'
    ])
  })

  it('routes preview refresh requests through shared core request orchestration', async () => {
    const controller = createFileViewerRequestController()
    const file = new File(['demo'], 'route.txt')
    const target = {
      filename: 'old.txt',
      file: new File(['old'], 'old.txt'),
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/old.txt',
      renderedReady: true,
      progressiveReady: true
    }
    const events: string[] = []

    const fileResult = await runFileViewerPreviewRequest({
      file,
      requestController: controller,
      previewTarget: target,
      onPreviewLocalFile: async (source, version) => {
        events.push(`local:${source instanceof File ? source.name : 'blob'}:${version}:${target.file ? 'dirty' : 'reset'}`)
        return 'local-result'
      },
      onPreviewRemoteFile: async url => {
        events.push(`remote:${url}`)
        return 'remote-result'
      },
      onClearRenderedContent: reason => {
        events.push(`clear:${reason}:${target.file?.name ?? 'none'}`)
      },
      onClearError: () => {
        events.push(`error:${target.file ? 'dirty' : 'reset'}`)
      },
      onResetLoading: () => {
        events.push('reset-loading')
      }
    })

    expect(fileResult).toEqual({
      status: 'file',
      version: 1,
      reason: 'replace',
      file,
      url: null,
      result: 'local-result'
    })
    expect(events).toEqual([
      'clear:replace:old.txt',
      'error:reset',
      'local:route.txt:1:reset'
    ])

    const urlResult = await runFileViewerPreviewRequest({
      url: '/example/route.pdf',
      requestController: controller,
      previewTarget: target,
      onPreviewLocalFile: async () => {
        events.push('local:unexpected')
        return 'local-result'
      },
      onPreviewRemoteFile: async (url, version) => {
        events.push(`remote:${url}:${version}:${target.file ? 'dirty' : 'reset'}`)
        return 'remote-result'
      },
      onClearRenderedContent: reason => {
        events.push(`clear:${reason}:${target.file?.name ?? 'none'}`)
      },
      onClearError: () => {
        events.push(`error:${target.file ? 'dirty' : 'reset'}`)
      }
    })

    expect(urlResult).toEqual({
      status: 'url',
      version: 2,
      reason: 'replace',
      file: null,
      url: '/example/route.pdf',
      result: 'remote-result'
    })
    expect(events.slice(3)).toEqual([
      'clear:replace:none',
      'error:reset',
      'remote:/example/route.pdf:2:reset'
    ])
  })

  it('creates reusable source loading action handlers for framework wrappers', async () => {
    const controller = createFileViewerRequestController()
    const localFile = new File(['local facade'], 'facade.txt', { type: 'text/plain' })
    const session = { id: 'source-loading-session' }
    let nextFile: File | undefined = localFile
    let nextUrl: string | undefined
    const target = {
      filename: 'old.txt',
      file: new File(['old'], 'old.txt'),
      buffer: new ArrayBuffer(3),
      sourceUrl: '/example/old.txt',
      renderedReady: true,
      progressiveReady: true
    }
    const events: string[] = []
    const errors: string[] = []

    const actions = createFileViewerSourceLoadingActionHandlers({
      getFile: () => nextFile,
      getUrl: () => nextUrl,
      getCurrentFilename: () => target.filename,
      getPdfStreaming: () => false,
      previewTarget: target,
      requestController: controller,
      downloadFile: async ({ url, signal }) => {
        events.push(`download:${url}:${signal ? 'signal' : 'none'}`)
        if (url.includes('missing')) {
          return null
        }
        return new Blob(['remote facade'], { type: 'text/plain' })
      },
      mountRenderedContent: async (buffer, file, version, sourceUrl, streamUrl) => {
        events.push(`mount:${file.name}:${buffer.byteLength}:${version}:${sourceUrl ?? 'none'}:${streamUrl ?? 'none'}`)
        return session
      },
      destroyRenderSession: () => {
        events.push('destroy')
      },
      buildLoadStartState: input => {
        events.push(`build-start:${input.source}:${input.file?.name ?? input.sourceUrl}`)
        return createFileViewerLoadStartState({
          ...input,
          filename: target.filename,
          bufferSize: target.buffer?.byteLength,
          timestamp: 500
        })
      },
      buildRenderCompleteState: input => {
        events.push(`build-complete:${input.source}:${input.file?.name ?? input.sourceUrl}`)
        return createFileViewerRenderCompleteState({
          ...input,
          filename: target.filename,
          bufferSize: target.buffer?.byteLength,
          timestamp: 540
        })
      },
      onMarkLoadStarted: version => {
        events.push(`mark:${version}:${target.filename}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear-load:${version}`)
      },
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onSetLoadingMessage: message => {
        events.push(`message:${message}`)
      },
      onStopLoading: () => {
        events.push('stop')
      },
      onShowError: message => {
        errors.push(message)
      },
      onClearError: () => {
        events.push(`clear-error:${target.file ? 'dirty' : 'reset'}`)
      },
      onResetLoading: () => {
        events.push('reset-loading')
      },
      onClearRenderedContent: reason => {
        events.push(`clear-render:${reason}:${target.filename}`)
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}:${context.filename}`)
      },
      formatErrorMessage: (prefix, error) => `${prefix}: ${error instanceof Error ? error.message : String(error)}`
    })

    const localResult = await actions.refreshPreview()

    expect(localResult.status).toBe('file')
    expect(actions.isCurrentRequest(localResult.version)).toBe(true)
    expect(target).toMatchObject({
      filename: 'facade.txt',
      file: localFile,
      sourceUrl: null,
      renderedReady: true,
      progressiveReady: false
    })
    expect(events).toContain('clear-render:replace:old.txt')
    expect(events).toContain(`loading:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`)
    expect(events).toContain('mount:facade.txt:12:1:none:none')
    expect(events).toContain('session:set')

    events.length = 0
    nextFile = undefined
    nextUrl = '/example/remote.docx'

    const remoteResult = await actions.refreshPreview()

    expect(remoteResult.status).toBe('url')
    expect(remoteResult.result.status).toBe('ready')
    expect(target).toMatchObject({
      filename: 'remote.docx',
      sourceUrl: '/example/remote.docx',
      renderedReady: true,
      progressiveReady: false
    })
    expect(events).toContain('download:/example/remote.docx:signal')
    expect(events).toContain(`message:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`)
    expect(events.some(item => item.startsWith('mount:remote.docx:'))).toBe(true)

    events.length = 0
    nextUrl = '/example/missing.docx'

    const missingResult = await actions.refreshPreview()

    expect(missingResult.status).toBe('url')
    expect(missingResult.result.status).toBe('missing')
    expect(errors).toEqual([FILE_VIEWER_REMOTE_MISSING_DATA_ERROR_MESSAGE])
    expect(events).toContain('download:/example/missing.docx:signal')

    const canceledVersion = actions.cancelPreview('component-unmount')

    expect(canceledVersion).toBe(controller.version)
    expect(target.file).toBeNull()
    expect(target.buffer).toBeNull()
    expect(target.sourceUrl).toBeNull()
    expect(target.progressiveReady).toBe(false)
    expect(events).toContain('clear-render:component-unmount:missing.docx')

    const reset = actions.resetViewer()

    expect(reset).toBe(target)
    expect(target).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
  })

  it('routes empty preview refreshes through request reset then empty reset', async () => {
    const controller = createFileViewerRequestController()
    const target = {
      filename: 'old.txt',
      file: new File(['old'], 'old.txt'),
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/old.txt',
      renderedReady: true,
      progressiveReady: true
    }
    const events: string[] = []

    const result = await runFileViewerPreviewRequest({
      requestController: controller,
      previewTarget: target,
      onPreviewLocalFile: async () => {
        events.push('local')
        return null
      },
      onPreviewRemoteFile: async () => {
        events.push('remote')
        return null
      },
      onClearRenderedContent: reason => {
        events.push(`clear:${reason ?? 'none'}:${target.filename}:${target.renderedReady}`)
      },
      onClearError: () => {
        events.push(`error:${target.file ? 'dirty' : 'reset'}`)
      },
      onResetLoading: () => {
        events.push(`reset-loading:${target.file ? 'dirty' : 'reset'}`)
      }
    })

    expect(result).toMatchObject({
      status: 'reset',
      version: 1,
      reason: 'reset',
      file: null,
      url: null
    })
    expect(result.result).toBe(target)
    expect(events).toEqual([
      'clear:reset:old.txt:true',
      'error:reset',
      'clear:none::false',
      'reset-loading:reset'
    ])
    expect(target).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
  })

  it('commits empty preview reset state in the shared core order', () => {
    const target = {
      filename: 'demo.txt',
      file: new File(['demo'], 'demo.txt'),
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/demo.txt',
      renderedReady: true,
      progressiveReady: true
    }
    const events: string[] = []

    const nextTarget = commitFileViewerEmptyPreviewResetState({
      previewTarget: target,
      onClearRenderedContent: () => {
        events.push(`clear:${target.filename}:${target.renderedReady}`)
      },
      onResetLoading: () => {
        events.push(`loading:${target.file ? 'dirty' : 'reset'}`)
      }
    })

    expect(nextTarget).toBe(target)
    expect(events).toEqual([
      'clear::false',
      'loading:reset'
    ])
    expect(target).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
  })

  it('applies read source and stream URL state without framework-specific refs', () => {
    const file = new File(['demo'], '合同.docx')
    const buffer = new ArrayBuffer(4)
    const readState = createFileViewerReadPreviewState({
      file,
      buffer,
      sourceUrl: '/example/%E5%90%88%E5%90%8C.docx?download=1'
    })

    expect(readState).toEqual({
      filename: '合同.docx',
      file,
      buffer,
      sourceUrl: '/example/%E5%90%88%E5%90%8C.docx?download=1'
    })

    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: false
    }

    expect(applyFileViewerReadPreviewState(target, readState)).toBe(target)
    expect(target).toMatchObject(readState)

    expect(applyFileViewerPreviewSourceUrlState(target, '')).toBe(target)
    expect(target.sourceUrl).toBeNull()
    applyFileViewerPreviewSourceUrlState(target, '/example/pdf.pdf')
    expect(target.sourceUrl).toBe('/example/pdf.pdf')
  })

  it('plans FileRef sources and applies filenames in core', () => {
    const file = new File(['demo'], '合同.docx')
    const filePlan = resolveFileViewerFileRefSourcePlan({ source: file })

    expect(filePlan.file).toBe(file)
    expect(filePlan.filename).toBe('合同.docx')

    const blobPlan = resolveFileViewerFileRefSourcePlan({
      source: new Blob(['demo'], { type: 'text/plain' }),
      currentFilename: '/tmp/manual.txt?token=1'
    })

    expect(blobPlan.file.name).toBe('manual.txt')
    expect(blobPlan.filename).toBe('manual.txt')

    const target = { filename: 'old.bin' }
    expect(applyFileViewerPreviewFilenameState(target, '/example/%E5%90%88%E5%90%8C.pdf?download=1')).toBe(target)
    expect(target.filename).toBe('合同.pdf')
    applyFileViewerPreviewFilenameState(target, '', DEFAULT_FILE_VIEWER_SOURCE_FILENAME)
    expect(target.filename).toBe(DEFAULT_FILE_VIEWER_SOURCE_FILENAME)
  })

  it('applies render readiness state without framework-specific refs', () => {
    const target = {
      renderedReady: false,
      progressiveReady: false
    }

    expect(applyFileViewerRenderReadinessState(target, { renderedReady: true })).toBe(target)
    expect(target).toEqual({
      renderedReady: true,
      progressiveReady: false
    })

    applyFileViewerRenderReadinessState(target, {
      renderedReady: false,
      progressiveReady: true
    })
    expect(target).toEqual({
      renderedReady: false,
      progressiveReady: true
    })
  })

  it('creates load-start lifecycle state and default loading messages in core', () => {
    const file = new File(['demo'], '合同.docx')

    expect(resolveFileViewerLoadStartMessage('file')).toBe(FILE_VIEWER_PREVIEW_MESSAGES.reading)
    expect(resolveFileViewerLoadStartMessage('url')).toBe(FILE_VIEWER_PREVIEW_MESSAGES.downloading)

    expect(createFileViewerLoadStartState({
      version: 8,
      source: 'file',
      file,
      timestamp: 120
    })).toMatchObject({
      loadingMessage: FILE_VIEWER_PREVIEW_MESSAGES.reading,
      lifecycleContext: {
        phase: 'load-start',
        type: 'docx',
        filename: '合同.docx',
        source: 'file',
        size: file.size,
        version: 8,
        timestamp: 120
      }
    })

    expect(createFileViewerLoadStartState({
      version: 9,
      source: 'url',
      filename: 'stream.pdf',
      sourceUrl: '',
      loadingMessage: '自定义加载文案',
      timestamp: 140
    })).toMatchObject({
      loadingMessage: '自定义加载文案',
      lifecycleContext: {
        phase: 'load-start',
        type: 'pdf',
        filename: 'stream.pdf',
        source: 'url',
        url: undefined,
        version: 9,
        timestamp: 140
      }
    })
  })

  it('formats preview load errors through core defaults', () => {
    const formatErrorMessage = (prefix: string, error: unknown) => {
      return `${prefix}:${error instanceof Error ? error.message : String(error)}`
    }

    expect(FILE_VIEWER_PREVIEW_LOAD_ERROR_PREFIXES.local).toBe('读取文件异常')
    expect(FILE_VIEWER_REMOTE_MISSING_DATA_ERROR_MESSAGE).toBe('文件下载失败')
    expect(resolveFileViewerPreviewLoadErrorMessage({
      kind: 'local',
      error: new Error('bad file'),
      formatErrorMessage
    })).toBe('读取文件异常:bad file')
    expect(resolveFileViewerPreviewLoadErrorMessage({
      kind: 'stream',
      error: 'range failed',
      formatErrorMessage
    })).toBe('加载 PDF 流式预览异常:range failed')
    expect(resolveFileViewerPreviewLoadErrorMessage({
      kind: 'load',
      error: 'offline',
      prefixes: {
        load: '远程加载失败'
      },
      formatErrorMessage
    })).toBe('远程加载失败:offline')
    expect(resolveFileViewerMissingRemoteDataErrorMessage()).toBe('文件下载失败')
    expect(resolveFileViewerMissingRemoteDataErrorMessage({ message: '没有拿到文件内容' })).toBe('没有拿到文件内容')

    const loggedErrors: unknown[] = []
    const shownMessages: string[] = []
    const reportError = new Error('report failed')

    expect(reportFileViewerPreviewLoadError({
      kind: 'load',
      error: reportError,
      formatErrorMessage,
      onLogError: error => {
        loggedErrors.push(error)
      },
      onErrorMessage: message => {
        shownMessages.push(message)
      }
    })).toBe('加载文件异常:report failed')
    expect(loggedErrors).toEqual([reportError])
    expect(shownMessages).toEqual(['加载文件异常:report failed'])

    expect(reportFileViewerMissingRemoteData({
      message: '远程文件为空',
      onErrorMessage: message => {
        shownMessages.push(message)
      }
    })).toBe('远程文件为空')
    expect(shownMessages).toEqual(['加载文件异常:report failed', '远程文件为空'])
  })

  it('commits load-start state in the shared core order', () => {
    const events: string[] = []
    const filenameTarget = { filename: 'old.pdf' }
    const file = new File(['demo'], 'start.pdf')

    const loadStart = commitFileViewerLoadStartState({
      version: 11,
      filename: '/example/start.pdf?token=1',
      filenameTarget,
      buildState: () => {
        events.push('build')
        return createFileViewerLoadStartState({
          version: 11,
          source: 'file',
          file,
          timestamp: 200
        })
      },
      onMarkLoadStarted: version => {
        events.push(`mark:${version}:${filenameTarget.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}:${context.filename}`)
      },
      onStartLoading: message => {
        events.push(`loading:${message}`)
      }
    })

    expect(events).toEqual([
      'mark:11:start.pdf',
      'build',
      'lifecycle:load-start:start.pdf',
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`
    ])
    expect(filenameTarget.filename).toBe('start.pdf')
    expect(loadStart.lifecycleContext).toMatchObject({
      phase: 'load-start',
      filename: 'start.pdf',
      source: 'file',
      version: 11
    })
  })

  it('creates render complete lifecycle state from preview source data', () => {
    const file = new File(['demo'], '合同.docx')
    const complete = createFileViewerRenderCompleteState({
      version: 9,
      source: 'file',
      file,
      bufferSize: 16,
      startedAt: 0,
      timestamp: 240
    })

    expect(complete.readiness).toEqual({
      renderedReady: true,
      progressiveReady: false
    })
    expect(complete.lifecycleContext).toMatchObject({
      phase: 'load-complete',
      type: 'docx',
      filename: '合同.docx',
      source: 'file',
      size: file.size,
      version: 9,
      timestamp: 240,
      duration: 240
    })

    expect(createFileViewerRenderCompleteState({
      version: 10,
      source: 'url',
      filename: 'stream.pdf',
      sourceUrl: '',
      bufferSize: 0,
      lifecycleState: {
        getLoadStartedAt: () => 100
      },
      timestamp: 125
    }).lifecycleContext).toMatchObject({
      filename: 'stream.pdf',
      source: 'url',
      url: undefined,
      size: 0,
      duration: 25
    })
  })

  it('commits render complete state in the shared core order', () => {
    const events: string[] = []
    const file = new File(['demo'], 'complete.pdf')
    const session = { id: 'session-1' }
    const readiness = {
      renderedReady: false,
      progressiveReady: true
    }

    const complete = commitFileViewerRenderCompleteState({
      version: 12,
      session,
      readinessTarget: readiness,
      buildState: () => {
        events.push('build')
        return createFileViewerRenderCompleteState({
          version: 12,
          source: 'file',
          file,
          bufferSize: 4,
          timestamp: 260
        })
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      }
    })

    expect(events).toEqual([
      'session:set',
      'build',
      'active:load-complete:complete.pdf',
      'lifecycle:load-complete',
      'clear:12'
    ])
    expect(readiness).toEqual({
      renderedReady: true,
      progressiveReady: false
    })
    expect(complete.lifecycleContext).toMatchObject({
      phase: 'load-complete',
      filename: 'complete.pdf',
      source: 'file',
      version: 12
    })
  })

  it('runs local file preview through shared core orchestration', async () => {
    const events: string[] = []
    const file = new File(['demo'], 'local.docx')
    const session = { id: 'local-session' }
    const target = {
      filename: 'old.bin',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerLocalFilePreview({
      source: file,
      version: 13,
      currentFilename: 'old.bin',
      previewTarget: target,
      isCurrent: version => version === 13,
      mountRenderedContent: async (buffer, nextFile, version, sourceUrl) => {
        events.push(`mount:${nextFile.name}:${buffer.byteLength}:${version}:${sourceUrl ?? 'none'}`)
        return session
      },
      destroyRenderSession: () => {
        events.push('destroy')
      },
      buildLoadStartState: input => {
        events.push(`build-start:${input.source}:${input.file.name}`)
        return createFileViewerLoadStartState({
          ...input,
          timestamp: 300
        })
      },
      buildRenderCompleteState: input => {
        events.push(`build-complete:${input.source}:${input.file.name}`)
        return createFileViewerRenderCompleteState({
          ...input,
          timestamp: 340
        })
      },
      onMarkLoadStarted: version => {
        events.push(`mark:${version}:${target.filename}`)
      },
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}:${context.filename}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      },
      onError: () => {
        events.push('error')
      }
    })

    if (result.status !== 'ready') {
      throw new Error(`Expected ready local preview state, got ${result.status}`)
    }
    expect(result.source.file).toBe(file)
    expect(result.read.session).toBe(session)
    expect(target).toMatchObject({
      filename: 'local.docx',
      file,
      sourceUrl: null,
      renderedReady: true,
      progressiveReady: false
    })
    expect(target.buffer?.byteLength).toBe(4)
    expect(events).toEqual([
      'mark:13:local.docx',
      'build-start:file:local.docx',
      'lifecycle:load-start:local.docx',
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`,
      'mount:local.docx:4:13:none',
      'session:set',
      'build-complete:file:local.docx',
      'active:load-complete:local.docx',
      'lifecycle:load-complete:local.docx',
      'clear:13',
      'clear:13',
      'stop'
    ])
  })

  it('returns stale local file preview state without mounting stale files', async () => {
    const events: string[] = []
    const file = new File(['demo'], 'stale-local.docx')
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerLocalFilePreview({
      source: file,
      version: 14,
      previewTarget: target,
      isCurrent: () => false,
      mountRenderedContent: async () => {
        events.push('mount')
        return undefined
      },
      buildLoadStartState: input => createFileViewerLoadStartState(input),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    expect(result).toMatchObject({
      status: 'stale',
      error: null
    })
    expect(result.read).toBeNull()
    expect(target).toEqual({
      filename: 'stale-local.docx',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: true
    })
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`,
      'clear:14'
    ])
  })

  it('reports current local file preview mount errors through shared core flow', async () => {
    const events: string[] = []
    const error = new Error('local mount failed')
    const file = new File(['demo'], 'broken.docx')
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: false
    }

    const result = await runFileViewerLocalFilePreview({
      source: file,
      version: 15,
      previewTarget: target,
      isCurrent: version => version === 15,
      mountRenderedContent: async () => {
        throw error
      },
      buildLoadStartState: input => createFileViewerLoadStartState(input),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onError: nextError => {
        events.push(nextError === error ? 'error:reported' : 'error:miss')
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    expect(result).toMatchObject({
      status: 'error',
      source: {
        file,
        filename: 'broken.docx'
      },
      read: null,
      error
    })
    expect(target).toMatchObject({
      filename: 'broken.docx',
      file,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
    expect(target.buffer?.byteLength).toBe(4)
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`,
      'error:reported',
      'clear:15',
      'stop'
    ])
  })

  it('runs read and render flow through shared core orchestration', async () => {
    const events: string[] = []
    const file = new File(['demo'], 'render.pdf')
    const session = { id: 'session-1' }
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerReadAndRenderFile({
      file,
      version: 14,
      sourceUrl: '/example/render.pdf',
      previewTarget: target,
      isCurrent: version => version === 14,
      mountRenderedContent: async (buffer, nextFile, version, sourceUrl) => {
        events.push(`mount:${nextFile.name}:${buffer.byteLength}:${version}:${sourceUrl}`)
        return session
      },
      destroyRenderSession: () => {
        events.push('destroy')
      },
      buildRenderCompleteState: input => {
        events.push(`build:${input.source}:${input.file?.name}:${input.sourceUrl}`)
        return createFileViewerRenderCompleteState({
          ...input,
          timestamp: 320
        })
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      }
    })

    expect(result.stale).toBe(false)
    expect(result.session).toBe(session)
    expect(result.complete?.lifecycleContext).toMatchObject({
      phase: 'load-complete',
      filename: 'render.pdf',
      source: 'url'
    })
    expect(target).toMatchObject({
      filename: 'render.pdf',
      file,
      sourceUrl: '/example/render.pdf',
      renderedReady: true,
      progressiveReady: false
    })
    expect(target.buffer?.byteLength).toBe(4)
    expect(events).toEqual([
      'mount:render.pdf:4:14:/example/render.pdf',
      'session:set',
      'build:url:render.pdf:/example/render.pdf',
      'active:load-complete:render.pdf',
      'lifecycle:load-complete',
      'clear:14'
    ])
  })

  it('destroys stale render sessions from shared read and render flow', async () => {
    const events: string[] = []
    const file = new File(['demo'], 'stale.pdf')
    const session = { id: 'stale-session' }
    let checks = 0
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: false
    }

    const result = await runFileViewerReadAndRenderFile({
      file,
      version: 15,
      previewTarget: target,
      isCurrent: () => {
        checks += 1
        return checks === 1
      },
      mountRenderedContent: async () => session,
      destroyRenderSession: nextSession => {
        events.push(nextSession === session ? 'destroy:session' : 'destroy:miss')
      },
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input)
    })

    expect(result).toMatchObject({
      stale: true,
      session,
      complete: null
    })
    expect(events).toEqual(['destroy:session'])
    expect(target.renderedReady).toBe(false)
  })

  it('runs streaming PDF preview through shared core orchestration', async () => {
    const events: string[] = []
    const session = { id: 'stream-session' }
    const target = {
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerStreamingPdfPreview({
      url: '/example/stream.pdf',
      version: 16,
      filename: '报告.pdf',
      previewTarget: target,
      isCurrent: version => version === 16,
      mountRenderedContent: async (buffer, file, version, sourceUrl, streamUrl) => {
        events.push(`mount:${file.name}:${buffer.byteLength}:${version}:${sourceUrl}:${streamUrl}`)
        return session
      },
      destroyRenderSession: () => {
        events.push('destroy')
      },
      buildRenderCompleteState: input => {
        events.push(`build:${input.source}:${input.sourceUrl}`)
        return createFileViewerRenderCompleteState({
          ...input,
          filename: '报告.pdf',
          timestamp: 360
        })
      },
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      },
      onError: () => {
        events.push('error')
      }
    })

    expect(result.status).toBe('ready')
    expect(result.placeholderFile?.name).toBe('报告.pdf')
    expect(result.session).toBe(session)
    expect(result.complete?.lifecycleContext).toMatchObject({
      phase: 'load-complete',
      filename: '报告.pdf',
      source: 'url',
      url: '/example/stream.pdf'
    })
    expect(target).toEqual({
      sourceUrl: '/example/stream.pdf',
      renderedReady: true,
      progressiveReady: false
    })
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf}`,
      'mount:报告.pdf:0:16:/example/stream.pdf:/example/stream.pdf',
      'session:set',
      'build:url:/example/stream.pdf',
      'active:load-complete:报告.pdf',
      'lifecycle:load-complete',
      'clear:16',
      'clear:16',
      'stop'
    ])
  })

  it('destroys stale streaming PDF sessions without committing readiness', async () => {
    const events: string[] = []
    const session = { id: 'stale-stream-session' }
    const target = {
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerStreamingPdfPreview({
      url: '/example/stale.pdf',
      version: 17,
      filename: 'stale.pdf',
      previewTarget: target,
      isCurrent: () => false,
      mountRenderedContent: async () => session,
      destroyRenderSession: nextSession => {
        events.push(nextSession === session ? 'destroy:session' : 'destroy:miss')
      },
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    expect(result).toMatchObject({
      status: 'stale',
      session,
      complete: null,
      error: null
    })
    expect(target).toEqual({
      sourceUrl: '/example/stale.pdf',
      renderedReady: false,
      progressiveReady: true
    })
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf}`,
      'destroy:session',
      'clear:17'
    ])
  })

  it('reports current streaming PDF mount errors through shared core flow', async () => {
    const events: string[] = []
    const error = new Error('stream failed')
    const target = {
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: false
    }

    const result = await runFileViewerStreamingPdfPreview({
      url: '/example/error.pdf',
      version: 18,
      filename: 'error.pdf',
      previewTarget: target,
      isCurrent: version => version === 18,
      mountRenderedContent: async () => {
        throw error
      },
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onError: nextError => {
        events.push(nextError === error ? 'error:reported' : 'error:miss')
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    expect(result).toMatchObject({
      status: 'error',
      complete: null,
      error
    })
    expect(result.placeholderFile?.name).toBe('error.pdf')
    expect(target).toEqual({
      sourceUrl: '/example/error.pdf',
      renderedReady: false,
      progressiveReady: false
    })
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf}`,
      'error:reported',
      'clear:18',
      'stop'
    ])
  })

  it('runs remote file preview through shared core orchestration', async () => {
    const events: string[] = []
    const session = { id: 'remote-session' }
    const requestController = createFileViewerRequestController()
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerRemoteFilePreview({
      url: '/example/remote.docx',
      version: 19,
      pageHref,
      streaming: false,
      previewTarget: target,
      requestController,
      isCurrent: version => version === 19,
      downloadFile: async ({ url, signal }) => {
        events.push(`download:${url}:${signal ? 'signal' : 'no-signal'}`)
        return new Blob(['demo'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      },
      mountRenderedContent: async (buffer, file, version, sourceUrl) => {
        events.push(`mount:${file.name}:${buffer.byteLength}:${version}:${sourceUrl}`)
        return session
      },
      buildLoadStartState: input => {
        events.push(`build-start:${input.source}:${input.sourceUrl}`)
        return createFileViewerLoadStartState({
          ...input,
          timestamp: 380
        })
      },
      buildRenderCompleteState: input => {
        events.push(`build-complete:${input.source}:${input.file?.name}:${input.sourceUrl}`)
        return createFileViewerRenderCompleteState({
          ...input,
          timestamp: 420
        })
      },
      onMarkLoadStarted: version => {
        events.push(`mark:${version}:${target.filename}`)
      },
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onSetLoadingMessage: message => {
        events.push(`message:${message}`)
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}:${context.filename}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      },
      onMissingData: () => {
        events.push('missing')
      },
      onError: () => {
        events.push('error')
      }
    })

    if (result.status !== 'ready') {
      throw new Error(`Expected ready remote preview state, got ${result.status}`)
    }
    expect(result.remoteSource).toMatchObject({
      filename: 'remote.docx',
      streamPdf: false
    })
    expect(result.download.source.file.name).toBe('remote.docx')
    expect(result.read.session).toBe(session)
    expect(target).toMatchObject({
      filename: 'remote.docx',
      file: result.download.source.file,
      sourceUrl: '/example/remote.docx',
      renderedReady: true,
      progressiveReady: false
    })
    expect(target.buffer?.byteLength).toBe(4)
    expect(events).toEqual([
      'mark:19:remote.docx',
      'build-start:url:/example/remote.docx',
      'lifecycle:load-start:remote.docx',
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.downloading}`,
      'download:/example/remote.docx:signal',
      `message:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`,
      'mount:remote.docx:4:19:/example/remote.docx',
      'session:set',
      'build-complete:url:remote.docx:/example/remote.docx',
      'active:load-complete:remote.docx',
      'lifecycle:load-complete:remote.docx',
      'clear:19',
      'clear:19',
      'stop'
    ])
  })

  it('runs remote streaming PDF preview through the shared remote flow', async () => {
    const events: string[] = []
    const session = { id: 'remote-stream-session' }
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerRemoteFilePreview({
      url: '/example/stream.pdf',
      version: 20,
      pageHref,
      streaming: true,
      previewTarget: target,
      requestController: createFileViewerRequestController(),
      isCurrent: version => version === 20,
      downloadFile: async () => {
        events.push('download')
        return new Blob(['should-not-download'])
      },
      mountRenderedContent: async (buffer, file, version, sourceUrl, streamUrl) => {
        events.push(`mount:${file.name}:${buffer.byteLength}:${version}:${sourceUrl}:${streamUrl}`)
        return session
      },
      buildLoadStartState: input => {
        events.push(`build-start:${input.source}:${input.sourceUrl}`)
        return createFileViewerLoadStartState(input)
      },
      buildRenderCompleteState: input => {
        events.push(`build-complete:${input.source}:${input.sourceUrl}`)
        return createFileViewerRenderCompleteState({
          ...input,
          filename: 'stream.pdf',
          timestamp: 440
        })
      },
      onMarkLoadStarted: version => {
        events.push(`mark:${version}:${target.filename}`)
      },
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}:${context.filename}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    if (result.status !== 'stream') {
      throw new Error(`Expected streaming remote preview state, got ${result.status}`)
    }
    expect(result.stream.session).toBe(session)
    expect(result.remoteSource.streamPdf).toBe(true)
    expect(target).toMatchObject({
      filename: 'stream.pdf',
      sourceUrl: '/example/stream.pdf',
      renderedReady: true,
      progressiveReady: false
    })
    expect(events).toEqual([
      'mark:20:stream.pdf',
      'build-start:url:/example/stream.pdf',
      'lifecycle:load-start:stream.pdf',
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.downloading}`,
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf}`,
      'mount:stream.pdf:0:20:/example/stream.pdf:/example/stream.pdf',
      'session:set',
      'build-complete:url:/example/stream.pdf',
      'active:load-complete:stream.pdf',
      'lifecycle:load-complete:stream.pdf',
      'clear:20',
      'clear:20',
      'stop'
    ])
  })

  it('reports missing remote downloads through the shared remote flow', async () => {
    const events: string[] = []
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerRemoteFilePreview({
      url: '/example/missing.docx',
      version: 21,
      pageHref,
      streaming: false,
      previewTarget: target,
      requestController: createFileViewerRequestController(),
      isCurrent: version => version === 21,
      downloadFile: async () => null,
      mountRenderedContent: async () => {
        events.push('mount')
        return undefined
      },
      buildLoadStartState: input => createFileViewerLoadStartState(input),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onMissingData: () => {
        events.push('missing')
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    expect(result).toMatchObject({
      status: 'missing',
      error: null
    })
    expect(target).toMatchObject({
      filename: 'missing.docx',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: true
    })
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.downloading}`,
      'missing',
      'clear:21',
      'stop'
    ])
  })

  it('suppresses aborted remote downloads through the shared remote flow', async () => {
    const events: string[] = []
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerRemoteFilePreview({
      url: '/example/abort.docx',
      version: 22,
      pageHref,
      streaming: false,
      previewTarget: target,
      requestController: createFileViewerRequestController(),
      isCurrent: version => version === 22,
      downloadFile: async () => {
        throw { name: 'AbortError' }
      },
      mountRenderedContent: async () => {
        events.push('mount')
        return undefined
      },
      buildLoadStartState: input => createFileViewerLoadStartState(input),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onError: () => {
        events.push('error')
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    expect(result).toMatchObject({
      status: 'stale',
      error: null
    })
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.downloading}`,
      'clear:22',
      'stop'
    ])
  })

  it('reports current remote download errors through the shared remote flow', async () => {
    const events: string[] = []
    const error = new Error('download failed')
    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: true
    }

    const result = await runFileViewerRemoteFilePreview({
      url: '/example/error.docx',
      version: 23,
      pageHref,
      streaming: false,
      previewTarget: target,
      requestController: createFileViewerRequestController(),
      isCurrent: version => version === 23,
      downloadFile: async () => {
        throw error
      },
      mountRenderedContent: async () => {
        events.push('mount')
        return undefined
      },
      buildLoadStartState: input => createFileViewerLoadStartState(input),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState(input),
      onStartLoading: message => {
        events.push(`loading:${message}`)
      },
      onError: (nextError, kind) => {
        events.push(`${kind}:${nextError === error ? 'reported' : 'miss'}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    expect(result).toMatchObject({
      status: 'error',
      error
    })
    expect(target.filename).toBe('error.docx')
    expect(events).toEqual([
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.downloading}`,
      'load:reported',
      'clear:23',
      'stop'
    ])
  })

  it('finalizes preview load state without stopping newer requests', () => {
    const events: string[] = []
    finalizeFileViewerPreviewLoadState({
      version: 12,
      isCurrent: version => version === 12,
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stop')
      }
    })

    finalizeFileViewerPreviewLoadState({
      version: 13,
      isCurrent: version => version === 12,
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      },
      onStopLoading: () => {
        events.push('stale-stop')
      }
    })

    expect(events).toEqual([
      'clear:12',
      'stop',
      'clear:13'
    ])
  })

  it('defaults PDF streaming to same-origin URLs', () => {
    expect(resolveFileViewerPageHref({ href: pageHref })).toBe(pageHref)
    expect(resolveFileViewerPageHref({ href: '' })).toBeUndefined()
    expect(resolveFileViewerPageHref(undefined)).toBeUndefined()
    expect(normalizePdfStreamingMode(undefined)).toBe('same-origin')
    expect(shouldStreamPdfUrl({
      extension: 'pdf',
      pageHref,
      url: '/example/pdf.pdf'
    })).toBe(true)
  })

  it('builds a framework-neutral remote source loading plan', () => {
    expect(resolveFileViewerRemoteSourcePlan({
      pageHref,
      url: '/example/%E6%8A%A5%E5%91%8A.pdf?token=1'
    })).toEqual({
      url: '/example/%E6%8A%A5%E5%91%8A.pdf?token=1',
      filename: '报告.pdf',
      extension: 'pdf',
      streamPdf: true,
      streamRenderer: false,
      streamType: undefined
    })

    expect(resolveFileViewerRemoteSourcePlan({
      pageHref,
      streaming: true,
      url: 'https://cdn.example.com/files/demo.DOCX?download=1'
    })).toMatchObject({
      filename: 'demo.DOCX',
      extension: 'docx',
      streamPdf: false
    })
  })

  it('commits remote download results without framework-specific request code', () => {
    const messages: string[] = []
    const missing = commitFileViewerRemoteDownloadState({
      version: 2,
      data: null,
      currentFilename: 'missing.docx',
      isCurrent: version => version === 2,
      onMissingData: () => {
        messages.push('missing')
      },
      onSetLoadingMessage: message => {
        messages.push(message)
      }
    })

    expect(missing).toEqual({
      stale: false,
      missing: true,
      source: null
    })
    expect(messages).toEqual(['missing'])

    const stale = commitFileViewerRemoteDownloadState({
      version: 3,
      data: new Blob(['demo'], { type: 'text/plain' }),
      currentFilename: 'stale.txt',
      isCurrent: version => version === 4,
      onMissingData: () => {
        messages.push('stale-missing')
      },
      onSetLoadingMessage: message => {
        messages.push(`stale:${message}`)
      }
    })

    expect(stale).toEqual({
      stale: true,
      missing: false,
      source: null
    })

    const ready = commitFileViewerRemoteDownloadState({
      version: 4,
      data: new Blob(['demo'], { type: 'text/plain' }),
      currentFilename: '/remote/%E5%90%88%E5%90%8C.txt?token=1',
      isCurrent: version => version === 4,
      onSetLoadingMessage: message => {
        messages.push(message)
      }
    })

    expect(ready.stale).toBe(false)
    expect(ready.missing).toBe(false)
    expect(ready.source?.filename).toBe('合同.txt')
    expect(ready.source?.file.name).toBe('合同.txt')
    expect(messages).toEqual([
      'missing',
      FILE_VIEWER_PREVIEW_MESSAGES.reading
    ])
  })

  it('keeps source fallback filenames and streaming PDF placeholders in core', () => {
    expect(resolveFileViewerRemoteSourcePlan({
      pageHref,
      url: ''
    }).filename).toBe(DEFAULT_FILE_VIEWER_SOURCE_FILENAME)

    const fallbackPdf = createFileViewerStreamingPdfPlaceholderFile()
    expect(fallbackPdf.name).toBe(DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME)
    expect(fallbackPdf.type).toBe('application/pdf')

    const namedPdf = createFileViewerStreamingPdfPlaceholderFile('/tmp/%E5%90%88%E5%90%8C.pdf?download=1')
    expect(namedPdf.name).toBe('合同.pdf')
    expect(namedPdf.type).toBe('application/pdf')
  })

  it('keeps cross-origin PDF URLs on the compatible blob-download path by default', () => {
    expect(shouldStreamPdfUrl({
      extension: 'pdf',
      pageHref,
      url: 'https://cdn.example.com/example/pdf.pdf'
    })).toBe(false)
  })

  it('allows hosts to force or disable PDF URL streaming', () => {
    expect(shouldStreamPdfUrl({
      extension: 'PDF',
      pageHref,
      streaming: true,
      url: 'https://cdn.example.com/example/pdf.pdf'
    })).toBe(true)

    expect(shouldStreamPdfUrl({
      extension: 'pdf',
      pageHref,
      streaming: false,
      url: '/example/pdf.pdf'
    })).toBe(false)
  })

  it('never streams non-PDF files through the PDF path', () => {
    expect(shouldStreamPdfUrl({
      extension: 'docx',
      pageHref,
      streaming: true,
      url: '/example/word.docx'
    })).toBe(false)
  })
})
