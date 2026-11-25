<script setup lang="ts">
import { Pause, Play } from '@lucide/vue'

defineProps<{ isZh: boolean; paused: boolean; controls: string }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button class="carousel-playback" type="button" :aria-controls="controls" @click="$emit('toggle')">
    <Play v-if="paused" :size="14" aria-hidden="true" />
    <Pause v-else :size="14" aria-hidden="true" />
    <span>{{ paused ? (isZh ? '开始轮播' : 'Play') : (isZh ? '暂停轮播' : 'Pause') }}</span>
  </button>
</template>
