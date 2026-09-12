<script setup lang="ts">
import { computed } from 'vue'
import {
  Archive,
  AudioLines,
  BookOpenText,
  Box,
  Braces,
  Database,
  File,
  FileImage,
  FileText,
  Mail,
  Shapes,
  Video
} from '@lucide/vue'
import {
  DEMO_BRAND_ICONS,
  DEMO_BRAND_DARK_COLORS,
  type DemoBrandIconName
} from '../../../viewer-demo/src/data/demoFileBrandIcons'

// The homepage uses the Demo's actual, locally bundled format artwork.
// No renderer, file parser, or remote icon service is loaded for decoration.
const props = defineProps<{ extension: string; brand?: DemoBrandIconName; family?: string }>()
const artwork = computed(() => (props.brand ? DEMO_BRAND_ICONS[props.brand] : undefined))
const fallback = computed(
  () =>
    ({
      archive: Archive,
      model: Box,
      code: Braces,
      data: Database,
      image: FileImage,
      email: Mail,
      ebook: BookOpenText,
      audio: AudioLines,
      video: Video,
      drawing: Shapes
    })[props.family ?? ''] ?? FileText
)
const colors = computed(() => ({
  '--mark-light': artwork.value?.color ?? '#347f79',
  '--mark-dark': props.brand ? DEMO_BRAND_DARK_COLORS[props.brand] : '#8cc9be'
}))
</script>

<template>
  <span class="format-mark" :style="colors" aria-hidden="true">
    <File class="format-mark-paper" :stroke-width="0.8" />
    <svg v-if="artwork" class="format-mark-glyph" viewBox="0 0 24 24" focusable="false">
      <path :d="artwork.path" fill="currentColor" />
    </svg>
    <component :is="fallback" v-else class="format-mark-glyph" :stroke-width="1.6" />
    <span class="format-mark-label">{{ extension.toUpperCase() }}</span>
  </span>
</template>

<style scoped>
.format-mark {
  --mark-color: var(--mark-light);
  position: relative;
  display: block;
  width: 82px;
  height: 100px;
  color: var(--mark-color);
  filter: drop-shadow(0 12px 10px color-mix(in srgb, var(--mark-color) 12%, transparent));
}
.format-mark-paper {
  position: absolute;
  inset: -6%;
  width: 112%;
  height: 112%;
  fill: color-mix(in srgb, var(--mark-color) 6%, var(--site-surface, #fff));
  color: color-mix(in srgb, var(--mark-color) 24%, var(--site-surface, #fff));
}
.format-mark-glyph {
  position: absolute;
  top: 26%;
  left: 28%;
  width: 42%;
  height: 36%;
}
.format-mark-label {
  position: absolute;
  bottom: 15%;
  left: 9%;
  right: 9%;
  text-align: center;
  font:
    750 10px/1.1 ui-monospace,
    monospace;
  letter-spacing: -0.025em;
}
:global(html[data-theme='dark'] .format-mark) {
  --mark-color: var(--mark-dark);
}
</style>
