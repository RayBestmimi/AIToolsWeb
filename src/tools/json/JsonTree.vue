<script setup>
import { ref, computed } from 'vue'

/**
 * JSON 树形视图（递归组件）
 *
 * ⚠️ 绝对不能用 v-html 渲染 key 或值 —— JSON 内容完全由用户控制，
 *    用 v-html 就等于把 XSS 漏洞直接开放出去。
 *    这里全部走 {{ }} 插值，Vue 会自动转义，语法着色靠 CSS 类实现。
 *
 * 组件递归引用自己：Vue 3 的 SFC 会自动用文件名注册组件名，
 * 所以模板里可以直接写 <JsonTree>。
 */
const props = defineProps({
  data: { type: null, required: true },
  /** 这个节点在父节点里的名字（对象的 key 或数组的下标） */
  name: { type: [String, Number], default: null },
  /** 是不是数组里的元素（决定显示成下标还是 key） */
  isArrayItem: { type: Boolean, default: false },
  depth: { type: Number, default: 0 },
  /** 默认是否展开。数据量大时由父组件传 false 让大对象默认折叠 */
  defaultOpen: { type: Boolean, default: true },
  /** 单个字符串值显示的最大长度，超出截断（完整内容在 title 里） */
  truncate: { type: Number, default: 200 },
})

const open = ref(props.defaultOpen)

const type = computed(() => {
  const v = props.data
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
})

const isContainer = computed(() => type.value === 'object' || type.value === 'array')

const entries = computed(() => {
  if (!isContainer.value) return []
  if (type.value === 'array') {
    return props.data.map((v, i) => ({ key: i, value: v, isArrayItem: true }))
  }
  return Object.entries(props.data).map(([k, v]) => ({
    key: k,
    value: v,
    isArrayItem: false,
  }))
})

/** 折叠状态下显示的摘要，例如 `{…} 3 个字段` */
const summary = computed(() => {
  const n = entries.value.length
  if (type.value === 'array') {
    return n === 0 ? '空数组' : `${n} 项`
  }
  return n === 0 ? '空对象' : `${n} 个字段`
})

const brackets = computed(() =>
  type.value === 'array' ? ['[', ']'] : ['{', '}']
)

/** 原始类型的显示文本 */
const primitiveText = computed(() => {
  const v = props.data
  if (v === null) return 'null'
  if (typeof v === 'string') {
    const shown = v.length > props.truncate
      ? v.slice(0, props.truncate) + '…'
      : v
    return `"${shown}"`
  }
  return String(v)
})

const primitiveTitle = computed(() =>
  typeof props.data === 'string' && props.data.length > props.truncate
    ? props.data
    : undefined
)

/** 浅层深度的缩进用 CSS 做，避免深层嵌套时行内样式太乱 */
const indentStyle = computed(() => ({ paddingLeft: `${props.depth * 14}px` }))
</script>

<template>
  <!-- ---------- 原始类型 ---------- -->
  <div v-if="!isContainer" class="row" :style="indentStyle">
    <span class="spacer" aria-hidden="true" />
    <span v-if="name !== null" class="key" :class="{ 'key-index': isArrayItem }">
      {{ isArrayItem ? name : `"${name}"` }}
    </span>
    <span v-if="name !== null" class="punct">:</span>
    <span class="value" :class="`type-${type}`" :title="primitiveTitle">
      {{ primitiveText }}
    </span>
  </div>

  <!-- ---------- 对象 / 数组 ---------- -->
  <div v-else class="node">
    <div class="row" :style="indentStyle">
      <button
        class="toggle"
        type="button"
        :aria-expanded="open"
        :aria-label="open ? '折叠' : '展开'"
        @click="open = !open"
      >
        <svg class="chevron" :class="{ open }" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m9 6 6 6-6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <span v-if="name !== null" class="key" :class="{ 'key-index': isArrayItem }">
        {{ isArrayItem ? name : `"${name}"` }}
      </span>
      <span v-if="name !== null" class="punct">:</span>

      <button class="summary" type="button" @click="open = !open">
        <span class="punct">{{ brackets[0] }}</span>
        <template v-if="!open">
          <span class="ellipsis">…</span>
          <span class="punct">{{ brackets[1] }}</span>
          <span class="count">{{ summary }}</span>
        </template>
      </button>
    </div>

    <template v-if="open">
      <JsonTree
        v-for="entry in entries"
        :key="entry.key"
        :data="entry.value"
        :name="entry.key"
        :is-array-item="entry.isArrayItem"
        :depth="depth + 1"
        :default-open="defaultOpen"
        :truncate="truncate"
      />
      <div class="row" :style="{ paddingLeft: `${depth * 14}px` }">
        <span class="spacer" aria-hidden="true" />
        <span class="punct">{{ brackets[1] }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: baseline;
  gap: var(--sp-1);
  min-height: 21px;
  line-height: 1.6;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
}

.spacer,
.toggle {
  width: 16px;
  flex-shrink: 0;
}

.toggle {
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  color: var(--fg-subtle);
  border-radius: var(--radius-sm);
}

.toggle:hover {
  background-color: var(--bg-hover);
  color: var(--fg);
}

.chevron {
  width: 12px;
  height: 12px;
  transition: transform var(--transition);
}

.chevron.open {
  transform: rotate(90deg);
}

.key {
  color: var(--syn-key);
}

/* 数组下标用弱一点的颜色，跟对象的 key 区分开 */
.key-index {
  color: var(--syn-null);
}

.punct {
  color: var(--syn-punct);
}

.value {
  word-break: break-all;
}

.type-string {
  color: var(--syn-string);
}
.type-number {
  color: var(--syn-number);
}
.type-boolean {
  color: var(--syn-bool);
}
.type-null {
  color: var(--syn-null);
  font-style: italic;
}

.summary {
  display: inline-flex;
  align-items: baseline;
  gap: var(--sp-1);
  font-family: inherit;
  font-size: inherit;
}

.summary:hover {
  background-color: var(--bg-hover);
  border-radius: var(--radius-sm);
}

.ellipsis {
  color: var(--fg-subtle);
}

.count {
  margin-left: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  font-family: var(--font-sans);
}
</style>
