<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { mode, resolved, cycle } = useTheme()

const LABEL = {
  auto: '跟随系统',
  light: '浅色',
  dark: '深色',
}

// 提示文字要说清"当前是什么"和"点一下会变成什么"，
// 否则三态循环的按钮会让人猜不透
const title = computed(() => {
  const next = mode.value === 'auto' ? '浅色' : mode.value === 'light' ? '深色' : '跟随系统'
  const suffix = mode.value === 'auto' ? `（当前 ${resolved.value === 'dark' ? '深色' : '浅色'}）` : ''
  return `主题：${LABEL[mode.value]}${suffix}，点击切换到${next}`
})
</script>

<template>
  <button
    class="theme-toggle icon-btn"
    type="button"
    :title="title"
    :aria-label="title"
    @click="cycle"
  >
    <!-- 跟随系统：半明半暗的圆 -->
    <svg v-if="mode === 'auto'" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>

    <!-- 浅色：太阳 -->
    <svg v-else-if="mode === 'light'" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7" />
      <path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </svg>

    <!-- 深色：月亮 -->
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    </svg>

    <span class="visually-hidden">{{ LABEL[mode] }}</span>
  </button>
</template>

<!-- 外观全部来自 base.css 的 .icon-btn —— 顶栏汉堡、侧边栏关闭按钮用的是同一个类，
     三者尺寸/hover/图标大小必须一致，所以不在这里重复定义。 -->

