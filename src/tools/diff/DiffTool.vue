<script setup>
import { ref, computed, watch, onScopeDispose } from 'vue'
import ToolPanel from '@/components/ui/ToolPanel.vue'
import TextAreaField from '@/components/ui/TextAreaField.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import OptionBar from '@/components/ui/OptionBar.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import StatusBar from '@/components/ui/StatusBar.vue'
import { useToolState } from '@/composables/useToolState'
import { buildDiff, checkSize, splitLines } from './diffEngine'

const { state, reset } = useToolState('diff', {
  left: '',
  right: '',
  ignoreCase: false,
  ignoreWhitespace: false,
  onlyChanges: false,
})

const rows = ref([])
const stats = ref({ added: 0, removed: 0, changed: 0, same: 0 })
const sizeError = ref(null)
const computing = ref(false)

/* ---------------------------------------------------------------------------
   防抖计算

   用户在 textarea 里连续打字，每敲一个字就重算一次 diff 会明显掉帧，
   所以等 250ms 没新输入再算。
   --------------------------------------------------------------------------- */

let timer = null

function computeNow() {
  const check = checkSize(state.left, state.right)
  if (!check.ok) {
    sizeError.value = check
    rows.value = []
    return
  }
  sizeError.value = null

  if (!state.left && !state.right) {
    rows.value = []
    stats.value = { added: 0, removed: 0, changed: 0, same: 0 }
    computing.value = false
    return
  }

  const result = buildDiff(state.left, state.right, {
    ignoreCase: state.ignoreCase,
    ignoreWhitespace: state.ignoreWhitespace,
  })
  rows.value = result.rows
  stats.value = result.stats
  computing.value = false
}

function scheduleCompute() {
  clearTimeout(timer)
  computing.value = true
  timer = setTimeout(computeNow, 250)
}

watch(
  () => [state.left, state.right, state.ignoreCase, state.ignoreWhitespace],
  scheduleCompute,
  { immediate: true }
)

onScopeDispose(() => clearTimeout(timer))

/* ---------------------------------------------------------------------------
   展示
   --------------------------------------------------------------------------- */

const visibleRows = computed(() =>
  state.onlyChanges ? rows.value.filter((r) => r.type !== 'same') : rows.value
)

const statItems = computed(() => {
  const s = stats.value
  return [
    { label: '新增', value: String(s.added) },
    { label: '删除', value: String(s.removed) },
    { label: '修改', value: String(s.changed) },
    { label: '未变', value: String(s.same) },
  ]
})

const identical = computed(
  () => rows.value.length > 0 && !stats.value.added && !stats.value.removed && !stats.value.changed
)

const lineCountText = computed(() => {
  const a = splitLines(state.left).length
  const b = splitLines(state.right).length
  return `${a} 行 / ${b} 行`
})

function swap() {
  const t = state.left
  state.left = state.right
  state.right = t
}

/**
 * 把当前可见的行拼成带行号和标记的纯文本，供复制按钮使用。
 *
 * ⚠️ 定义成函数而不是 computed，是为了让 CopyButton 延迟求值 ——
 *    几千行的 diff 每次重渲染都拼一遍字符串是纯浪费，点复制时再算就够了。
 *    传给 CopyButton 的 :text 要写 getDiffText（函数引用本身），
 *    不能写 () => getDiffText —— 模板里的箭头函数内部不会自动解包 computed。
 */
function getDiffText() {
  const pad = (n) => String(n ?? '').padStart(4, ' ')
  return visibleRows.value
    .map((r) => {
      const mark =
        r.type === 'add' ? '+' : r.type === 'del' ? '-' : r.type === 'change' ? '~' : ' '
      const body =
        r.type === 'add'
          ? (r.right ?? '')
          : r.type === 'del'
            ? (r.left ?? '')
            : r.type === 'change'
              ? `${r.left ?? ''} → ${r.right ?? ''}`
              : (r.left ?? '')
      return `${pad(r.leftNo)} ${pad(r.rightNo)} ${mark} ${body}`
    })
    .join('\n')
}
</script>

