<script setup lang='ts'>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowUpRight, ShieldCheck, Upload, X } from '@lucide/vue'
import type { DemoFileIconMeta } from '@/composables/useDemoFileTypes'
import type { DemoWelcomeCopy, DemoWelcomeExampleKind } from '@/composables/useDemoWelcome'
import DemoFileTypeIcon from '@/components/demo/DemoFileTypeIcon.vue'

export type DemoWelcomeSample = DemoFileIconMeta & {
  url: string
  name: string
  filename: string
  kind: DemoWelcomeExampleKind
  preview?: string
  bytes?: number
  attribution?: string
}

defineProps<{ copy: DemoWelcomeCopy; samples: readonly DemoWelcomeSample[] }>()
const emit = defineEmits<{ close: []; sample: [url: string]; file: [file: File] }>()
const dragging = ref(false)
const failedPreviews = ref<Record<string, boolean>>({})
const cardRef = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  cardRef.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  if (!cardRef.value?.contains(document.activeElement)) return
  const target = previousFocus?.isConnected && previousFocus !== document.body
    ? previousFocus : document.querySelector<HTMLElement>('.rail-brand')
  target?.focus({ preventScroll: true })
})

const sampleFormat = (url: string) => (url.split(/[?#]/)[0]?.split('.').pop() || '').toUpperCase()
const fileSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

function handleDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.item(0)
  if (file) emit('file', file)
}
</script>

<template>
  <section
    ref='cardRef'
    class='demo-welcome'
    :class='{ "demo-welcome--dragging": dragging }'
    role='dialog'
    aria-modal='false'
    aria-labelledby='demo-welcome-title'
    aria-describedby='demo-welcome-description'
    tabindex='-1'
    @keydown.esc.stop='emit("close")'
    @dragover.prevent='dragging = true'
    @dragleave='dragging = false'
    @drop.prevent='handleDrop'
  >
    <header class='demo-welcome__header'>
      <div>
        <p class='demo-welcome__eyebrow'>{{ copy.eyebrow }}</p>
        <h2 id='demo-welcome-title'>{{ copy.title }}</h2>
        <p id='demo-welcome-description' class='demo-welcome__description'>{{ copy.description }}</p>
      </div>
      <button type='button' class='demo-welcome__close' :aria-label='copy.close' @click='emit("close")'>
        <X :size='18' aria-hidden='true' />
      </button>
    </header>

    <ul class='demo-welcome__samples' :aria-label='copy.featured'>
      <li v-for='sample in samples' :key='sample.url'>
        <button
          type='button'
          class='demo-welcome__file'
          :title='sample.filename'
          :aria-label='`${copy.examples[sample.kind].title}: ${sample.filename}`'
          @click='emit("sample", sample.url)'
        >
          <span class='demo-welcome__preview' :class='`demo-welcome__preview--${sample.kind}`'>
            <img
              v-if='sample.preview && !failedPreviews[sample.url]'
              :src='sample.preview'
              alt=''
              decoding='async'
              @error='failedPreviews[sample.url] = true'
            />
            <span v-else class='demo-welcome__preview-fallback'>
              <DemoFileTypeIcon :meta='sample' :size='42' />
              <span>{{ copy.previewUnavailable }}</span>
            </span>
            <span class='demo-welcome__format'>{{ sampleFormat(sample.url) }}</span>
          </span>
          <span class='demo-welcome__file-body'>
            <span class='demo-welcome__file-title'>
              <strong>{{ copy.examples[sample.kind].title }}</strong>
              <ArrowUpRight :size='17' aria-hidden='true' />
            </span>
            <span class='demo-welcome__file-description'>{{ copy.examples[sample.kind].description }}</span>
            <span class='demo-welcome__file-meta'>
              <span class='demo-welcome__filename'>{{ sample.filename }}</span>
              <span v-if='sample.bytes'>{{ fileSize(sample.bytes) }}</span>
            </span>
          </span>
        </button>
      </li>
    </ul>

    <footer class='demo-welcome__hint'>
      <span><Upload :size='15' aria-hidden='true' />{{ copy.drop }}</span>
      <span><ShieldCheck :size='15' aria-hidden='true' />{{ copy.privacy }}</span>
      <a v-for='sample in samples.filter(entry => entry.attribution)' :key='sample.url'
         :href='sample.attribution' target='_blank' rel='noopener noreferrer'>{{ copy.modelCredit }}</a>
    </footer>
  </section>
</template>

<style scoped>
.demo-welcome {
  position: fixed;
  z-index: 78;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  width: min(1000px, calc(100vw - 48px));
  max-height: calc(100dvh - 196px);
  overflow: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  padding: 24px;
  border: 1px solid var(--demo-border-strong);
  border-radius: 24px;
  background: var(--demo-canvas);
  color: var(--demo-text);
}
.demo-welcome:focus { outline: none; }
.demo-welcome--dragging {
  border-color: var(--demo-accent-strong);
  outline: 2px dashed var(--demo-accent-strong);
  outline-offset: -6px;
}
.demo-welcome :where(button) {
  appearance: none;
  font: inherit;
  cursor: pointer;
  box-shadow: none;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}
.demo-welcome button:focus-visible {
  outline: 3px solid var(--demo-accent-strong);
  outline-offset: 3px;
}
.demo-welcome__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.demo-welcome__header > div { min-width: 0; }
.demo-welcome__eyebrow {
  margin: 0 0 6px;
  color: var(--demo-accent-strong);
  font-size: 0.6875rem;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0.04em;
}
.demo-welcome h2 {
  margin: 0;
  font-size: 1.375rem;
  line-height: 1.3;
  font-weight: 650;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.demo-welcome__description {
  margin: 8px 0 0;
  color: var(--demo-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}
.demo-welcome__close {
  flex: 0 0 44px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -8px -8px 0 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--demo-muted);
}
.demo-welcome__close:hover { background: var(--demo-surface-soft); color: var(--demo-text); }
.demo-welcome__samples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: 12px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}
.demo-welcome__samples li { display: flex; min-width: 0; }
.demo-welcome__file {
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  text-align: left;
  border: 1px solid var(--demo-border-strong);
  border-radius: 18px;
  background: var(--demo-surface-strong);
  color: var(--demo-text);
}
.demo-welcome__file:hover { border-color: var(--demo-accent-strong); }
.demo-welcome__preview {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-bottom: 1px solid var(--demo-border);
  background: #fff;
}
.demo-welcome__preview img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: contain; }
.demo-welcome__preview--drawing { background: #080c10; }
.demo-welcome__preview--drawing img { object-fit: cover; }
.demo-welcome__preview--document img { object-fit: cover; object-position: center top; }
.demo-welcome__preview-fallback {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 12px;
  color: #62746a;
  font-size: 0.6875rem;
  line-height: 1.4;
}
.demo-welcome__format {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 7px;
  border: 1px solid rgba(35, 61, 53, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.96);
  color: #263c31;
  font-size: 0.625rem;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: 0.035em;
}
.demo-welcome__file-body { flex: 1; display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box; padding: 14px; }
.demo-welcome__file-title { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.demo-welcome__file-title strong { font-size: 0.875rem; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.demo-welcome__file-title svg { flex-shrink: 0; color: var(--demo-muted); }
.demo-welcome__file:hover .demo-welcome__file-title svg { color: var(--demo-accent-strong); }
.demo-welcome__file-description { flex: 1; min-height: 2.8em; color: var(--demo-muted); font-size: 0.75rem; line-height: 1.4; overflow-wrap: anywhere; }
.demo-welcome__file-meta { display: flex; justify-content: space-between; gap: 8px; padding-top: 6px; color: var(--demo-muted); font-size: 0.625rem; line-height: 1.5; }
.demo-welcome__file-meta > span:last-child { flex-shrink: 0; }
.demo-welcome__filename { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.demo-welcome__hint { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 20px; margin: 18px 0 0; color: var(--demo-muted); font-size: 0.6875rem; line-height: 1.6; }
.demo-welcome__hint > span { display: inline-flex; align-items: center; gap: 6px; }
.demo-welcome__hint svg { flex-shrink: 0; }
.demo-welcome__hint a { color: var(--demo-muted); text-decoration: underline; text-underline-offset: 3px; }
.demo-welcome__hint a:hover { color: var(--demo-accent-strong); }
@media (max-width: 720px) {
  .demo-welcome {
    bottom: calc(82px + env(safe-area-inset-bottom));
    width: calc(100vw - 24px);
    max-height: calc(100dvh - 164px);
    padding: 18px;
    border-radius: 22px;
  }
  .demo-welcome h2 { font-size: 1.125rem; }
  .demo-welcome__samples { gap: 10px; margin-top: 18px; }
  .demo-welcome__file { border-radius: 14px; }
  .demo-welcome__file-body { gap: 5px; padding: 11px; }
  .demo-welcome__file-title strong { font-size: 0.8125rem; }
  .demo-welcome__file-description { font-size: 0.6875rem; }
  .demo-welcome__file-meta { flex-wrap: wrap; gap: 2px 8px; }
  .demo-welcome__format { top: 8px; left: 8px; }
}
@media (prefers-reduced-motion: no-preference) {
  .demo-welcome { animation: demo-welcome-enter 160ms ease-out both; }
}
@keyframes demo-welcome-enter {
  from { opacity: 0; translate: 0 6px; }
  to { opacity: 1; translate: 0 0; }
}
</style>
