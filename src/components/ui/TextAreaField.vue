<script setup>
import { ref, computed, watch, nextTick } from 'vue'

/**
 * 带标签 / 计数 / 工具条插槽的多行文本框
 *
 * 这是复用度最高的组件——6 个工具全都用它。所以它承担了两件额外的事：
 *   1. 只读模式下也要能选中复制（用 readonly 而不是 disabled）
 *   2. 支持「跳到并选中某个位置」，JSON 报错定位靠它
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  /** 输出框传 true。用 readonly 而不是 disabled，否则无法选中复制 */
  readonly: { type: Boolean, default: false },
  rows: { type: Number, default: 12 },
  mono: { type: Boolean, default: true },
  showCount: { type: Boolean, default: true },
  /**
   * 设置后自动聚焦并选中该区间：{ start, end }
   *
   * ⚠️ 每次都要传一个**新对象**，否则引用没变，watch 不会触发。
   *    例如 @click="reveal = { start: 10, end: 15 }" 每次都是新对象，没问题。
   */
  reveal: { type: Object, default: null },
  spellcheck: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const el = ref(null)

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

const stats = computed(() => {
  const v = props.modelValue
  if (!v) return ''
  const lines = v.split('\n').length
  return `${lines} 行 · ${v.length} 字符`
})

watch(
  () => props.reveal,
  async (r) => {
    if (!r || !el.value) return
    await nextTick()
    const ta = el.value
    ta.focus()
    ta.setSelectionRange(r.start, r.end)

    // 把目标行滚动到可视区中间，而不是让它贴着边缘
    const before = props.modelValue.slice(0, r.start)
    const lineIndex = before.split('\n').length - 1
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 21
    ta.scrollTop = Math.max(0, lineIndex * lineHeight - ta.clientHeight / 2)
  }
)
</script>

<template>
  <div class="field">
    <div v-if="label || $slots.toolbar" class="field-head">
      <label v-if="label" class="ctl-label strong">{{ label }}</label>
      <div class="field-toolbar">
        <slot name="toolbar" />
      </div>
    </div>

    <textarea
      ref="el"
      class="field-input"
      :class="{ mono }"
      :value="modelValue"
      :placeholder="placeholder"
      :readonly="readonly"
      :rows="rows"
      :spellcheck="spellcheck"
      :aria-label="label || undefined"
      @input="onInput"
    />

    <div v-if="showCount && stats" class="field-foot">{{ stats }}</div>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  min-height: 24px;
}

.field-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.field-input {
  width: 100%;
  padding: var(--sp-3);
  border-radius: var(--radius);
  font-size: var(--fs-sm);
  line-height: 1.6;
  resize: vertical;
  tab-size: 2;
}

.field-input.mono {
  font-family: var(--font-mono);
}

/* 只读（输出）框刻意比可编辑框浅一档，两个主题下都是这个方向。
   用 --bg 而不是 --bg-sunken：后者会和可编辑框同色，丢掉输入/输出的区分；
   用 --bg-elev 又会和卡片同色而"消失"。 */
.field-input[readonly] {
  background-color: var(--bg);
  cursor: text;
}

.field-foot {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  text-align: right;
}
</style>
