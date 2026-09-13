<script setup>
import { ref, computed, watch } from 'vue'
import ToolPanel from '@/components/ui/ToolPanel.vue'
import TextAreaField from '@/components/ui/TextAreaField.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import OptionBar from '@/components/ui/OptionBar.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import StatusBar from '@/components/ui/StatusBar.vue'
import JsonTree from './JsonTree.vue'
import { describeParseError, excerptAround } from './parseError'
import { useToolState } from '@/composables/useToolState'

const { state, reset } = useToolState('json', {
  input: '',
  indent: '2', // '2' | '4' | 'tab'
  action: 'format', // 'format' | 'minify' | 'escape' | 'unescape'
  sortKeys: false,
  view: 'text', // 'text' | 'tree'
})

const output = ref('')
const error = ref(null) // { message, line, col, index }
const parsed = ref(null)
const parsedOk = ref(false)

/* ---------------- 工具函数 ---------------- */

/** 递归按 key 字母序排列，便于对比两个结构相同但顺序不同的 JSON */
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value).sort()) out[k] = sortKeysDeep(value[k])
    return out
  }
  return value
}

/** 统计节点数，用于判断要不要默认折叠 / 提示切换视图 */
function countNodes(value) {
  if (value === null || typeof value !== 'object') return 1
  if (Array.isArray(value)) {
    return 1 + value.reduce((sum, v) => sum + countNodes(v), 0)
  }
  return 1 + Object.values(value).reduce((sum, v) => sum + countNodes(v), 0)
}

const INDENT_MAP = { 2: 2, 4: 4, tab: '\t' }

/** 转义：把一段文本变成可以嵌进 JSON 字符串的形式 */
function escapeText(s) {
  return JSON.stringify(s).slice(1, -1)
}

/** 去转义：把 JSON 字符串字面量还原 */
function unescapeText(s) {
  // JSON.parse('"' + s + '"') 里如果 s 本身带未转义的引号会解析失败，
  // 这里捕获后给出人话提示
  try {
    return JSON.parse(`"${s}"`)
  } catch {
    throw new Error(
      '去转义失败：内容里有未转义的引号。如果是整段 JSON，请改用「格式化」而不是「去转义」'
    )
  }
}

/* ---------------- 主逻辑 ---------------- */

function run() {
  error.value = null
  parsedOk.value = false
  parsed.value = null

  const src = state.input
  if (!src.trim()) {
    output.value = ''
    return
  }

  // 转义 / 去转义是对文本本身做处理，不要求输入是合法 JSON
  if (state.action === 'escape' || state.action === 'unescape') {
    try {
      const text = state.action === 'escape' ? escapeText(src) : unescapeText(src)
      output.value = text
      // 去转义的结果如果恰好是合法 JSON，顺便让树视图也能用
      if (state.action === 'unescape') {
        try {
          parsed.value = JSON.parse(text)
          parsedOk.value = true
        } catch {
          /* 不是 JSON 也没关系，文本视图正常显示 */
        }
      }
    } catch (e) {
      output.value = ''
      error.value = { message: e.message, line: null, col: null, index: null }
    }
    return
  }

  // 格式化和压缩要先解析
  let data
  try {
    data = JSON.parse(src)
  } catch (e) {
    output.value = ''
    error.value = describeParseError(e, src)
    return
  }

  if (state.sortKeys) data = sortKeysDeep(data)

  parsed.value = data
  parsedOk.value = true

  const indent = INDENT_MAP[state.indent]
  output.value =
    state.action === 'minify' ? JSON.stringify(data) : JSON.stringify(data, null, indent)
}

watch(state, run, { immediate: true })

/* ---------------- 展示辅助 ---------------- */

const nodeCount = computed(() => (parsedOk.value ? countNodes(parsed.value) : 0))

// 数据量大时默认折叠，避免一次性渲染上万个 DOM 节点把页面卡死
const treeDefaultOpen = computed(() => nodeCount.value < 200)

const tooLargeForTree = computed(() => nodeCount.value > 20000)

const stats = computed(() => {
  if (!state.input.trim()) return []
  const items = [
    { label: '输入', value: `${state.input.length} 字符` },
    { label: '输出', value: `${output.value.length} 字符` },
  ]
  if (parsedOk.value && state.action !== 'escape' && state.action !== 'unescape') {
    items.push({ label: '节点数', value: String(nodeCount.value) })
  }
  if (state.input.length && output.value.length) {
    const saved = state.input.length - output.value.length
    if (Math.abs(saved) > 0) {
      items.push({
        label: saved > 0 ? '减少' : '增加',
        value: `${Math.abs(saved)} 字符`,
      })
    }
  }
  return items
})

