<script setup>
/**
 * 通用表格
 *
 * 用在：URL query 参数表、多算法哈希结果表、多时区时间表
 */
defineProps({
  columns: { type: Array, required: true }, // [{ key, label, mono?, width? }]
  rows: { type: Array, default: () => [] },
  emptyText: { type: String, default: '暂无数据' },
  /** 是否显示行操作列（配合 row-actions 插槽） */
  rowActions: { type: Boolean, default: false },
})
</script>

<template>
  <div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : undefined"
          >
            {{ col.label }}
          </th>
          <th v-if="rowActions" class="actions-col">
            <span class="visually-hidden">操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="columns.length + (rowActions ? 1 : 0)" class="empty-hint">
            {{ emptyText }}
          </td>
        </tr>
        <tr v-for="(row, i) in rows" :key="i">
          <td v-for="col in columns" :key="col.key" :class="{ 'cell-mono': col.mono }">
            {{ row[col.key] }}
          </td>
          <td v-if="rowActions" class="actions-col">
            <slot name="row-actions" :row="row" :index="i" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: auto;
  max-height: 60vh;
}

.actions-col {
  width: 1%;
  white-space: nowrap;
  text-align: right;
}

/* 表头吸顶，长表格滚动时还能看到列名 */
.data-table th {
  position: sticky;
  top: 0;
  background-color: var(--bg-elev);
  z-index: 1;
}
</style>
