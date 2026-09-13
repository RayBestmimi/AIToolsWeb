<script setup>
/**
 * 分段控件：2-4 个互斥选项横向排布
 *
 * 用在「缩进 2 / 4 / Tab」「编码 / 解码」这类少量选项上。
 * 选项多了改用 SelectField。
 */
defineProps({
  modelValue: { type: [String, Number], required: true },
  options: {
    type: Array, // [{ value, label, title? }]
    required: true,
  },
  label: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="segmented-wrap">
    <span v-if="label" class="seg-label">{{ label }}</span>
    <div class="segmented" role="group" :aria-label="label || undefined">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="seg-btn"
        :class="{ active: opt.value === modelValue }"
        :title="opt.title || undefined"
        :aria-pressed="opt.value === modelValue"
        @click="emit('update:modelValue', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.segmented-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}

.seg-label {
  font-size: var(--fs-sm);
  color: var(--fg-muted);
}

.segmented {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  background-color: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.seg-btn {
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--radius-sm);
  font-size: var(--fs-sm);
  color: var(--fg-muted);
  white-space: nowrap;
  transition: background-color var(--transition), color var(--transition);
}

.seg-btn:hover:not(.active) {
  color: var(--fg);
  background-color: var(--bg-hover);
}

.seg-btn.active {
  background-color: var(--bg-elev);
  color: var(--fg);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}
</style>
