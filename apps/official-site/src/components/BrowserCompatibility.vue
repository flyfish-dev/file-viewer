<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight } from '@lucide/vue'

const props = defineProps<{ isZh: boolean }>()

const browsers = [
  { name: 'Chrome', icon: 'chrome', minimum: '113.0.5672.63' },
  { name: 'Edge', icon: 'edge', minimum: '111.0.1661.62' },
  { name: 'Firefox', icon: 'firefox', minimum: '114.0.2' },
  { name: 'Safari', icon: 'safari', minimum: '27.0.1' },
  { name: 'Mobile Safari', nameZh: '移动端 Safari', devices: 'iPhone / iPad', icon: 'safari-ios', minimum: '18.4' }
]
const browserGroups = [browsers.slice(0, 3), browsers.slice(3)]

const docsUrl = computed(() =>
  props.isZh
    ? 'https://doc.file-viewer.app/zh/guide/demo#浏览器兼容矩阵'
    : 'https://doc.file-viewer.app/guide/demo?no_lang_redirect=1#browser-compatibility'
)
</script>

<template>
  <section id="compatibility" class="compatibility" aria-labelledby="compatibility-title">
    <header class="compatibility-heading">
      <h2 id="compatibility-title">{{ isZh ? '浏览器最低支持版本' : 'Minimum browser versions' }}</h2>
      <a class="compatibility-link" :href="docsUrl" target="_blank" rel="noreferrer">
        {{ isZh ? '完整测试记录' : 'Full test results' }}
        <ArrowUpRight :size="15" aria-hidden="true" />
      </a>
    </header>

    <div class="compatibility-tables">
      <table
        v-for="group in browserGroups"
        :key="group[0]!.name"
        :aria-label="group.map(browser => browser.name).join(' / ')"
      >
        <thead>
          <tr>
            <th
              v-for="browser in group"
              :key="browser.name"
              scope="col"
              :aria-label="browser.devices ? `${isZh ? browser.nameZh : browser.name} (${browser.devices})` : undefined"
            >
              <span class="compatibility-browser">
                <img :src="'/browser-logos/' + browser.icon + '.png'" width="26" height="26" alt="" />
                {{ (isZh && browser.nameZh) || browser.name }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td v-for="browser in group" :key="browser.name">{{ browser.minimum }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <dl class="compatibility-status">
      <div>
        <dt>{{ isZh ? '待确认' : 'Pending' }}</dt>
        <dd>{{ isZh
          ? 'Brave、Opera、Vivaldi、Android 浏览器和内嵌 WebView'
          : 'Brave, Opera, Vivaldi, Android browsers, and embedded WebViews' }}</dd>
      </div>
      <div>
        <dt>{{ isZh ? '不支持' : 'Unsupported' }}</dt>
        <dd>{{ isZh ? 'Internet Explorer 11、EdgeHTML 12–18' : 'Internet Explorer 11 and EdgeHTML 12–18' }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.compatibility {
  min-width: 0;
  padding-block: clamp(34px, 5vw, 68px);
  color: var(--site-ink);
  border-top: 1px solid var(--site-line);
  scroll-margin-top: 96px;
}

.compatibility-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 24px;
  margin-bottom: 20px;
}

.compatibility-heading h2 {
  margin: 0;
  font-size: clamp(27px, 4vw, 45px);
  line-height: 1.1;
  letter-spacing: -0.045em;
}

.compatibility-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  color: var(--site-ink);
  font-size: .8125rem;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: .28em;
  text-decoration-color: var(--site-line);
}

.compatibility-link:hover {
  text-decoration-color: currentColor;
}

.compatibility-tables {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  overflow: hidden;
  border: 1px solid var(--site-line);
  border-radius: 12px;
  background: var(--site-surface);
}

.compatibility table + table {
  border-inline-start: 1px solid var(--site-line);
}

.compatibility table {
  width: 100%;
  table-layout: fixed;
  border-spacing: 0;
  text-align: center;
}

.compatibility th,
.compatibility td {
  padding: 12px 6px;
  vertical-align: middle;
}

.compatibility thead th {
  background: var(--site-surface-soft);
  font-size: .8125rem;
  font-weight: 650;
}

.compatibility-browser {
  display: grid;
  justify-items: center;
  gap: 6px;
  line-height: 1.25;
}

.compatibility-browser img {
  display: block;
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.compatibility tbody td {
  border-top: 1px solid var(--site-line);
}

.compatibility tbody td {
  font-family: var(--a-code-font);
  font-size: clamp(10.5px, 2.9vw, 14px);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.compatibility-status {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 24px;
  margin: 12px 0 0;
  font-size: .75rem;
  line-height: 1.55;
}

.compatibility-status > div {
  display: flex;
  gap: 7px;
  min-width: 0;
}

.compatibility-status dt {
  flex-shrink: 0;
  font-weight: 700;
}

.compatibility-status dd {
  margin: 0;
  color: var(--site-muted);
  overflow-wrap: anywhere;
}

@media (max-width: 700px) {
  .compatibility-tables { grid-template-columns: 1fr; }
  .compatibility table + table { border-inline-start: 0; border-top: 1px solid var(--site-line); }
  .compatibility th, .compatibility td { padding-inline: 4px; }
  .compatibility thead th { font-size: .75rem; }
}
</style>
