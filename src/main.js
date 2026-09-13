import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

// 样式顺序有讲究：先令牌，再基础样式。
// 基础样式里 html { background-color: var(--bg) } 依赖令牌已经定义好
import './styles/tokens.css'
import './styles/base.css'
import './styles/tool.css'

createApp(App).use(router).mount('#app')
