import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 模块 build.sh 依赖这里的产物约定：base './' + dist + emptyOutDir + assetsInlineLimit。
export default defineConfig({
  plugins: [vue()],
  test: {
    server: {
      deps: {
        inline: ['@material/material-color-utilities'],
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 4096,
  },
  base: './',
})
