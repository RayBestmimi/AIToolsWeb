import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  // ⚠️ 这一行决定了部署能不能成功，不要改成 '/AIToolsWeb/' 之类的绝对路径。
  //
  // 单文件构建后外部资源引用已经没有了，这一行严格来说是冗余的。
  // 但留着它是零成本的保险：万一将来重新引入图片、字体之类的静态资源，
  // 相对路径能保证同一份产物同时跑在项目页、自定义域名和 localhost 上。
  base: './',

  // viteSingleFile 把打包出来的 JS 和 CSS 全部内联进 index.html，
  // 最终 dist/ 里只有一个 index.html，没有任何外部文件。
  //
  // 为什么必须这么做：浏览器对 file:// 协议有额外限制，不允许一个本地文件
  // 去加载另一个本地文件。产物只要有外部 .js/.css，双击 index.html 就必然白屏。
  // 全部内联之后不存在"加载外部文件"这个动作，file:// 才能正常工作。
  //
  // 它会自动把 assetsInlineLimit 拉到很大、关掉 cssCodeSplit、开启
  // inlineDynamicImports —— 所以工具页的按路由懒加载也一并合并了。
  plugins: [vue(), viteSingleFile()],

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
