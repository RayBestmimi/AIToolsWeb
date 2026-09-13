<script setup>
import { ref } from 'vue'

/**
 * 文件选择 + 拖拽落区
 *
 * 注意 dragover / drop 必须 preventDefault，否则浏览器会直接打开文件。
 */
const props = defineProps({
  accept: { type: String, default: '' },
  maxSizeMB: { type: Number, default: 10 },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['select', 'error'])

const dragging = ref(false)
const inputEl = ref(null)

function handleFile(file) {
  if (!file) return
  if (file.size > props.maxSizeMB * 1024 * 1024) {
    emit('error', `文件 ${file.name} 有 ${formatSize(file.size)}，超过 ${props.maxSizeMB} MB 上限`)
    return
  }
  emit('select', file)
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  handleFile(file)
}

function onChange(e) {
  handleFile(e.target.files?.[0])
  // 清空 value，否则连续选同一个文件不会触发 change
  e.target.value = ''
}
</script>

<template>
  <div
    class="file-picker"
    :class="{ dragging }"
    role="button"
    tabindex="0"
    @click="inputEl.click()"
    @keydown.enter.prevent="inputEl.click()"
    @keydown.space.prevent="inputEl.click()"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="inputEl"
      class="native"
      type="file"
      :accept="accept"
      @change="onChange"
    />

    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <p class="main-text">点击选择文件，或把文件拖到这里</p>
    <p class="sub-text">
      {{ hint || (accept ? `支持 ${accept}` : '') }}
    </p>
  </div>
</template>

<style scoped>
.file-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-5);
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius);
  background-color: var(--bg-sunken);
  cursor: pointer;
  text-align: center;
  transition: border-color var(--transition), background-color var(--transition);
}

.file-picker:hover,
.file-picker.dragging {
  border-color: var(--accent);
  background-color: var(--accent-bg);
}

.native {
  display: none;
}

.icon {
  width: 26px;
  height: 26px;
  color: var(--fg-subtle);
  margin-bottom: var(--sp-1);
}

.main-text {
  font-size: var(--fs-sm);
  color: var(--fg);
}

.sub-text {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
}
</style>
