<script setup>
/**
 * 选项栏：把一行控件（分段控件、开关、下拉、按钮）横向排布并统一间距
 *
 * 存在意义是保证 6 个工具的选项区排版完全一致。
 * 如果有哪一行控件需要特殊布局（比如换行后右对齐），
 * 直接在这个组件外面套一个 div 自己写样式，不要往这里加 prop。
 */
defineProps({
  /** 是否显示顶部的分隔线，用于和上方输入框区分 */
  divider: { type: Boolean, default: false },
})
</script>

<template>
  <div class="option-bar" :class="{ divider }">
    <slot />
  </div>
</template>

<style scoped>
.option-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3) var(--sp-4);
  flex-wrap: wrap;
  min-height: 32px;
}

.divider {
  padding-top: var(--sp-3);
  border-top: 1px solid var(--border);
}
</style>
