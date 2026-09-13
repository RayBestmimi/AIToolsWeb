<script setup>
import { ref, computed, watch } from 'vue'
import ToolPanel from '@/components/ui/ToolPanel.vue'
import TextAreaField from '@/components/ui/TextAreaField.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import OptionBar from '@/components/ui/OptionBar.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import DataTable from '@/components/ui/DataTable.vue'
import { useToolState } from '@/composables/useToolState'
import { safeDecode, parseQuery, indexToLineCol, PERCENT_TABLE } from './urlCodec'

const { state, reset } = useToolState('url', {
  input: '',
  direction: 'decode', // 'decode' | 'encode'
  scope: 'component', // 'component' | 'full'  —— 对应 encodeURIComponent / encodeURI
  plusAsSpace: true,
  showTable: true,
})

/* ---------------- 主转换 ---------------- */

const output = ref('')
const error = ref(null)
const errorIndex = ref(null)
const reveal = ref(null)

function run() {
  error.value = null
  errorIndex.value = null
  reveal.value = null

  const src = state.input
  if (!src) {
    output.value = ''
    return
  }

  try {
    if (state.direction === 'encode') {
      // encodeURI 保留 :/?#[]@ 等结构字符，encodeURIComponent 把它们全部转义。
      // 这是用户最容易用错的地方，所以两个都给，并在界面上写清用途。
      output.value =
        state.scope === 'component' ? encodeURIComponent(src) : encodeURI(src)
    } else {
      output.value = safeDecode(src, state.plusAsSpace)
    }
  } catch (e) {
    output.value = ''
    error.value = e.message
    errorIndex.value = typeof e.index === 'number' ? e.index : null
  }
}

watch(state, run, { immediate: true })

function jumpToError() {
  if (errorIndex.value == null) return
  // 每次传新对象，TextAreaField 里的 watch 才会触发
  reveal.value = { start: errorIndex.value, end: errorIndex.value + 3 }
}

/* ---------------- Query 参数表 ---------------- */

const queryPairs = computed(() => {
  if (!state.showTable) return []
  // 编码模式下把已编码的结果解析回来看，用户能直观看到自己编出了什么
  const source = state.direction === 'decode' ? state.input : output.value
  if (!source) return []
  return parseQuery(source, state.plusAsSpace)
})

const queryRows = computed(() =>
  queryPairs.value.map((p) => ({
    no: `#${p.index + 1}`,
    key: p.key,
    value: p.value,
    encodedKey: encodeURIComponent(p.key),
    encodedValue: encodeURIComponent(p.value),
  }))
)

const queryColumns = [
  { key: 'no', label: '#', width: '48px' },
  { key: 'key', label: '参数名', mono: true },
  { key: 'value', label: '参数值', mono: true },
  { key: 'encodedValue', label: '编码后的值', mono: true },
]

const hasDuplicateKeys = computed(() => {
  const seen = new Set()
  for (const p of queryPairs.value) {
    if (seen.has(p.key)) return true
    seen.add(p.key)
  }
  return false
})

/* ---------------- 其它 ---------------- */

const scopeHint = computed(() =>
  state.scope === 'component'
    ? '编码单个参数值：:/?#&=+ 这些字符都会被转义'
    : '编码整条 URL：保留 :/?#&= 等结构字符，只转义空格和中文等'
)
</script>

<template>
  <ToolPanel title="URL 编解码" desc="URI 编解码 · Query 参数解析成表格 · 非法编码定位">
    <template #actions>
      <button class="plain-btn" @click="reset">清空</button>
    </template>

    <TextAreaField
      v-model="state.input"
      label="输入"
      placeholder="粘贴需要编解码的内容，或一整条带参数的 URL"
      :rows="7"
      :reveal="reveal"
    >
      <template #toolbar>
        <CopyButton :text="state.input" />
      </template>
    </TextAreaField>

    <OptionBar divider>
      <SegmentedControl
        v-model="state.direction"
        :options="[
          { value: 'decode', label: '解码', title: '把 %E4%B8%AD 还原成中文' },
          { value: 'encode', label: '编码', title: '把中文编成 %E4%B8%AD' },
        ]"
      />

      <SegmentedControl
        v-if="state.direction === 'encode'"
        v-model="state.scope"
        label="范围"
        :options="[
          { value: 'component', label: '参数值', title: 'encodeURIComponent' },
          { value: 'full', label: '整条 URL', title: 'encodeURI' },
        ]"
      />

      <ToggleSwitch
        v-model="state.plusAsSpace"
        label="把 + 当作空格"
        hint="query string 规范里 + 表示空格，但 decodeURIComponent 按字面加号处理。默认按 query 规范"
      />

      <ToggleSwitch v-model="state.showTable" label="解析参数表" />
    </OptionBar>

    <p class="scope-note">{{ scopeHint }}</p>

    <ErrorBanner v-if="error" :message="error">
      <template v-if="errorIndex !== null" #actions>
        <button class="plain-btn" @click="jumpToError">跳到错误位置</button>
      </template>
    </ErrorBanner>

    <TextAreaField
      :model-value="output"
      label="结果"
      placeholder="结果会显示在这里"
      :rows="7"
      readonly
    >
      <template #toolbar>
        <CopyButton :text="output" />
      </template>
    </TextAreaField>

    <template v-if="state.showTable && queryPairs.length">
      <div class="table-head">
        <h2 class="table-title">Query 参数（{{ queryPairs.length }} 个）</h2>
        <p v-if="hasDuplicateKeys" class="dup-note">
          存在重名参数，用 # 序号区分 —— 这是用对象存参数会丢数据的原因
        </p>
      </div>

      <DataTable :columns="queryColumns" :rows="queryRows" row-actions>
        <template #row-actions="{ row }">
          <CopyButton :text="row.value" label="复制值" />
        </template>
      </DataTable>
    </template>

    <details class="cheatsheet">
      <summary>常见字符的转义对照</summary>
      <table class="data-table">
        <thead>
          <tr>
            <th>字符</th>
            <th>编码结果</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in PERCENT_TABLE" :key="row.char">
            <td class="cell-mono">{{ row.char }}</td>
            <td class="cell-mono">{{ row.encoded }}</td>
            <td>{{ row.note }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </ToolPanel>
</template>

<style scoped>
.scope-note {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  margin-top: calc(-1 * var(--sp-2));
}

.table-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-bottom: var(--sp-2);
}

.table-title {
  font-size: var(--fs-md);
}

.dup-note {
  font-size: var(--fs-xs);
  color: var(--warn);
}

.cheatsheet {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-elev);
  padding: var(--sp-3);
}

.cheatsheet summary {
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--fg-muted);
}

.cheatsheet[open] summary {
  margin-bottom: var(--sp-3);
}

.plain-btn {
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--bg-elev);
  color: var(--fg-muted);
  font-size: var(--fs-xs);
}

.plain-btn:hover {
  background-color: var(--bg-hover);
  color: var(--fg);
}
</style>
