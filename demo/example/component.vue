<script setup lang="ts">
import { computed, ref } from 'vue'

type SampleFile = {
  name: string
  type: string
  size: number
}

const files = ref<SampleFile[]>([
  { name: 'contract.pdf', type: 'pdf', size: 184320 },
  { name: 'invoice.ofd', type: 'ofd', size: 98304 },
  { name: 'drawing.dxf', type: 'dxf', size: 42752 }
])

const selected = ref(files.value[0])

const title = computed(() => {
  return `${selected.value.name} / ${selected.value.type.toUpperCase()}`
})

function selectFile(file: SampleFile) {
  selected.value = file
}
</script>

<template>
  <section class="sample">
    <header>
      <span>Flyfish Viewer</span>
      <strong>{{ title }}</strong>
    </header>

    <button
      v-for="file in files"
      :key="file.name"
      type="button"
      :class="{ active: file.name === selected.name }"
      @click="selectFile(file)"
    >
      <span>{{ file.type }}</span>
      <strong>{{ file.name }}</strong>
      <em>{{ Math.round(file.size / 1024) }} KB</em>
    </button>
  </section>
</template>

<style scoped>
.sample {
  display: grid;
  gap: 10px;
  padding: 16px;
  color: #21a366;
}

.sample button {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 8px;
  border: 1px solid #d8e3dc;
  border-radius: 8px;
  background: #fff;
}

.sample button.active {
  border-color: currentColor;
}
</style>
