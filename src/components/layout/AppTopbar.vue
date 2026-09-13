<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { toolById } from '@/tools/registry'
import ThemeToggle from './ThemeToggle.vue'

defineProps({
  sidebarOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-sidebar'])

const route = useRoute()

const currentTool = computed(() =>
  route.meta.toolId ? toolById.get(route.meta.toolId) : null
)
</script>

<template>
  <header class="app-topbar">
    <button
      class="hamburger icon-btn"
      type="button"
      :aria-expanded="sidebarOpen"
      aria-label="切换工具列表"
      @click="emit('toggle-sidebar')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 7h16M4 12h16M4 17h16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <span class="crumb">{{ currentTool?.group }}</span>
    <span v-if="currentTool" class="sep" aria-hidden="true">/</span>
    <span class="current">{{ currentTool?.name ?? '开发者工具箱' }}</span>

    <ThemeToggle class="theme" />
  </header>
</template>

<style scoped>
.app-topbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  height: var(--topbar-h);
  flex-shrink: 0;
  padding: 0 var(--sp-4);
  background-color: var(--bg-elev);
  border-bottom: 1px solid var(--border);
}

/* 尺寸/hover/图标大小都来自 base.css 的 .icon-btn，这里只管宽窄屏的显示切换 */
.hamburger {
  display: none;
}

.crumb {
  font-size: var(--fs-sm);
  color: var(--fg-subtle);
}

.sep {
  color: var(--fg-subtle);
}

.current {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--fg);
}

.theme {
  margin-left: auto;
}

@media (max-width: 900px) {
  .app-topbar {
    padding: 0 var(--sp-3);
  }

  .hamburger {
    display: flex;
  }

  .crumb,
  .sep {
    display: none;
  }
}
</style>
