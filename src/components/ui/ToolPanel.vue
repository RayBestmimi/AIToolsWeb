<script setup>
/**
 * 工具页外壳：标题 + 副标题 + 内容槽
 *
 * 每个工具的最外层都用它，保证全站标题排版一致。
 */
defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' },
})
</script>

<template>
  <article class="tool-panel">
    <header class="head">
      <div class="head-text">
        <h1 class="title">{{ title }}</h1>
        <p v-if="desc" class="desc">{{ desc }}</p>
      </div>
      <div class="head-actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="body">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.tool-panel {
  max-width: var(--content-max);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.title {
  font-size: var(--fs-xl);
  letter-spacing: -0.01em;
}

.desc {
  margin-top: var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--fg-muted);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
</style>
