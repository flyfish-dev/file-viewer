<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ArrowUpRight, LockKeyhole, Maximize2, X } from '@lucide/vue'
import CarouselPlayback from './CarouselPlayback.vue'
import { useCarouselPlayback } from '../useCarouselPlayback'

const props = defineProps<{ isZh: boolean }>()

const samples = [
  {
    type: 'docx',
    zh: '季度运营报告.docx',
    en: 'Quarterly report.docx',
    image: 'quarterly-report',
    source: '/example/en/quarterly-operations-report.docx',
    altZh: '季度运营报告首页，包含标题、正文和完整的经营数据表。',
    altEn: 'Quarterly operations report page showing the heading, body and operating results table.'
  },
  {
    type: 'pptx',
    zh: 'NASA 演示文稿.pptx',
    en: 'NASA lunar strategy.pptx',
    image: 'nasa-presentation',
    source: '/example/en/sample-presentation.pptx',
    altZh: 'NASA 月球科学战略演示稿的封面。',
    altEn: 'The rendered title slide for the NASA lunar science strategy.'
  },
  {
    type: 'dwfx',
    zh: 'house.dwfx',
    en: 'house.dwfx',
    image: 'house-elevation',
    source: '/example/samples/autodesk/house.dwfx',
    altZh: '带有线条和工程标注的房屋南立面图。',
    altEn: 'An architectural south elevation with linework and annotations.'
  },
  {
    type: 'xlsx',
    zh: '统计工作簿.xlsx',
    en: 'Financial workbook.xlsx',
    image: 'workbook-en',
    localImage: 'workbook-zh',
    source: '/example/en/financial-sample.xlsx',
    localSource: '/example/excel.xlsx',
    altZh: '工作簿的单元格、表头样式以及合并区域。',
    altEn: 'Workbook cells, styled headers and merged ranges.'
  }
] as const

type Sample = (typeof samples)[number]
const layers = ['front', 'left', 'right', 'back'] as const
const active = ref(0)
const stage = ref<HTMLElement | null>(null)
const { paused, playing, pause, toggle, setHover } = useCarouselPlayback(stage, active, samples.length, 3000)
const selected = computed(() => samples[active.value]!)
const tabButtons = ref<Array<HTMLButtonElement | null>>([])
const detailDialog = ref<HTMLDialogElement | null>(null)
const detailImage = ref<HTMLElement | null>(null)
const actualSize = ref(false)

function path(sample: Sample) {
  const name = props.isZh && 'localImage' in sample ? sample.localImage : sample.image
  return `/a-media/${name}.webp`
}

const demoLink = computed(() => {
  const sample = selected.value
  const source = props.isZh && 'localSource' in sample ? sample.localSource : sample.source
  return `https://demo.file-viewer.app/?${new URLSearchParams({ sample: source, lang: props.isZh ? 'zh-CN' : 'en-US' })}`
})

function layerAt(index: number) {
  return layers[(index + samples.length - active.value) % samples.length]
}

function chooseSample(index: number) {
  pause()
  active.value = index
}

function switchByKey(event: KeyboardEvent, index: number) {
  let next = index
  switch (event.key) {
    case 'ArrowLeft': next = (index + samples.length - 1) % samples.length; break
    case 'ArrowRight': next = (index + 1) % samples.length; break
    case 'Home': next = 0; break
    case 'End': next = samples.length - 1; break
    default: return
  }
  event.preventDefault()
  chooseSample(next)
  tabButtons.value[next]?.focus({ preventScroll: true })
}

function selectCard(index: number) {
  if (active.value === index) {
    pause()
    actualSize.value = false
    detailDialog.value?.showModal()
    return
  }
  chooseSample(index)
}

async function resizeDetail() {
  actualSize.value = !actualSize.value
  await nextTick()
  const element = detailImage.value
  if (element) {
    element.scrollLeft = actualSize.value ? (element.scrollWidth - element.clientWidth) / 2 : 0
    element.scrollTop = 0
  }
}
</script>

<template>
  <div
    id="hero-file-preview"
    ref="stage"
    class="a-stage"
    :class="{ 'a-stage-still': !playing }"
    @focusin="pause"
    @pointerenter="setHover"
    @pointerleave="setHover"
  >
    <div
      v-for="(sample, index) in samples"
      :id="`a-preview-${sample.type}`"
      :key="sample.type"
      :class="`a-layer a-layer-${layerAt(index)}`"
      role="tabpanel"
      :aria-labelledby="`a-tab-${sample.type}`"
      :aria-hidden="index !== active"
    >
      <button
        :class="`a-file a-file-${sample.type}`"
        type="button"
        :tabindex="index === active ? 0 : -1"
        :aria-label="`${index === active ? (isZh ? '放大查看' : 'Enlarge') : (isZh ? '切换到' : 'Show')} ${isZh ? sample.zh : sample.en}`"
        @click="selectCard(index)"
      >
        <span class="a-file-title">
          <strong>{{ isZh ? sample.zh : sample.en }}</strong>
          <small>{{ sample.type.toUpperCase() }}</small>
          <Maximize2 v-if="index === active" :size="16" aria-hidden="true" />
        </span>
        <span class="a-file-image">
          <img :src="path(sample)" :alt="isZh ? sample.altZh : sample.altEn" decoding="async" draggable="false" />
        </span>
      </button>
    </div>
  </div>

  <div class="a-stage-controls">
    <div
      class="a-sample-tabs"
      role="tablist"
      :aria-label="isZh ? '选择预览样例' : 'Choose a preview sample'"
      @focusin="pause"
      @pointerenter="setHover"
      @pointerleave="setHover"
    >
      <button
        v-for="(sample, index) in samples"
        :id="`a-tab-${sample.type}`"
        :ref="element => { tabButtons[index] = element as HTMLButtonElement | null }"
        :key="sample.type"
        type="button"
        role="tab"
        :aria-selected="index === active"
        :aria-controls="`a-preview-${sample.type}`"
        :tabindex="index === active ? 0 : -1"
        @click="chooseSample(index)"
        @keydown="switchByKey($event, index)"
      >
        <span class="a-tab-name">{{ isZh ? sample.zh : sample.en }}</span>
        <span class="a-tab-extension">{{ sample.type.toUpperCase() }}</span>
      </button>
    </div>
    <div class="a-stage-actions">
      <span class="a-local-label"><LockKeyhole :size="14" />{{ isZh ? '在浏览器里处理' : 'Processed in your browser' }}</span>
      <CarouselPlayback :is-zh="isZh" :paused="paused" controls="hero-file-preview" @toggle="toggle" />
      <a :href="demoLink" target="_blank" rel="noreferrer" @focus="pause">
        {{ isZh ? '在演示中打开' : 'Open in the demo' }} <ArrowUpRight :size="17" />
      </a>
    </div>
  </div>

  <dialog ref="detailDialog" class="a-detail" aria-labelledby="a-detail-title">
    <header>
      <h2 id="a-detail-title">{{ isZh ? selected.zh : selected.en }}</h2>
      <button type="button" @click="resizeDetail">
        {{ actualSize ? (isZh ? '适合屏幕' : 'Fit to screen') : (isZh ? '原始尺寸' : 'Actual size') }}
      </button>
      <form method="dialog">
        <button type="submit" :aria-label="isZh ? '关闭' : 'Close'"><X :size="20" /></button>
      </form>
    </header>
    <div ref="detailImage" class="a-detail-image" :class="{ 'a-detail-image-actual': actualSize }" tabindex="0">
      <img :src="path(selected)" :alt="isZh ? selected.altZh : selected.altEn" />
    </div>
  </dialog>
</template>
