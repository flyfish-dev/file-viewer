import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type DemoFileCapsuleState = 'expanded' | 'compacting' | 'merging' | 'merged' | 'expanding'

export const DEMO_FILE_CAPSULE_MOTION = Object.freeze({
  idleDelay: 1_000,
  compactDuration: 140,
  mergeDuration: 360,
  expandDuration: 360
})

type CapsuleBounds = Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left' | 'width' | 'height'>

export function resolveDemoFileCapsuleMergeBounds(
  bounds: CapsuleBounds,
  configuredWidth: number,
  translation = { x: 0, y: 0 }
): CapsuleBounds {
  const width = Number.isFinite(configuredWidth) && configuredWidth > 0
    ? configuredWidth
    : bounds.width
  // Hover translation is visual only and must not change the document inset.
  const left = bounds.left - translation.x - (width - bounds.width) / 2
  const top = bounds.top - translation.y
  return { top, right: left + width, bottom: top + bounds.height,
    left, width, height: bounds.height }
}

export interface UseDemoFileCapsuleMotionOptions {
  enabled: () => boolean
  canMerge: () => boolean
  resolveFileBounds: () => CapsuleBounds | null
  resolveTriggerBounds: () => CapsuleBounds | null
  resolveMergeTarget: () => CapsuleBounds | null
}

const roundedPixel = (value: number): string => `${Math.round(value)}px`

/**
 * Owns the desktop capsule state machine independently from Vue lifecycle so
 * hover direction and timing can be covered by focused unit tests.
 */
export function createDemoFileCapsuleMotionController(options: UseDemoFileCapsuleMotionOptions) {
  const state = ref<DemoFileCapsuleState>('expanded')
  const motionStyle = ref<Record<string, string>>({})
  const stableMerged = computed(() => state.value === 'merged')
  const actionLocked = computed(() => !['expanded', 'merged'].includes(state.value))

  let idleTimer: number | null = null
  let phaseTimer: number | null = null
  let pointerWithinCapsuleZone = false

  const clearIdleTimer = () => {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  const clearPhaseTimer = () => {
    if (phaseTimer !== null) {
      window.clearTimeout(phaseTimer)
      phaseTimer = null
    }
  }

  const clearTimers = () => {
    clearIdleTimer()
    clearPhaseTimer()
  }

  const queuePhase = (delay: number, callback: () => void) => {
    clearPhaseTimer()
    phaseTimer = window.setTimeout(() => {
      phaseTimer = null
      callback()
    }, delay)
  }

  const canAnimate = () => options.enabled() && options.canMerge()

  const targetMotionStyle = (target: CapsuleBounds): Record<string, string> => ({
    '--demo-file-capsule-target-top': roundedPixel(target.top),
    '--demo-file-capsule-target-left': roundedPixel(target.left),
    '--demo-file-capsule-target-width': roundedPixel(target.width),
    '--demo-file-capsule-target-height': roundedPixel(target.height),
    '--demo-file-capsule-collapsed-bottom': roundedPixel(target.bottom)
  })

  const expand = (immediate = false) => {
    // Any interaction expands immediately from the current phase. Reduced
    // motion skips interpolation but preserves the same final state.
    clearTimers()
    if (state.value === 'expanded') {
      motionStyle.value = {}
      return
    }
    if (immediate || !options.enabled()) {
      state.value = 'expanded'
      motionStyle.value = {}
      return
    }
    state.value = 'expanding'
    queuePhase(DEMO_FILE_CAPSULE_MOTION.expandDuration, () => {
      state.value = 'expanded'
      motionStyle.value = {}
    })
  }

  const settle = () => {
    clearTimers()
    pointerWithinCapsuleZone = false
    if (!canAnimate()) {
      expand(true)
      return
    }
    const target = options.resolveMergeTarget()
    if (!target) {
      expand(true)
      return
    }
    motionStyle.value = targetMotionStyle(target)
    state.value = 'merged'
  }

  const abortIfBlocked = (): boolean => {
    if (canAnimate()) {
      return false
    }
    expand()
    return true
  }

  const beginMerge = () => {
    clearIdleTimer()
    if (abortIfBlocked() || state.value !== 'expanded') {
      return
    }

    const target = options.resolveMergeTarget()
    const source = options.resolveFileBounds()
    if (!target || !source) {
      expand(true)
      return
    }
    motionStyle.value = targetMotionStyle(target)
    state.value = 'compacting'
    queuePhase(DEMO_FILE_CAPSULE_MOTION.compactDuration, () => {
      if (abortIfBlocked()) return
      const nextTarget = options.resolveMergeTarget()
      if (!nextTarget) {
        expand()
        return
      }
      motionStyle.value = targetMotionStyle(nextTarget)
      state.value = 'merging'
      queuePhase(DEMO_FILE_CAPSULE_MOTION.mergeDuration, () => {
        if (abortIfBlocked()) return
        state.value = 'merged'
      })
    })
  }

  const scheduleMerge = () => {
    if (
      idleTimer !== null ||
      pointerWithinCapsuleZone ||
      !canAnimate() ||
      state.value !== 'expanded'
    ) {
      return
    }
    idleTimer = window.setTimeout(() => {
      idleTimer = null
      beginMerge()
    }, DEMO_FILE_CAPSULE_MOTION.idleDelay)
  }

  const handlePointerEnter = () => {
    pointerWithinCapsuleZone = true
    clearIdleTimer()
    if (state.value !== 'expanded') {
      expand()
    }
  }

  const handlePointerLeave = () => {
    pointerWithinCapsuleZone = false
    scheduleMerge()
  }

  const handleFocusIn = () => {
    clearIdleTimer()
    if (state.value !== 'expanded') {
      expand()
    }
  }

  const handleFocusOut = () => {
    scheduleMerge()
  }

  const pointWithin = (event: PointerEvent, bounds: CapsuleBounds | null) =>
    Boolean(
      bounds &&
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    )

  const handleDocumentPointerMove = (event: PointerEvent) => {
    // A single document listener treats both separated capsules as one hover
    // zone, preventing flicker while the pointer crosses the gap between them.
    const withinCapsuleZone =
      pointWithin(event, options.resolveTriggerBounds()) ||
      pointWithin(event, options.resolveFileBounds())

    if (withinCapsuleZone) {
      if (!pointerWithinCapsuleZone) {
        handlePointerEnter()
      } else {
        clearIdleTimer()
      }
      return
    }

    if (pointerWithinCapsuleZone) {
      handlePointerLeave()
      return
    }

    // A panel may have temporarily blocked merging. Once it closes, the next
    // pointer movement outside both capsules restores the normal idle merge.
    scheduleMerge()
  }

  const reset = () => settle()

  const dispose = () => {
    clearTimers()
  }

  return {
    state,
    motionStyle,
    stableMerged,
    actionLocked,
    scheduleMerge,
    expand,
    reset,
    settle,
    dispose,
    handlePointerEnter,
    handlePointerLeave,
    handleFocusIn,
    handleFocusOut,
    handleDocumentPointerMove
  }
}

/**
 * Coordinates the desktop-only liquid merge between the floating file pill
 * and the upload slot in the global action capsule.
 */
export function useDemoFileCapsuleMotion(options: UseDemoFileCapsuleMotionOptions) {
  const controller = createDemoFileCapsuleMotionController(options)

  onMounted(() => {
    document.addEventListener('pointermove', controller.handleDocumentPointerMove, {
      passive: true
    })
    controller.settle()
  })

  onBeforeUnmount(() => {
    controller.dispose()
    document.removeEventListener('pointermove', controller.handleDocumentPointerMove)
  })

  return controller
}
