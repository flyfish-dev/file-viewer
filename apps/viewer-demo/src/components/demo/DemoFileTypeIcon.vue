<script setup lang="ts">
import type { Component, CSSProperties } from 'vue'
import { computed } from 'vue'
import {
  Archive,
  AudioLines,
  BookOpenText,
  Box,
  Braces,
  CircuitBoard,
  Database,
  DraftingCompass,
  File,
  FileImage,
  FileText,
  Mail,
  Presentation,
  Shapes,
  Signature,
  Stethoscope,
  Table2,
  Video
} from '@lucide/vue'
import type { DemoFileIconFamily, DemoFileIconMeta } from '@/composables/useDemoFileTypes'
import { getFileIconMeta } from '@/composables/useDemoFileTypes'
import { DEMO_BRAND_DARK_COLORS, DEMO_BRAND_ICONS } from '@/data/demoFileBrandIcons'
import { DEMO_FILE_ICON_PALETTES } from '@/data/demoFileIconPalettes'

/**
 * Shared professional file icon used by the filename capsule, samples and
 * recent history. Known formats use curated brand artwork; every other format
 * receives the same document silhouette with a family-specific palette.
 */
const props = withDefaults(
  defineProps<{
    target?: string
    meta?: DemoFileIconMeta
    size?: number
    label?: string
  }>(),
  {
    target: '',
    meta: undefined,
    size: 40,
    label: undefined
  }
)

const FAMILY_ICONS: Readonly<Record<DemoFileIconFamily, Component>> = Object.freeze({
  word: FileText,
  sheet: Table2,
  slide: Presentation,
  pdf: FileText,
  layout: FileText,
  cad: DraftingCompass,
  drawing: Shapes,
  model: Box,
  ebook: BookOpenText,
  archive: Archive,
  email: Mail,
  eda: CircuitBoard,
  medical: Stethoscope,
  signature: Signature,
  text: FileText,
  code: Braces,
  image: FileImage,
  audio: AudioLines,
  video: Video,
  data: Database,
  generic: File
})

const resolvedMeta = computed(() => props.meta ?? getFileIconMeta(props.target))
const brandAsset = computed(() => {
  // Brand assets are local/offline SVG data. Missing assets intentionally fall
  // back to Lucide rather than producing a broken image.
  const brand = resolvedMeta.value.brand
  return brand ? DEMO_BRAND_ICONS[brand] : undefined
})
const fallbackIcon = computed(() => FAMILY_ICONS[resolvedMeta.value.family])
const normalizedSize = computed(() => Math.min(72, Math.max(24, Number(props.size) || 40)))
const iconStyle = computed<CSSProperties>(() => {
  // Light/dark colors are supplied as CSS variables so theme changes do not
  // rebuild the component or apply destructive filters to icon artwork.
  const size = normalizedSize.value
  const palette = DEMO_FILE_ICON_PALETTES[resolvedMeta.value.family]
  const brandName = resolvedMeta.value.brand
  return {
    '--demo-file-icon-width': `${size}px`,
    '--demo-file-icon-height': `${Math.round(size * 1.16)}px`,
    '--demo-file-icon-label-size': `${Math.min(10, Math.max(7, size * 0.2))}px`,
    '--demo-file-icon-surface-light': palette.light.surface,
    '--demo-file-icon-border-light': palette.light.border,
    '--demo-file-icon-accent-light': palette.light.accent,
    '--demo-file-icon-label-light': palette.light.label,
    '--demo-file-icon-surface-dark': palette.dark.surface,
    '--demo-file-icon-border-dark': palette.dark.border,
    '--demo-file-icon-accent-dark': palette.dark.accent,
    '--demo-file-icon-label-dark': palette.dark.label,
    '--demo-file-icon-brand-light': brandAsset.value?.color ?? palette.light.accent,
    '--demo-file-icon-brand-dark': brandName
      ? DEMO_BRAND_DARK_COLORS[brandName]
      : palette.dark.accent
  } as CSSProperties
})
</script>

