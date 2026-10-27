import { fileURLToPath, URL } from 'node:url'
import { rm } from 'node:fs/promises'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const resolveSiteFile = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'omit-personal-donation-qr-assets',
      apply: 'build',
      async closeBundle() {
        for (const name of ['donate-wx.jpg', 'donate-alipay.jpg']) {
          await rm(resolveSiteFile(`./dist/${name}`), { force: true })
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1'
  },
  preview: {
    host: '127.0.0.1'
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: resolveSiteFile('./index.html'),
        en: resolveSiteFile('./en/index.html'),
        cli: resolveSiteFile('./cli/index.html'),
        cliEn: resolveSiteFile('./en/cli/index.html'),
        commercial: resolveSiteFile('./commercial/index.html'),
        commercialEn: resolveSiteFile('./en/commercial/index.html')
      }
    }
  }
})
