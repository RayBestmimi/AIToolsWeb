<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'

const route = useRoute()

// 窄屏时侧边栏变成抽屉，这个状态由顶栏的汉堡按钮控制
const sidebarOpen = ref(false)

// 切换工具后自动收起抽屉，否则窄屏下点完工具抽屉还挡着内容
watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  }
)
</script>

<template>
  <div class="app">
    <a class="skip-link" href="#main-content">跳到主内容</a>

    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <!-- 窄屏抽屉展开时的遮罩，点击关闭 -->
    <div
      v-if="sidebarOpen"
      class="app-backdrop"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />

    <div class="app-body">
      <AppTopbar :sidebar-open="sidebarOpen" @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <main id="main-content" class="app-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100%;
  background-color: var(--bg);
}

.app-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 允许内部内容收缩，否则长文本会把布局撑破 */
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-5) var(--sp-5) var(--sp-6);
}

.app-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.4);
}

@media (max-width: 768px) {
  .app-content {
    padding: var(--sp-4) var(--sp-3) var(--sp-5);
  }
}

@media (min-width: 769px) {
  /* 宽屏下抽屉遮罩永远不显示 */
  .app-backdrop {
    display: none;
  }
}
</style>
