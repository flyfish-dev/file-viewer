import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  createDemoFileCapsuleMotionController,
  resolveDemoFileCapsuleMergeBounds,
  DEMO_FILE_CAPSULE_MOTION
} from '../apps/viewer-demo/src/composables/useDemoFileCapsuleMotion'

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const helloWorldSource = readProjectFile('apps/viewer-demo/src/components/HelloWorld.vue')
const capsuleMotionSource = readProjectFile(
  'apps/viewer-demo/src/composables/useDemoFileCapsuleMotion.ts'
)
const immersiveShellCss = readProjectFile('apps/viewer-demo/src/assets/demo-shell-immersive.css')
const vue3FileViewerSource = readProjectFile(
  'packages/components/vue3/src/package/components/FileViewer/FileViewer.vue'
)
const recentFilesSource = readProjectFile(
  'apps/viewer-demo/src/components/demo/DemoRecentFiles.vue'
)

describe('desktop file capsule motion contract', () => {
  it('keeps the merged target and document inset independent of hover translation', () => {
    const bounds = { top: 28, bottom: 78, left: 400, right: 532, width: 132, height: 50 }
    const expected = resolveDemoFileCapsuleMergeBounds(bounds, 238)
    for (const translation of [{ x: 0, y: -1 }, { x: 0, y: -0.37 }, { x: 2.5, y: -1 }]) {
      const visual = { ...bounds, top: bounds.top + translation.y,
        bottom: bounds.bottom + translation.y, left: bounds.left + translation.x,
        right: bounds.right + translation.x }
      expect(resolveDemoFileCapsuleMergeBounds(visual, 238, translation)).toEqual(expected)
    }
    expect(expected).toEqual({ top: 28, bottom: 78, left: 347, right: 585, width: 238, height: 50 })
    expect(resolveDemoFileCapsuleMergeBounds(bounds, Number.NaN)).toEqual(bounds)
    expect(resolveDemoFileCapsuleMergeBounds(bounds, 0)).toEqual(bounds)
  })

  it('starts merged, expands on top-capsule hover, then runs the delayed capsule morph', () => {
    expect(DEMO_FILE_CAPSULE_MOTION).toEqual({
      idleDelay: 1_000,
      compactDuration: 140,
      mergeDuration: 360,
      expandDuration: 360
    })

    for (const state of ['compacting', 'merging', 'merged', 'expanding']) {
      expect(capsuleMotionSource).toContain(`state.value = '${state}'`)
      expect(immersiveShellCss).toContain(`[data-file-capsule-state='${state}']`)
    }
    expect(capsuleMotionSource).toContain('controller.settle()')
    expect(capsuleMotionSource).toContain('options.resolveTriggerBounds()')
    expect(capsuleMotionSource).toContain("document.addEventListener('pointermove'")
    expect(capsuleMotionSource).not.toContain('movementY')
    expect(helloWorldSource).toContain("ref='topCapsuleNavigationRef'")
    expect(helloWorldSource).toContain("@pointerenter='handleFileCapsulePointerEnter'")
    expect(helloWorldSource).toContain("@pointerleave='handleFileCapsulePointerLeave'")
    expect(helloWorldSource).not.toContain('file-capsule-fusion')
    expect(helloWorldSource).not.toContain('Droplet,')
    expect(capsuleMotionSource).not.toContain("| 'droplet'")
    expect(capsuleMotionSource).not.toContain("| 'bridging'")
    expect(immersiveShellCss).not.toContain('file-capsule-fusion')
    expect(immersiveShellCss).not.toContain('file-capsule-bridge-')
    expect(immersiveShellCss).not.toContain('rgba(103, 78, 214')
    expect(immersiveShellCss).toContain(
      'transition: width 140ms cubic-bezier(0.22, 1, 0.36, 1);'
    )
  })

  it('keeps the interaction direction stable across enter, leave and re-entry', () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis)
    })

    const bounds = (top: number, left: number, width: number, height: number) => ({
      top,
      right: left + width,
      bottom: top + height,
      left,
      width,
      height
    })
    const controller = createDemoFileCapsuleMotionController({
      enabled: () => true,
      canMerge: () => true,
      resolveFileBounds: () => bounds(120, 420, 310, 58),
      resolveTriggerBounds: () => bounds(19, 360, 430, 66),
      resolveMergeTarget: () => bounds(27, 458, 238, 50)
    })

    try {
      controller.settle()
      expect(controller.state.value).toBe('merged')
      expect(controller.motionStyle.value).toEqual({
        '--demo-file-capsule-target-top': '27px',
        '--demo-file-capsule-target-left': '458px',
        '--demo-file-capsule-target-width': '238px',
        '--demo-file-capsule-target-height': '50px',
        '--demo-file-capsule-collapsed-bottom': '77px'
      })

      controller.handlePointerEnter()
      expect(controller.state.value).toBe('expanding')
      vi.advanceTimersByTime(DEMO_FILE_CAPSULE_MOTION.expandDuration)
      expect(controller.state.value).toBe('expanded')

      controller.handleFocusOut()
      vi.advanceTimersByTime(DEMO_FILE_CAPSULE_MOTION.idleDelay)
      expect(controller.state.value).toBe('expanded')

      controller.handlePointerLeave()
      vi.advanceTimersByTime(DEMO_FILE_CAPSULE_MOTION.idleDelay - 1)
      expect(controller.state.value).toBe('expanded')
      vi.advanceTimersByTime(1)
      expect(controller.state.value).toBe('compacting')

      controller.handlePointerEnter()
      expect(controller.state.value).toBe('expanding')
      vi.advanceTimersByTime(DEMO_FILE_CAPSULE_MOTION.expandDuration)
      expect(controller.state.value).toBe('expanded')

      controller.handlePointerLeave()
      vi.advanceTimersByTime(DEMO_FILE_CAPSULE_MOTION.idleDelay)
      expect(controller.state.value).toBe('compacting')
      vi.advanceTimersByTime(DEMO_FILE_CAPSULE_MOTION.compactDuration)
      expect(controller.state.value).toBe('merging')
      vi.advanceTimersByTime(DEMO_FILE_CAPSULE_MOTION.mergeDuration)
      expect(controller.state.value).toBe('merged')
    } finally {
      controller.dispose()
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })

  it('moves the single real file identity control instead of duplicating its information', () => {
    expect(helloWorldSource.match(/ref='fileIdentityButtonRef'/g)).toHaveLength(1)
    expect(helloWorldSource).toContain(":data-file-capsule-state='fileCapsuleState'")
    expect(helloWorldSource).toContain(":style='fileCapsuleMotionStyle'")
    expect(helloWorldSource).toContain("class='viewer-toolbar'")
    expect(helloWorldSource).toContain(":meta='currentIconMeta'")
    expect(helloWorldSource).toContain('{{ displayName }}')
    expect(helloWorldSource).toContain('{{ previewType }}')
    expect(helloWorldSource).toContain(":aria-label='fileIdentityAriaLabel'")
    expect(immersiveShellCss).toContain("[data-file-capsule-state='merged'] .viewer-type")
  })

  it('starts below the capsule without sacrificing full-height immersive scrolling', () => {
    expect(capsuleMotionSource).toContain("'--demo-file-capsule-collapsed-bottom'")
    expect(immersiveShellCss).toContain(
      'calc(var(--demo-file-capsule-collapsed-bottom) + var(--demo-document-start-gap))'
    )
    expect(immersiveShellCss).not.toContain('.viewport :deep(.file-render)')
    expect(immersiveShellCss).not.toContain(
      ".viewport :deep([data-viewer-scroll-root='true'])"
    )
    expect(vue3FileViewerSource).toContain(
      'padding-block-start: var(--file-viewer-content-start-inset, 0px);'
    )
    expect(vue3FileViewerSource).toContain(
      'scroll-padding-block-start: var(--file-viewer-content-start-inset, 0px);'
    )
    expect(vue3FileViewerSource).not.toContain(
      'overflow: auto;\n  padding-block-start: var(--file-viewer-content-start-inset, 0px);'
    )
    expect(immersiveShellCss).toContain('--file-viewer-scrollbar-track: transparent;')
    expect(immersiveShellCss).toContain(
      '--file-viewer-scrollbar-thumb: var(--demo-scrollbar-thumb);'
    )
    expect(vue3FileViewerSource).toContain(
      'scrollbar-color: var(--file-viewer-scrollbar-colors);'
    )
    expect(vue3FileViewerSource).toContain('.content::-webkit-scrollbar-track')
    expect(vue3FileViewerSource).toContain(
      '.content :deep(.file-render)::-webkit-scrollbar-track'
    )
  })

  it('keeps the interaction desktop-only and respects reduced motion', () => {
    expect(helloWorldSource).toContain('(min-width: 721px) and (hover: hover) and (pointer: fine)')
    expect(helloWorldSource).toContain('(prefers-reduced-motion: reduce)')
    expect(immersiveShellCss).toContain('@media (max-width: 720px)')
    expect(immersiveShellCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(immersiveShellCss).not.toContain('.file-capsule-fusion')
  })

  it('shows the remembered-open time with machine-readable metadata', () => {
    expect(recentFilesSource).toContain("<time class='demo-recent-files__time'")
    expect(recentFilesSource).toContain(":datetime='entry.timeIso'")
    expect(helloWorldSource).toContain('timeLabel: recentTimeFormatter.value.format')
    expect(helloWorldSource).toContain('timeIso: new Date(entry.timestamp).toISOString()')
  })
})