const excerpt = computed(() =>
  error.value?.index != null ? excerptAround(state.input, error.value.index) : null
)

const reveal = ref(null)

function jumpToError() {
  if (error.value?.index == null) return
  // 每次传新对象，TextAreaField 里的 watch 才会触发
  reveal.value = { start: error.value.index, end: error.value.index + 1 }
}
</script>

<template>
  <ToolPanel title="JSON 格式化" desc="格式化 / 压缩 / 树形查看 / 转义 · 错误精确定位">
    <template #actions>
      <button class="plain-btn" @click="reset">清空</button>
    </template>

    <TextAreaField
      v-model="state.input"
      label="输入 JSON"
      placeholder='粘贴 JSON，例如 {"name": "AIToolsWeb", "tools": 6}'
      :rows="10"
      :reveal="reveal"
    >
      <template #toolbar>
        <CopyButton :text="state.input" />
      </template>
    </TextAreaField>

    <OptionBar divider>
      <SegmentedControl
        v-model="state.action"
        :options="[
          { value: 'format', label: '格式化', title: '加上缩进，便于阅读' },
          { value: 'minify', label: '压缩', title: '去掉所有多余空白' },
          { value: 'escape', label: '转义', title: '转成可以嵌进 JSON 字符串的形式' },
          { value: 'unescape', label: '去转义', title: '把转义序列还原' },
        ]"
      />

      <SegmentedControl
        v-if="state.action === 'format'"
        v-model="state.indent"
        label="缩进"
        :options="[
          { value: '2', label: '2 空格' },
          { value: '4', label: '4 空格' },
          { value: 'tab', label: 'Tab' },
        ]"
      />

      <ToggleSwitch
        v-if="state.action === 'format' || state.action === 'minify'"
        v-model="state.sortKeys"
        label="键排序"
        hint="递归按字母序排列所有对象的 key，用于对比两个结构相同但顺序不同的 JSON"
      />

      <SegmentedControl
        v-if="parsedOk && state.action !== 'escape' && state.action !== 'unescape'"
        v-model="state.view"
        label="视图"
        :options="[
          { value: 'text', label: '文本' },
          { value: 'tree', label: '树形' },
        ]"
      />
    </OptionBar>

    <!-- ---------------- 错误 ---------------- -->

    <ErrorBanner
      v-if="error"
      :message="
        error.line != null
          ? `第 ${error.line} 行第 ${error.col} 列：${error.message}`
          : error.message
      "
    >
      <template v-if="error.index != null" #actions>
        <button class="plain-btn" @click="jumpToError">跳到错误位置</button>
      </template>
    </ErrorBanner>

    <pre v-if="excerpt" class="excerpt" aria-label="错误位置附近的原文"><code>{{ excerpt.text }}</code><span class="caret-line">{{ ' '.repeat(excerpt.caretOffset) }}^</span></pre>

    <!-- ---------------- 输出 ---------------- -->

    <template v-if="state.view === 'tree' && parsedOk">
      <div class="tree-head">
        <span class="ctl-label strong">树形视图</span>
        <span class="field-note">{{ nodeCount }} 个节点，点击箭头折叠展开</span>
      </div>

      <ErrorBanner
        v-if="tooLargeForTree"
        tone="warn"
        message="数据节点超过 2 万个，树形视图可能很卡"
        detail="建议切换到文本视图查看"
      />

      <div class="tree-box">
        <JsonTree :data="parsed" :default-open="treeDefaultOpen" />
      </div>
    </template>

    <TextAreaField
      v-else
      :model-value="output"
      label="结果"
      placeholder="结果会显示在这里"
      :rows="10"
      readonly
    >
      <template #toolbar>
        <CopyButton :text="output" />
      </template>
    </TextAreaField>

    <StatusBar v-if="stats.length" :items="stats" />
  </ToolPanel>
</template>

<style scoped>
.excerpt {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background-color: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  overflow-x: auto;
  white-space: pre;
  color: var(--fg-muted);
}

.excerpt code {
  font-family: inherit;
}

.caret-line {
  display: block;
  color: var(--danger);
  font-weight: bold;
}

.tree-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

/* 不加底色：块内部每行都有 --bg-hover 悬停色，底色若也是浅灰会看不出来。
   靠 1px 边框在白色卡片上圈出范围就够了。 */
.tree-box {
  padding: var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 60vh;
  overflow: auto;
}
</style>
