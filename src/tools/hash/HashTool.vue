<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import ToolPanel from '@/components/ui/ToolPanel.vue'
import TextAreaField from '@/components/ui/TextAreaField.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import OptionBar from '@/components/ui/OptionBar.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import DataTable from '@/components/ui/DataTable.vue'
import FilePicker from '@/components/ui/FilePicker.vue'
import StatusBar from '@/components/ui/StatusBar.vue'
import { useToolState } from '@/composables/useToolState'
import {
  isSupported,
  digestAll,
  digest,
  normalizeNewlines,
  countCRLF,
  readFileBuffer,
  formatSize,
} from './hash'

const supported = ref(true)
onMounted(() => {
  supported.value = isSupported()
})

const { state, reset } = useToolState('hash', {
  input: '',
  normalize: false,
  source: 'text', // 'text' | 'file'
})

const rows = ref([])
const error = ref('')
const busy = ref(false)

/* ---------------- 文本哈希 ---------------- */

// 加个序号做竞态保护：用户连续打字时会有多个异步任务在飞，
// 只有最后一次的结果可以写进 rows，否则慢的那次会覆盖快的那次
let runId = 0

async function run() {
  error.value = ''

  if (!supported.value) {
    error.value = '当前环境不支持 Web Crypto。'
    return
  }

  if (!state.input) {
    rows.value = []
    return
  }

  const id = ++runId
  busy.value = true

  try {
    const { text } = state.normalize
      ? normalizeNewlines(state.input)
      : { text: state.input }

    const bytes = new TextEncoder().encode(text)
    const results = await digestAll(bytes)

    if (id !== runId) return // 已经有更新的任务在跑了，丢弃这次结果

    rows.value = results.map((r) => ({ algo: r.algo, hex: r.hex, len: r.hex.length * 4 }))
  } catch (e) {
    if (id === runId) error.value = e.message || '计算失败'
  } finally {
    if (id === runId) busy.value = false
  }
}

watch(state, run, { immediate: true })

const crlfCount = computed(() => countCRLF(state.input))

const columns = [
  { key: 'algo', label: '算法', width: '110px' },
  { key: 'hex', label: '摘要（十六进制）', mono: true },
  { key: 'len', label: '位数', width: '80px' },
]

/* ---------------- 文件哈希 ---------------- */

const fileInfo = ref(null)
const fileRows = ref([])
const fileBusy = ref(false)

async function onFile(file) {
  error.value = ''
  fileBusy.value = true
  fileRows.value = []
  fileInfo.value = null

  try {
    const buf = await readFileBuffer(file)
    const results = await Promise.all(
      ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map(async (algo) => ({
        algo,
        hex: await digest(buf, algo),
      }))
    )
    fileInfo.value = { name: file.name, size: file.size }
    fileRows.value = results.map((r) => ({
      algo: r.algo,
      hex: r.hex,
      len: r.hex.length * 4,
    }))
  } catch (e) {
    error.value = e.message || '读取文件失败'
  } finally {
    fileBusy.value = false
  }
}
</script>

<template>
  <ToolPanel title="哈希计算" desc="SHA-1 / SHA-256 / SHA-384 / SHA-512 · 文本与文件">
    <template #actions>
      <button class="plain-btn" @click="reset">清空</button>
    </template>

    <ErrorBanner
      v-if="!supported"
      message="当前环境不支持 Web Crypto，哈希功能不可用"
      detail="浏览器只在安全上下文（https:// 或 localhost）下提供 crypto.subtle。如果你是用局域网 IP（http://192.168.x.x）打开的页面，换成 localhost 或部署后的 https 地址即可。"
    />

    <template v-else>
      <SegmentedControl
        v-model="state.source"
        :options="[
          { value: 'text', label: '文本', title: '对一段文本计算哈希' },
          { value: 'file', label: '文件', title: '对一个文件计算哈希' },
        ]"
      />

      <!-- ---------------- 文本 ---------------- -->

      <template v-if="state.source === 'text'">
        <TextAreaField
          v-model="state.input"
          label="输入文本"
          placeholder="粘贴要计算哈希的内容"
          :rows="8"
        >
          <template #toolbar>
            <CopyButton :text="state.input" />
          </template>
        </TextAreaField>

        <OptionBar divider>
          <ToggleSwitch
            v-model="state.normalize"
            label="把换行统一成 LF"
            hint="Windows 的 \r\n 和 Unix 的 \n 算出的哈希完全不同。从记事本或 Excel 复制的内容常常是 \r\n"
          />
          <span v-if="crlfCount > 0" class="field-note warn">
            检测到 {{ crlfCount }} 处 CRLF（\r\n）
          </span>
        </OptionBar>

        <DataTable
          :columns="columns"
          :rows="rows"
          :empty-text="busy ? '计算中…' : '输入内容后自动计算'"
          row-actions
        >
          <template #row-actions="{ row }">
            <CopyButton :text="row.hex" label="复制" />
          </template>
        </DataTable>
      </template>

      <!-- ---------------- 文件 ---------------- -->

      <template v-else>
        <FilePicker
          :max-size-mb="200"
          hint="文件不会上传，整个计算在浏览器里完成。超过 200 MB 会占用较多内存"
          @select="onFile"
          @error="error = $event"
        />

        <StatusBar
          v-if="fileInfo"
          :items="[
            { label: '文件名', value: fileInfo.name },
            { label: '大小', value: formatSize(fileInfo.size) },
          ]"
        />

        <DataTable
          :columns="columns"
          :rows="fileRows"
          :empty-text="fileBusy ? '计算中…' : '选择一个文件后自动计算'"
          row-actions
        >
          <template #row-actions="{ row }">
            <CopyButton :text="row.hex" label="复制" />
          </template>
        </DataTable>
      </template>

      <ErrorBanner v-if="error" :message="error" />
    </template>
  </ToolPanel>
</template>

