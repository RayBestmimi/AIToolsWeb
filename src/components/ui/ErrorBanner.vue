<script setup>
/**
 * 错误 / 警告提示条
 *
 * 用 role="alert" 让读屏软件在内容出现时立刻播报，
 * 否则用户完全不知道操作失败了。
 */
defineProps({
  message: { type: String, default: '' },
  detail: { type: String, default: '' },
  tone: { type: String, default: 'error' }, // 'error' | 'warn' | 'ok'
})
</script>

<template>
  <div class="error-banner" :class="`tone-${tone}`" role="alert">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <template v-if="tone === 'ok'">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7" />
        <path d="m8 12.5 2.5 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </template>
      <template v-else-if="tone === 'warn'">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7" />
        <path d="M12 7.5v5M12 16v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </template>
      <template v-else>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7" />
        <path d="M12 7.5v5M12 16v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </template>
    </svg>

    <div class="text">
      <p class="message">{{ message }}</p>
      <p v-if="detail" class="detail">{{ detail }}</p>
    </div>

    <div v-if="$slots.actions" class="actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid;
  border-radius: var(--radius);
  font-size: var(--fs-sm);
}

.tone-error {
  color: var(--danger);
  background-color: var(--danger-bg);
  border-color: var(--danger);
}

.tone-warn {
  color: var(--warn);
  background-color: var(--warn-bg);
  border-color: var(--warn);
}

.tone-ok {
  color: var(--ok);
  background-color: var(--ok-bg);
  border-color: var(--ok);
}

.icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 3px;
}

.text {
  flex: 1;
  min-width: 0;
}

.message {
  word-break: break-word;
}

.detail {
  margin-top: var(--sp-1);
  opacity: 0.85;
  font-size: var(--fs-xs);
  word-break: break-word;
}

.actions {
  display: flex;
  gap: var(--sp-2);
  flex-shrink: 0;
}
</style>
