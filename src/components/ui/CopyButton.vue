<script setup>
import { computed } from 'vue'
import { useClipboard } from '@/composables/useClipboard'

const props = defineProps({
  /** 要复制的文本。传函数可以延迟求值——大文本每次重渲染都算一遍会很浪费 */
  text: { type: [String, Function], required: true },
  label: { type: String, default: '复制' },
  size: { type: String, default: 'sm' }, // 'sm' | 'md'
  disabled: { type: Boolean, default: false },
})

const { copy, copied, failed } = useClipboard()

// 空字符串也允许复制（有时候用户就是想复制个空值），
// 只有拿不到文本时才禁用
const isEmpty = computed(() => {
  const v = typeof props.text === 'function' ? props.text() : props.text
  return v == null
})

async function onClick() {
  const value = typeof props.text === 'function' ? props.text() : props.text
  await copy(String(value ?? ''))
}
</script>

<template>
  <button
    class="copy-btn plain-btn"
    :class="[`size-${size}`, { copied, failed }]"
    type="button"
    :disabled="disabled || isEmpty"
    @click="onClick"
  >
    <svg v-if="copied" class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m5 12.5 4.5 4.5L19 7"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <svg v-else-if="failed" class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 8v5M12 16.5v.5M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <svg v-else class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.7" />
      <path d="M5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
    </svg>

    <span>{{ copied ? '已复制' : failed ? '复制失败' : label }}</span>
  </button>
</template>

<style scoped>
/* 基础外观（内边距、边框、圆角、底色、hover）全部来自全局的 .plain-btn，
   这里只写它自己没有的三样东西：成功/失败状态、大号变体、图标尺寸。

   选择器都带 .copy-btn 前缀是必要的：加一个类名就能把特异性抬到 (0,2,0)，
   稳压全局的 .plain-btn (0,1,0)，不依赖两份 CSS 谁先被注入。 */

.copy-btn.copied {
  color: var(--ok);
  border-color: var(--ok);
  background-color: var(--ok-bg);
}

.copy-btn.failed {
  color: var(--danger);
  border-color: var(--danger);
  background-color: var(--danger-bg);
}

.copy-btn.size-md {
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-sm);
}

.icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.copy-btn.size-md .icon {
  width: 15px;
  height: 15px;
}
</style>
