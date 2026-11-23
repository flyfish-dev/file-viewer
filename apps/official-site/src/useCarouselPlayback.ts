import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export function useCarouselPlayback(
  viewport: Ref<HTMLElement | null>,
  current: Ref<number>,
  itemCount: number,
  intervalMs: number
) {
  const paused = ref(true)
  const inView = ref(false)
  const pageVisible = ref(true)
  const hovered = ref(false)
  const playing = computed(() => !paused.value && inView.value && pageVisible.value && !hovered.value)
  let observer: IntersectionObserver | undefined
  let reducedMotion: MediaQueryList | undefined

  function pause() {
    paused.value = true
  }

  function toggle() {
    paused.value = !paused.value
  }

  function setHover(event: PointerEvent) {
    if (event.pointerType === 'mouse') hovered.value = event.type === 'pointerenter'
  }

  function syncPageVisibility() {
    pageVisible.value = !document.hidden
  }

  function handleMotionPreference(event: MediaQueryListEvent) {
    if (event.matches) pause()
  }

  onMounted(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    paused.value = reducedMotion.matches
    reducedMotion.addEventListener('change', handleMotionPreference)
    syncPageVisibility()
    document.addEventListener('visibilitychange', syncPageVisibility)

    observer = new IntersectionObserver(([entry]) => {
      inView.value = Boolean(entry && entry.intersectionRatio >= 0.35)
    }, { rootMargin: '-72px 0px 0px', threshold: 0.35 })
    if (viewport.value) observer.observe(viewport.value)
  })

  watch([playing, current], ([canAdvance], _, onCleanup) => {
    if (!canAdvance) return
    const timer = window.setTimeout(() => {
      current.value = (current.value + 1) % itemCount
    }, intervalMs)
    onCleanup(() => window.clearTimeout(timer))
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    reducedMotion?.removeEventListener('change', handleMotionPreference)
    document.removeEventListener('visibilitychange', syncPageVisibility)
  })

  return { paused, playing, pause, toggle, setHover }
}
