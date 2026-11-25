<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Check, Sparkles } from '@lucide/vue'
import CarouselPlayback from './CarouselPlayback.vue'
import FormatMark from './FormatMark.vue'
import { FORMAT_CATALOG_SUMMARY, OFFICE_FORMAT_GROUPS } from '../formatCatalog.generated'
import type { DemoBrandIconName } from '../data/demoFileBrandIcons'
import { useCarouselPlayback } from '../useCarouselPlayback'

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
    note: ['文字文档、电子表格和演示文稿', 'Documents, spreadsheets and presentations'],
    detail: [
      '在审批系统、知识库或附件中心预览 Word、Excel 和 PowerPoint 文件。下表列出了扩展名，具体排版效果和功能限制见格式支持表。',
      'Preview Word, Excel and PowerPoint files in approval tools, knowledge bases and attachment lists. Use the format guide to check layout support and limitations.'
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
    title: ['版式文档和电子书', 'Page formats and ebooks'],
    note: ['PDF、OFD、Typst 和电子书', 'PDF, OFD, Typst and ebooks'],
    detail: [
      '预览 PDF 和 OFD 页面、Typst 源文件、电子书和帮助文件。切换预览器主题时，文档页面与工具栏分别显示。',
      'Preview PDF and OFD pages, Typst source, ebooks and help files. The viewer theme applies to the controls separately from the document pages.'
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
    title: ['工程图纸和模型', 'Engineering drawings and models'],
    note: ['CAD、三维模型、流程图和思维导图', 'CAD, 3D models, diagrams and mind maps'],
    detail: [
      '预览 DWG 或 DXF 图纸、STEP 或 STL 模型，以及 Draw.io 等图表文件。预览器按文件格式加载所需的 Worker 和 WASM。',
      'Preview DWG or DXF drawings, STEP or STL models, and diagrams such as Draw.io files. The viewer loads the Workers and WebAssembly it needs for each format.'
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
    title: ['压缩包和邮件', 'Archives and email'],
    note: ['压缩包目录、邮件正文和附件', 'Archive contents, email messages and attachments'],
    detail: [
      '查看 ZIP、7z 和 RAR 中的文件，或打开 EML、MSG 邮件及附件。支持的压缩方式、加密方式和嵌套附件见格式支持表。',
      'List files in ZIP, 7z and RAR archives, or open EML and MSG messages and their attachments. Check the format guide for compression, encryption and nested attachments.'
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
    title: ['代码和数据', 'Code and data'],
    note: ['Markdown、源代码、数据库和列式数据', 'Markdown, source code, databases and columnar data'],
    detail: [
      '查看 Markdown 和源代码，读取 JSON、SQLite 和 Parquet 数据。代码预览只显示内容。',
      'Read Markdown and source files, and inspect data in JSON, SQLite and Parquet. The source viewer displays code as text.'
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
    title: ['图片和音视频', 'Images, audio and video'],
    note: ['图片、设计源文件、音频和视频', 'Images, design files, audio and video'],
    detail: [
      '查看 PNG、SVG、PSD 和 AI 文件，或播放音频和视频。设计源文件只供预览。可播放的音视频取决于浏览器支持的编解码器。',
      'View PNG, SVG, PSD and AI files, or play audio and video. Design files are read-only. Playback depends on the codecs available in your browser.'
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
const grid = ref<HTMLElement | null>(null)
const { paused, playing, pause, toggle, setHover } = useCarouselPlayback(grid, selected, groups.length, 7500)
const activeGroup = computed(() => groups[selected.value]!)
const lang = computed(() => (props.isZh ? 0 : 1))
function chooseGroup(index: number) {
  pause()
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
  const tab = grid.value?.querySelector<HTMLButtonElement>(`#format-group-${groups[next]!.id}`)
  tab?.focus({ preventScroll: true })
  tab?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
}
</script>

<template>
  <section
    id="formats"
    class="format-experience format-directory-grid"
    :class="{ 'motion-paused': !playing }"
    aria-labelledby="formats-title"
  >
    <header class="format-experience-heading">
      <div>
        <h2 id="formats-title">{{ isZh ? '支持的文件格式' : 'Supported file formats' }}</h2>
      </div>
      <div class="format-experience-intro">
        <p>
          {{
            isZh
              ? `已登记 ${FORMAT_CATALOG_SUMMARY.registeredExtensionCount} 个扩展名，使用 ${FORMAT_CATALOG_SUMMARY.rendererCount} 个预览模块。`
              : `${FORMAT_CATALOG_SUMMARY.registeredExtensionCount} registered file extensions use ${FORMAT_CATALOG_SUMMARY.rendererCount} preview modules.`
          }}
        </p>
        <div class="format-experience-tools">
          <CarouselPlayback :is-zh="isZh" :paused="paused" controls="format-carousel" @toggle="toggle" />
          <span>{{ isZh ? '点选类别查看详情' : 'Choose a type for details' }}</span>
        </div>
      </div>
    </header>

    <div
      id="format-carousel"
      ref="grid"
      class="format-constellation"
      role="tablist"
      :aria-label="isZh ? '文件类型' : 'File types'"
      @focusin="pause"
      @pointerenter="setHover"
      @pointerleave="setHover"
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
        <span v-if="selected === index" class="format-family-check" aria-hidden="true">
          <Check :size="15" :stroke-width="2.4" />
        </span>
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
          ><ArrowRight :size="18" aria-hidden="true"
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
      @focusin="pause"
      @pointerenter="setHover"
      @pointerleave="setHover"
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
        :aria-label="isZh ? '扩展名示例' : 'Example file extensions'"
      >
        <span v-for="ext in activeGroup.extensions" :key="ext">.{{ ext }}</span>
      </div>
      <a :href="demoUrl" target="_blank" rel="noreferrer"
        >{{ isZh ? '试用样例文件' : 'Try sample files' }}<ArrowRight :size="16"
      /></a>
      <section
        v-if="activeGroup.id === 'office'"
        class="office-format-matrix"
        aria-labelledby="office-matrix-title"
      >
        <header>
          <h3 id="office-matrix-title">
            {{ isZh ? 'Office 及相关格式' : 'Office and related formats' }}
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
              ? '预览时不会运行宏或外部程序。旧版 PPT 和 POT 文件会显示内置引擎的水印。各格式的排版效果和功能限制见完整格式支持表。'
              : 'The viewer does not run macros or external programs. Legacy PPT and POT files retain the built-in engine’s watermark. See the full format guide for layout support and limitations.'
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
      <div class="format-coverage-actions">
        <a href="#compatibility">{{ isZh ? '浏览器兼容性' : 'Browser support' }}<ArrowRight :size="15" /></a>
        <a :href="docsUrl" target="_blank" rel="noreferrer">
          {{ isZh ? '完整格式支持表' : 'Full format guide' }}<ArrowRight :size="15" />
        </a>
      </div>
    </div>
  </section>
</template>
