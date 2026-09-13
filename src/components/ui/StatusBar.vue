<script setup>
/**
 * 底部统计信息行
 *
 * 用法：<StatusBar :items="[{ label: '字符数', value: '1,234' }]" />
 */
defineProps({
  items: { type: Array, default: () => [] }, // [{ label, value }]
})
</script>

<template>
  <div v-if="items.length" class="status-bar">
    <span v-for="item in items" :key="item.label" class="stat">
      <span class="stat-label">{{ item.label }}</span>
      <span class="stat-value">{{ item.value }}</span>
    </span>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  padding: var(--sp-2) var(--sp-3);
  background-color: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--fs-xs);
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
}

.stat-label {
  color: var(--fg-subtle);
}

.stat-value {
  color: var(--fg);
  font-family: var(--font-mono);
  font-weight: 500;
}
</style>