<template>
  <ToolPanel title="文本对比" desc="逐行 diff 高亮 · 行内词级差异 · 忽略大小写与空白">
    <template #actions>
      <CopyButton
        :text="getDiffText"
        label="复制差异"
        :disabled="!visibleRows.length"
      />
      <button class="plain-btn" @click="swap">交换左右</button>
      <button class="plain-btn" @click="reset">清空</button>
    </template>

    <div class="split">
      <TextAreaField
        v-model="state.left"
        label="原始文本"
        placeholder="粘贴旧版本"
        :rows="10"
      >
        <template #toolbar>
          <CopyButton :text="state.left" />
        </template>
      </TextAreaField>
      <TextAreaField
        v-model="state.right"
        label="对比文本"
        placeholder="粘贴新版本"
        :rows="10"
      >
        <template #toolbar>
          <CopyButton :text="state.right" />
        </template>
      </TextAreaField>
    </div>

    <OptionBar divider>
      <ToggleSwitch
        v-model="state.ignoreCase"
        label="忽略大小写"
        hint="ABC 和 abc 视为相同"
      />
      <ToggleSwitch
        v-model="state.ignoreWhitespace"
        label="忽略空白差异"
        hint="连续空格、行首行尾的空白差异不算改动"
      />
      <ToggleSwitch
        v-model="state.onlyChanges"
        label="只看差异"
        hint="隐藏没有变化的行"
      />
      <span class="line-count">{{ lineCountText }}</span>
    </OptionBar>

    <ErrorBanner v-if="sizeError" tone="warn" :message="sizeError.message" :detail="sizeError.detail" />

    <!-- ---------------- 结果 ---------------- -->

    <template v-if="!sizeError && (state.left || state.right)">
      <StatusBar :items="statItems" />

      <ErrorBanner
        v-if="identical"
        tone="ok"
        message="两侧内容完全一致，没有差异"
      />

      <div v-else class="diff-box">
        <table class="diff-table">
          <tbody>
            <tr v-for="(row, i) in visibleRows" :key="i" :class="`row-${row.type}`">
              <td class="gutter">{{ row.leftNo ?? '' }}</td>
              <td class="gutter">{{ row.rightNo ?? '' }}</td>
              <td class="marker" aria-hidden="true">
                {{ row.type === 'add' ? '+' : row.type === 'del' ? '−' : row.type === 'change' ? '~' : '' }}
              </td>

              <!--
                ⚠️ 行内高亮同样不能用 v-html。这里渲染成结构化的片段数组，
                   Vue 的 {{ }} 会自动转义，不会把用户内容当 HTML 执行。
              -->
              <td class="content" :class="{ 'cell-empty': row.left === null }">
                <template v-if="row.leftSegs">
                  <span
                    v-for="(seg, j) in row.leftSegs"
                    :key="j"
                    :class="{ hl: seg.changed }"
                  >{{ seg.text }}</span>
                </template>
                <template v-else>{{ row.left }}</template>
              </td>

              <td class="content right" :class="{ 'cell-empty': row.right === null }">
                <template v-if="row.rightSegs">
                  <span
                    v-for="(seg, j) in row.rightSegs"
                    :key="j"
                    :class="{ hl: seg.changed }"
                  >{{ seg.text }}</span>
                </template>
                <template v-else>{{ row.right }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="computing" class="computing">计算中…</p>
    </template>

    <p v-else-if="!sizeError" class="empty-hint">
      在左右两侧分别粘贴文本，下面会显示逐行差异
    </p>
  </ToolPanel>
</template>

<style scoped>
.line-count {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  font-family: var(--font-mono);
}

/* 不加底色：行本身带增删改的配色，底色若也是浅灰会互相干扰 */
.diff-box {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: auto;
  max-height: 60vh;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1.65;
  table-layout: fixed;
}

.diff-table td {
  padding: 0 var(--sp-2);
  vertical-align: top;
}

/* 行号列：定宽、右对齐、不可选中（复制内容时不该带上行号） */
.gutter {
  width: 44px;
  text-align: right;
  color: var(--diff-gutter);
  user-select: none;
  border-right: 1px solid var(--border);
}

.marker {
  width: 18px;
  text-align: center;
  user-select: none;
  color: var(--diff-gutter);
}

/* 固定列合计：行号 44×2 + 标记 18 = 106px，两栏内容各分一半 */
.content {
  width: calc(50% - 53px);
  white-space: pre-wrap;
  word-break: break-word;
  border-right: 1px solid var(--border);
}

.content.right {
  border-right: none;
}

.cell-empty {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    var(--bg-hover) 6px,
    var(--bg-hover) 12px
  );
}

/* ---------- 行状态配色 ---------- */

.row-add .content.right,
.row-add .gutter:nth-child(2) {
  background-color: var(--diff-add-bg);
}

.row-del .content,
.row-del .gutter:first-child {
  background-color: var(--diff-del-bg);
}

.row-add .marker {
  color: var(--diff-add-fg);
}

.row-del .marker {
  color: var(--diff-del-fg);
}

.row-change .content {
  background-color: var(--bg-hover);
}

.row-change .marker {
  color: var(--warn);
}

/* 行内的词级高亮，比整行底色更深一档 */
.content .hl {
  background-color: var(--diff-hl-bg);
  border-radius: 2px;
}

.row-del .content .hl {
  background-color: var(--diff-hl-del-bg);
}

.computing {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  text-align: right;
}
</style>
