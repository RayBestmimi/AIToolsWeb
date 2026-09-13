<script setup>
import { computed } from 'vue'

/**
 * 下拉选择，用于选项较多的场景（时区列表有 400+ 项，哈希算法 4 项）
 */
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const current = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <label class="select-field" :title="label || undefined">
    <span v-if="label" class="sel-label">{{ label }}</span>
    <select v-model="current" class="sel-input" :disabled="disabled">
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
  </label>
</template>

<style scoped>
.select-field {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.sel-label {
  font-size: var(--fs-sm);
  color: var(--fg-muted);
  white-space: nowrap;
}

.sel-input {
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--radius);
  font-size: var(--fs-sm);
  max-width: 320px;
}
</style>
