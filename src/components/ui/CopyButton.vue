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
    class="copy-btn"
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
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--bg-elev);
  color: var(--fg-muted);
  font-size: var(--fs-xs);
  white-space: nowrap;
  transition: background-color var(--transition), color var(--transition),
    border-color var(--transition);
}

.copy-btn:hover:not(:disabled) {
  background-color: var(--bg-hover);
  color: var(--fg);
}

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

.size-md {
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-sm);
}

.icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.size-md .icon {
  width: 15px;
  height: 15px;
}
</style>
