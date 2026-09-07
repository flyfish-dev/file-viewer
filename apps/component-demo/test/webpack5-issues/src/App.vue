<template>
  <main>
    <div
      style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px; width: 45%"
    >
      <input id="file" type="file" @change="selectFile" />
      <button id="toggle" @click="open = !open">Toggle drawer</button>
      <button @click="file = undefined">Clear file</button>
      <select id="review" v-model="reviewMode">
        <option>all</option>
        <option>final</option>
        <option>original</option>
      </select>
      <label><input id="react" type="checkbox" v-model="reactMode" />React full</label>
      <label
        ><input id="deny-download" type="checkbox" v-model="denyDownload" />Cancel downloads</label
      >
      <output id="operations">{{ operations.join(',') }}</output>
      <output id="load-state">{{ loadState }}</output>
      <input id="query" v-model="query" placeholder="Search document" />
      <button id="search" @click="search('searchDocument')">Search</button>
      <button id="next-match" @click="search('nextSearchResult')">Next match</button>
      <output id="matches">{{ matches }}</output>
    </div>
    <ElDrawer
      v-model="open"
      size="50%"
      :modal="false"
      :modal-penetrable="true"
      :destroy-on-close="true"
      :resizable="true"
      title="File preview"
    >
      <div v-if="reactMode" ref="reactHost" style="height: 100%; width: 100%"></div>
      <FileViewer
        v-else
        ref="viewer"
        :file="file"
        :options="options"
        @load-start="loadState = 'loading'"
        @load-complete="loadState = 'ready'"
        style="height: 100%; width: 100%"
      />
    </ElDrawer>
  </main>
</template>
<script setup lang="ts">
import { computed, ref, shallowRef, watchEffect } from 'vue'
import type { FileViewerPublicApi } from '@file-viewer/core'
import type { FileViewerOperationContext } from '@file-viewer/core'
import { FileViewer } from '@file-viewer/vue3'
import officePreset from '@file-viewer/preset-office'
import { cadRenderer } from '@file-viewer/renderer-cad'
import { ElDrawer } from 'element-plus'
import 'element-plus/dist/index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import ReactFileViewer, { type FileViewerHandle } from '@file-viewer/react-full'
const file = ref<File>()
const open = ref(true)
const reviewMode = ref<'all' | 'final' | 'original'>('all')
const reactMode = ref(false)
const reactHost = ref<HTMLElement>()
const viewer = shallowRef<FileViewerPublicApi>()
const reactViewer = React.createRef<FileViewerHandle>()
const reactRoot = shallowRef<ReturnType<typeof createRoot>>()
const query = ref('')
const matches = ref('')
const denyDownload = ref(false)
const operations = ref<string[]>([])
const loadState = ref('idle')
const options = computed(
  () =>
    ({
      ...(!reactMode.value ? { preset: officePreset } : {}),
      renderers: cadRenderer,
      rendererMode: 'replace',
      theme: 'light',
      styleIsolation: 'shadow',
      toolbar: false,
      beforeOperation: (context: FileViewerOperationContext) => {
        operations.value.push(context.operation)
        return !(context.operation === 'download' && denyDownload.value)
      },
      docx: { reviewMode: reviewMode.value }
    }) as const
)
watchEffect((cleanup) => {
  if (!reactHost.value || !reactMode.value) return
  const root = createRoot(reactHost.value)
  reactRoot.value = root
  cleanup(() => {
    reactRoot.value = undefined
    root.unmount()
  })
})
watchEffect(() => {
  reactRoot.value?.render(
    React.createElement(ReactFileViewer, {
      ref: reactViewer,
      file: file.value,
      options: options.value,
      onEvent: (event) => {
        if (event.type === 'load-start') loadState.value = 'loading'
        if (event.type === 'load-complete') loadState.value = 'ready'
      },
      style: { height: '100%' }
    })
  )
})
async function search(method: 'searchDocument' | 'nextSearchResult') {
  const api = reactMode.value ? reactViewer.current : viewer.value
  const result = await api?.[method](query.value)
  matches.value = JSON.stringify(result)
}
async function selectFile(event: Event) {
  const original = (event.target as HTMLInputElement).files?.[0]
  if (original)
    file.value = new File([await original.arrayBuffer()], original.name, { type: original.type })
}
</script>
