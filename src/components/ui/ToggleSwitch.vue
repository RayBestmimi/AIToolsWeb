<script setup>
/**
 * 布尔开关
 *
 * 内部用原生 <input type="checkbox" role="switch">，
 * 这样键盘 Tab 能聚焦、空格能切换，无障碍能力是白送的。
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  /** 悬停提示，用来解释这个选项到底在干什么 */
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <label class="toggle" :class="{ disabled }" :title="hint || undefined">
    <input
      class="native"
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', $event.target.checked)"
    />
    <span class="track" aria-hidden="true"><span class="thumb" /></span>
    <span v-if="label" class="label">{{ label }}</span>
  </label>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--fg);
  user-select: none;
}

.toggle.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.native {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.track {
  position: relative;
  width: 32px;
  height: 18px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background-color: var(--border-strong);
  transition: background-color var(--transition);
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--switch-knob);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);
}

.native:checked + .track {
  background-color: var(--accent);
}

.native:checked + .track .thumb {
  transform: translateX(14px);
}

/* 键盘聚焦时的焦点环画在轨道上，因为原生 checkbox 被隐藏了 */
.native:focus-visible + .track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
