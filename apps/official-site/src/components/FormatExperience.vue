<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowRight, Check, MousePointer2, Pause, Play, Sparkles } from '@lucide/vue'
import FormatMark from './FormatMark.vue'
import { FORMAT_CATALOG_SUMMARY, OFFICE_FORMAT_GROUPS } from '../formatCatalog.generated'
import type { DemoBrandIconName } from '../../../viewer-demo/src/data/demoFileBrandIcons'

const props = defineProps<{ isZh: boolean; docsUrl: string; demoUrl: string }>()
const officeExtensions = OFFICE_FORMAT_GROUPS.flatMap((group) => [...group.extensions])
const officeGroupLabels: Record<string, string> = {
  'office-word-openxml': 'Word 文档与模板',
  'office-word-binary': 'Word 97–2003',
  'office-presentation-binary': 'PowerPoint 97–2003',
  'office-presentation': 'PowerPoint 文稿、放映与模板',
  'open-document': '开放文档与富文本',
  'spreadsheet-openxml': '电子表格、模板与数据',
  'apple-pages': 'Apple Pages',
  'apple-numbers': 'Apple Numbers',
  'apple-keynote': 'Apple Keynote',
  'office-wordperfect': 'WordPerfect',
  'spreadsheet-dbf': 'dBASE 数据表',
  pdf: 'PDF',
  ofd: 'OFD',
  'office-hangul': 'Hancom Hangul'
}
type FormatSample = { extension: string; brand?: DemoBrandIconName; family?: string }
type Group = {
  id: string
  title: [string, string]
  note: [string, string]
  detail: [string, string]
  formats: FormatSample[]
  extensions: string[]
}
const groups: Group[] = [
  {
    id: 'office',
    title: ['Office 文档', 'Office documents'],
    note: ['从日常文档到数据与演示', 'Documents, data & presentations'],
    detail: [
      'Word、电子表格与演示文稿在同一组件中打开，适合审批、知识库与附件中心。具体排版还原与宏等限制以格式矩阵为准。',
      'Open Word, spreadsheets and presentations in one component, for approvals, knowledge bases and attachments. See the matrix for layout fidelity and macro limitations.'
    ],
    formats: [
      { extension: 'doc', brand: 'microsoft-word' },
      { extension: 'docx', brand: 'microsoft-word' },
      { extension: 'xls', brand: 'microsoft-excel' },
      { extension: 'xlsx', brand: 'microsoft-excel' },
      { extension: 'ppt', brand: 'microsoft-powerpoint' },
      { extension: 'pptx', brand: 'microsoft-powerpoint' }
    ],
    extensions: officeExtensions
  },
  {
    id: 'layout',
    title: ['版式与阅读', 'Pages & publications'],
    note: ['让文档回到熟悉的阅读方式', 'A familiar space for every page'],
    detail: [
      'PDF、OFD、Typst、电子书与帮助文档各走对应预览链路。纸张、阅读区与明暗外壳分开处理。',
      'PDF, OFD, Typst, ebooks and help files use their respective preview pipelines. Document pages stay separate from the light or dark viewer shell.'
    ],
    formats: [
      { extension: 'pdf', brand: 'adobe-acrobat' },
      { extension: 'ofd' },
      { extension: 'typ', brand: 'typst' },
      { extension: 'epub', family: 'ebook' },
      { extension: 'chm', family: 'ebook' }
    ],
    extensions: ['pdf', 'ofd', 'typ', 'epub', 'fb2', 'chm', 'umd']
  },
  {
    id: 'engineering',
    title: ['工程与设计', 'Engineering & design'],
    note: ['从二维图纸，延伸到三维空间', 'From drawings to spatial ideas'],
    detail: [
      'CAD、三维模型与设计文件按格式匹配渲染器，Worker / WASM 按需加载。模型、图纸与思维导图的能力范围分别列明。',
      'CAD, models and design assets select format-specific renderers, with Workers and WASM loaded on demand. Drawing, model and mind-map capabilities are documented separately.'
    ],
    formats: [
      { extension: 'dwg', brand: 'autocad' },
      { extension: 'step', family: 'model' },
      { extension: 'stl', family: 'model' },
      { extension: 'drawio', brand: 'diagrams-dot-net' },
      { extension: 'excalidraw', brand: 'excalidraw' }
    ],
    extensions: ['dwg', 'dxf', 'step', 'stl', 'glb', 'xmind', 'drawio', 'excalidraw']
  },
  {
    id: 'archive',
    title: ['归档与邮件', 'Archives & mail'],
    note: ['让压缩包与沟通记录可以被阅读', 'Explore what is inside'],
    detail: [
      '查看压缩包目录、邮件与附件，把分散的业务文件带回同一个预览入口。压缩算法、加密与嵌套附件能力以文档为准。',
      'Inspect archive contents, email and attachments through a shared preview entry point. Refer to the docs for supported compression, encryption and nested attachments.'
    ],
    formats: [
      { extension: 'zip', family: 'archive' },
      { extension: '7z', family: 'archive' },
      { extension: 'rar', family: 'archive' },
      { extension: 'eml', family: 'email' },
      { extension: 'msg', family: 'email' }
    ],
    extensions: ['zip', '7z', 'rar', 'tar', 'gz', 'eml', 'msg', 'mbox']
  },
  {
    id: 'data',
    title: ['代码与数据', 'Code & data'],
    note: ['结构、语法与数据，一目了然', 'Structure, syntax & insight'],
    detail: [
      '从 Markdown 与代码文件，到 JSON、数据库和列式数据，使用适合内容的展示方式。预览、结构化读取与执行是不同能力。',
      'Read Markdown, source files, JSON, database and columnar data in views suited to their content. Preview, structured reading and execution are distinct capabilities.'
    ],
    formats: [
      { extension: 'md', brand: 'markdown' },
      { extension: 'ts', brand: 'typescript' },
      { extension: 'py', brand: 'python' },
      { extension: 'json', family: 'code' },
      { extension: 'sqlite', family: 'data' }
    ],
    extensions: ['md', 'json', 'ts', 'py', 'html', 'sqlite', 'parquet', 'geojson']
  },
  {
    id: 'media',
    title: ['图像与媒体', 'Images & media'],
    note: ['设计素材与声画内容，各就其位', 'Room for images, sound & video'],
    detail: [
      '图片、设计文件、音频与视频复用统一预览外壳。设计源文件的预览不等于可编辑，音视频支持也取决于浏览器编解码器。',
      'Images, design files, audio and video share a consistent viewer shell. Previewing a design file does not imply editing, and media support depends on browser codecs.'
    ],
    formats: [
      { extension: 'psd', brand: 'adobe-photoshop' },
      { extension: 'ai', brand: 'adobe-illustrator' },
      { extension: 'png', family: 'image' },
      { extension: 'mp3', family: 'audio' },
      { extension: 'mp4', family: 'video' }
    ],
    extensions: ['png', 'jpg', 'svg', 'psd', 'ai', 'mp3', 'wav', 'mp4', 'webm']
  }
]
const selected = ref(0)
const paused = ref(false)
const inView = ref(false)
const root = ref<HTMLElement | null>(null)
const activeGroup = computed(() => groups[selected.value]!)
const lang = computed(() => (props.isZh ? 0 : 1))
let observer: IntersectionObserver | undefined
function chooseGroup(index: number) {
  selected.value = index
}
function navigateGroups(event: KeyboardEvent, index: number) {
  const offsets: Record<string, number> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1
  }
  if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End') return
  event.preventDefault()
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? groups.length - 1
        : (index + offsets[event.key]! + groups.length) % groups.length
  chooseGroup(next)
  root.value?.querySelector<HTMLButtonElement>(`#format-group-${groups[next]!.id}`)?.focus()
}
onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      inView.value = Boolean(entry?.isIntersecting)
    },
    { rootMargin: '80px' }
  )
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section
    id="formats"
    ref="root"
    class="format-experience"
    :class="{ 'motion-paused': paused || !inView }"
    aria-labelledby="formats-title"
  >
    <header class="format-experience-heading">
      <div>
        <p class="section-kicker">A WORLD OF FILES</p>
        <h2 id="formats-title">
          {{ isZh ? '格式各不相同。' : 'Different formats.' }}<br /><span>{{
            isZh ? '预览，自成一体。' : 'One place to preview.'
          }}</span>
        </h2>
      </div>
      <div class="format-experience-intro">
        <p>
          {{
            isZh
              ? `从一份文档，到整个文件世界。${FORMAT_CATALOG_SUMMARY.registeredExtensionCount} 个已注册扩展名，匹配 ${FORMAT_CATALOG_SUMMARY.rendererCount} 条预览链路。`
              : `From one document to a whole world of files. ${FORMAT_CATALOG_SUMMARY.registeredExtensionCount} registered extensions, matched to ${FORMAT_CATALOG_SUMMARY.rendererCount} preview pipelines.`
          }}
        </p>
        <div class="format-experience-tools">
          <span
            ><MousePointer2 :size="14" />{{
              isZh ? '悬停展开 · 点击探索' : 'Hover to unfold · select to explore'
            }}</span
          >
          <button
            type="button"
            :aria-pressed="paused"
            :aria-label="
              paused
                ? isZh
                  ? '播放格式动效'
                  : 'Play format motion'
                : isZh
                  ? '暂停格式动效'
                  : 'Pause format motion'
            "
            @click="paused = !paused"
          >
            <Play v-if="paused" :size="15" /><Pause v-else :size="15" />
          </button>
        </div>
      </div>
    </header>

    <div
      class="format-constellation"
      role="tablist"
      :aria-label="isZh ? '文件类型分组' : 'File format families'"
    >
      <button
        v-for="(group, index) in groups"
        :id="`format-group-${group.id}`"
        :key="group.id"
        class="format-family"
        :class="{ 'is-selected': selected === index }"
        type="button"
        role="tab"
        :aria-selected="selected === index"
        aria-controls="format-detail"
        :tabindex="selected === index ? 0 : -1"
        @click="chooseGroup(index)"
        @keydown="navigateGroups($event, index)"
      >
        <span class="format-family-number"
          >0{{ index + 1 }}<Check v-if="selected === index" :size="14"
        /></span>
        <span
          class="format-stack"
          :style="{ '--stack-middle': (group.formats.length - 1) / 2 }"
          aria-hidden="true"
        >
          <span
            v-for="(sample, i) in group.formats"
            :key="sample.extension"
            class="format-stack-position"
            :style="{ '--slot': i, '--drift-delay': `${(index + i) * -1.7}s` }"
          >
            <span class="format-stack-float"><FormatMark v-bind="sample" /></span>
          </span>
        </span>
        <span class="format-family-heading"
          ><strong>{{ group.title[lang] }}</strong
          ><ArrowRight :size="18"
        /></span>
        <span class="format-family-note">{{ group.note[lang] }}</span>
        <span class="format-family-extensions">{{
          group.formats
            .map((sample) => sample.extension)
            .join(' · ')
            .toUpperCase()
        }}</span>
      </button>
    </div>

    <div
      id="format-detail"
      class="format-detail"
      :class="{ 'has-office-matrix': activeGroup.id === 'office' }"
      role="tabpanel"
      :aria-labelledby="`format-group-${activeGroup.id}`"
      tabindex="0"
    >
      <div class="format-detail-copy">
        <span class="format-detail-eyebrow"
          ><Sparkles :size="15" />{{ activeGroup.title[lang] }}</span
        >
        <p>{{ activeGroup.detail[lang] }}</p>
      </div>
      <div
        v-if="activeGroup.id !== 'office'"
        class="format-detail-formats"
        :aria-label="isZh ? '代表扩展名' : 'Representative extensions'"
      >
        <span v-for="ext in activeGroup.extensions" :key="ext">.{{ ext }}</span>
      </div>
      <a :href="demoUrl" target="_blank" rel="noreferrer"
        >{{ isZh ? '打开真实样例' : 'Try real samples' }}<ArrowRight :size="16"
      /></a>
      <section
        v-if="activeGroup.id === 'office'"
        class="office-format-matrix"
        aria-labelledby="office-matrix-title"
      >
        <header>
          <h3 id="office-matrix-title">
            {{ isZh ? '完整 Office 矩阵' : 'Complete Office matrix' }}
          </h3>
          <span>{{ officeExtensions.length }} {{ isZh ? '个扩展名' : 'extensions' }}</span>
        </header>
        <dl>
          <div v-for="group in OFFICE_FORMAT_GROUPS" :key="group.id" :data-office-group="group.id">
            <dt>{{ isZh ? officeGroupLabels[group.id] || group.label : group.label }}</dt>
            <dd>
              <code v-for="extension in group.extensions" :key="extension">.{{ extension }}</code>
            </dd>
          </div>
        </dl>
        <p>
          {{
            isZh
              ? '按当前格式注册表完整列出。宏与外部程序不会执行；旧版 PPT / POT 保留内置引擎水印。各格式的还原程度与限制请查看完整能力矩阵。'
              : 'Listed in full from the current format registry. Macros and external programs are not executed; legacy PPT / POT retain the embedded engine watermark. See the full matrix for fidelity and format-specific limitations.'
          }}
        </p>
      </section>
    </div>
    <div class="format-coverage-note">
      <p>
        <span class="coverage-dot" />{{ FORMAT_CATALOG_SUMMARY.stableExtensionCount }}
        {{ isZh ? '个稳定扩展名' : 'stable extensions'
        }}<span class="coverage-dot is-experimental" />{{
          FORMAT_CATALOG_SUMMARY.experimentalExtensionCount
        }}
        {{ isZh ? '个实验扩展名' : 'experimental extensions' }}
      </p>
      <a :href="docsUrl" target="_blank" rel="noreferrer"
        >{{ isZh ? '完整矩阵与能力边界' : 'Full matrix & limitations' }}<ArrowRight :size="15"
      /></a>
    </div>
  </section>
</template>