<template>
  <span
    class="demo-file-type-icon"
    :data-family="resolvedMeta.family"
    :data-brand="resolvedMeta.brand || undefined"
    :data-compact="normalizedSize <= 32 ? '' : undefined"
    :style="iconStyle"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <File class="demo-file-type-icon__sheet" :stroke-width="1.25" aria-hidden="true" />
    <svg
      v-if="brandAsset"
      class="demo-file-type-icon__glyph demo-file-type-icon__glyph--brand"
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
    >
      <path :d="brandAsset.path" fill="currentColor" />
    </svg>
    <component
      :is="fallbackIcon"
      v-else
      class="demo-file-type-icon__glyph"
      :stroke-width="1.8"
      aria-hidden="true"
    />
    <span class="demo-file-type-icon__label">{{ resolvedMeta.icon }}</span>
  </span>
</template>

<style scoped>
.demo-file-type-icon {
  --demo-file-icon-surface: var(--demo-file-icon-surface-light);
  --demo-file-icon-border: var(--demo-file-icon-border-light);
  --demo-file-icon-accent: var(--demo-file-icon-accent-light);
  --demo-file-icon-label: var(--demo-file-icon-label-light);
  --demo-file-icon-brand: var(--demo-file-icon-brand-light);
  position: relative;
  box-sizing: border-box;
  inline-size: var(--demo-file-icon-width);
  block-size: var(--demo-file-icon-height);
  flex: 0 0 auto;
  display: inline-block;
  overflow: visible;
  color: var(--demo-file-icon-accent);
  isolation: isolate;
}

.demo-file-type-icon__sheet {
  position: absolute;
  z-index: 0;
  inset: 50% auto auto 50%;
  inline-size: 114%;
  block-size: 114%;
  overflow: visible;
  color: var(--demo-file-icon-border);
  fill: var(--demo-file-icon-surface);
  stroke-linecap: round;
  stroke-linejoin: round;
  transform: translate(-50%, -50%);
}

.demo-file-type-icon__glyph {
  position: absolute;
  z-index: 1;
  inset: 23% auto auto 50%;
  inline-size: 43%;
  block-size: 43%;
  color: var(--demo-file-icon-accent);
  transform: translateX(-50%);
}

.demo-file-type-icon__glyph--brand {
  inline-size: 44%;
  block-size: 44%;
  color: var(--demo-file-icon-brand);
}

.demo-file-type-icon__label {
  position: absolute;
  z-index: 1;
  inset-inline: 16%;
  inset-block-end: 12%;
  overflow: hidden;
  color: var(--demo-file-icon-label);
  font-size: var(--demo-file-icon-label-size);
  font-weight: 760;
  line-height: 1;
  letter-spacing: -0.025em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-file-type-icon[data-compact] .demo-file-type-icon__glyph {
  inset-block-start: 50%;
  inline-size: 48%;
  block-size: 48%;
  transform: translate(-50%, -50%);
}

.demo-file-type-icon[data-compact] .demo-file-type-icon__label {
  display: none;
}

.demo-file-type-icon.viewer-current-file-icon {
  --demo-file-icon-width: 32px !important;
  --demo-file-icon-height: 37px !important;
}

@media (prefers-reduced-motion: no-preference) {
  .demo-file-type-icon__sheet,
  .demo-file-type-icon__glyph,
  .demo-file-type-icon__label {
    transition:
      color 180ms ease,
      fill 180ms ease,
      stroke 180ms ease;
  }
}

@media (max-width: 720px) {
  .demo-file-type-icon.viewer-current-file-icon {
    --demo-file-icon-width: 26px !important;
    --demo-file-icon-height: 30px !important;
  }
}
</style>

<style>
.demo-shell[data-demo-theme='dark'] .demo-file-type-icon {
  --demo-file-icon-surface: var(--demo-file-icon-surface-dark);
  --demo-file-icon-border: var(--demo-file-icon-border-dark);
  --demo-file-icon-accent: var(--demo-file-icon-accent-dark);
  --demo-file-icon-label: var(--demo-file-icon-label-dark);
  --demo-file-icon-brand: var(--demo-file-icon-brand-dark);
}
</style>
