<script setup>
import { ref, computed, watch } from 'vue'
import ToolPanel from '@/components/ui/ToolPanel.vue'
import TextAreaField from '@/components/ui/TextAreaField.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import OptionBar from '@/components/ui/OptionBar.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import FilePicker from '@/components/ui/FilePicker.vue'
import StatusBar from '@/components/ui/StatusBar.vue'
import { useToolState } from '@/composables/useToolState'
import {
  encodeBase64,
  decodeBase64,
  looksUrlSafe,
  fileToDataUrl,
  formatSize,
} from './base64'

const { state, reset } = useToolState('base64', {
  input: '',
  mode: 'encode', // 'encode' | 'decode'
  urlSafe: false,
})

const output = ref('')
const error = ref(null)
const errorDetail = ref('')

/* ---------------- 文本编解码 ---------------- */

function run() {
  error.value = ''
  errorDetail.value = ''

  if (!state.input) {
    output.value = ''
    return
  }

  try {
    output.value =
      state.mode === 'encode'
        ? encodeBase64(state.input, state.urlSafe)
        : decodeBase64(state.input, state.urlSafe)
  } catch (e) {
    output.value = ''
    error.value = e.message
    if (e.isBinary) {
      errorDetail.value =
        '如果原始内容确实是二进制文件，请改用下面的「图片转 Base64」功能，或用支持二进制的工具查看'
    }
  }
}

watch(state, run, { immediate: true })

// 解码模式下，如果输入看起来是 URL-safe 变体而用户没勾，主动提醒一下
const urlSafeHint = computed(() => {
  if (state.mode !== 'decode' || state.urlSafe || !state.input) return ''
  return looksUrlSafe(state.input)
    ? '输入里含 - 或 _，看起来是 URL-safe 变体，可能需要勾选上面的选项'
    : ''
})

/* ---------------- 图片 / 文件转 Base64 ---------------- */

const fileResult = ref(null)
const fileError = ref('')

async function onFile(file) {
  fileError.value = ''
  try {
    fileResult.value = await fileToDataUrl(file)
  } catch (e) {
    fileError.value = e.message
    fileResult.value = null
  }
}

// Base64 会让数据膨胀约 1.37 倍（每 3 字节变 4 个字符），
// 再加上中间过程的二进制字符串，实际内存占用是原文件的 2-3 倍。
// 明确把这个数字摆出来，用户才知道为什么大图要谨慎
const inflation = computed(() => {
  if (!fileResult.value) return ''
  const ratio = (fileResult.value.base64.length / fileResult.value.size).toFixed(2)
  return `${formatSize(fileResult.value.size)} → ${formatSize(fileResult.value.base64.length)}（${ratio} 倍）`
})

const textStats = computed(() => {
  if (!state.input) return []
  const items = [{ label: '输入', value: `${state.input.length} 字符` }]
  if (output.value) items.push({ label: '输出', value: `${output.value.length} 字符` })
  return items
})

function clearFile() {
  fileResult.value = null
  fileError.value = ''
}
</script>

<template>
  <ToolPanel title="Base64 编解码" desc="UTF-8 中文安全 · URL-safe 变体 · 图片转 Base64">
    <template #actions>
      <button class="plain-btn" @click="reset">清空</button>
    </template>

    <TextAreaField
      v-model="state.input"
      :label="state.mode === 'encode' ? '原文' : 'Base64 内容'"
      :placeholder="
        state.mode === 'encode'
          ? '输入要编码的文本，中文和 emoji 都能正确处理'
          : '粘贴 Base64 内容，换行和空格会被自动忽略'
      "
      :rows="6"
    >
      <template #toolbar>
        <CopyButton :text="state.input" />
      </template>
    </TextAreaField>

    <OptionBar divider>
      <SegmentedControl
        v-model="state.mode"
        :options="[
          { value: 'encode', label: '编码', title: '文本 → Base64' },
          { value: 'decode', label: '解码', title: 'Base64 → 文本' },
        ]"
      />
      <ToggleSwitch
        v-model="state.urlSafe"
        label="URL-safe 变体"
        hint="把 +/ 换成 -_ 并去掉末尾的 = 填充，可以安全地放进 URL 和文件名"
      />
    </OptionBar>

    <p v-if="urlSafeHint" class="hint">{{ urlSafeHint }}</p>

    <ErrorBanner v-if="error" :message="error" :detail="errorDetail" />

    <TextAreaField
      :model-value="output"
      label="结果"
      placeholder="结果会显示在这里"
      :rows="6"
      readonly
    >
      <template #toolbar>
        <CopyButton :text="output" />
      </template>
    </TextAreaField>

    <StatusBar v-if="textStats.length" :items="textStats" />

    <!-- ---------------- 图片 / 文件 ---------------- -->

    <section class="file-section">
      <h2 class="section-title">图片 / 文件转 Base64</h2>

      <FilePicker
        v-if="!fileResult"
        accept="image/*,.txt,.json,.pdf"
        :max-size-mb="10"
        hint="图片会转成可直接放进 &lt;img src&gt; 的 Data URL，上限 10 MB"
        @select="onFile"
        @error="fileError = $event"
      />

      <ErrorBanner v-if="fileError" :message="fileError" />

      <template v-if="fileResult">
        <StatusBar
          :items="[
            { label: '类型', value: fileResult.mime },
            { label: '体积', value: inflation },
          ]"
        />

        <img
          v-if="fileResult.mime.startsWith('image/')"
          class="preview"
          :src="fileResult.dataUrl"
          alt="预览"
        />

        <TextAreaField
          :model-value="fileResult.base64"
          label="Base64（不含 data: 前缀）"
          :rows="5"
          readonly
        >
          <template #toolbar>
            <CopyButton :text="fileResult.base64" label="复制纯 Base64" />
            <CopyButton :text="fileResult.dataUrl" label="复制 Data URL" />
            <button class="plain-btn" @click="clearFile">清除</button>
          </template>
        </TextAreaField>

        <TextAreaField
          :model-value="`data:${fileResult.mime};base64,${fileResult.base64}`"
          label="Data URL（可直接用于 img / background-image）"
          :rows="3"
          readonly
        />
      </template>
    </section>
  </ToolPanel>
</template>

<style scoped>
.file-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-2);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--border);
}

.section-title {
  font-size: var(--fs-md);
}

.preview {
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-sunken);
  align-self: flex-start;
}

.hint {
  font-size: var(--fs-xs);
  color: var(--warn);
  margin-top: calc(-1 * var(--sp-2));
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
