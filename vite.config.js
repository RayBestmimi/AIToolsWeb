import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // ⚠️ 这一行决定了部署能不能成功，不要改成 '/AIToolsWeb/' 之类的绝对路径。
  //
  // 相对 base 让产物里的资源引用都变成 './assets/xxx.js'，于是同一份构建结果能同时跑在：
  //   - https://<用户名>.github.io/AIToolsWeb/   （项目页，有仓库名前缀）
  //   - https://你的自定义域名/                  （部署在根路径）
  //   - http://localhost:5173/                   （本地开发）
  // 如果硬编码仓库名，改仓库名或换域名时会立刻白屏，且只报"资源 404"，很难定位。
  base: './',

  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    target: 'baseline-widely-available',
    sourcemap: false,
  },

  server: {
    port: 5173,
    open: true,
  },
})
