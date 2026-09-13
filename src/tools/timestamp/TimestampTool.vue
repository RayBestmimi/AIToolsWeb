<script setup>
import { ref, computed, watch } from 'vue'
import ToolPanel from '@/components/ui/ToolPanel.vue'
import TextAreaField from '@/components/ui/TextAreaField.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import SelectField from '@/components/ui/SelectField.vue'
import OptionBar from '@/components/ui/OptionBar.vue'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import DataTable from '@/components/ui/DataTable.vue'
import StatusBar from '@/components/ui/StatusBar.vue'
import { useToolState } from '@/composables/useToolState'
import { useNow } from '@/composables/useNow'
import {
  supportedTimeZones,
  localTimeZone,
  COMMON_ZONES,
  parseTimestamp,
  guessUnit,
  parseDateInput,
  commonFormats,
  relativeTime,
  nowStamps,
  zoneOffsetMinutes,
  formatOffset,
} from './datetime'

const { state, reset } = useToolState('timestamp', {
  direction: 'stamp2date', // 'stamp2date' | 'date2stamp'
  stampInput: '',
  unit: 's', // 's' | 'ms'
  dateInput: '',
  zone: '',
  compareZones: [],
})

/* ---------------- 实时时钟 ---------------- */

const now = useNow()
const live = computed(() => nowStamps(now.value))

const liveRows = computed(() => [
  { label: '秒（10 位）', value: String(live.value.seconds) },
  { label: '毫秒（13 位）', value: String(live.value.millis) },
  { label: '微秒', value: String(live.value.micros) },
  { label: '当前时间', value: commonFormats(new Date(now.value), state.zone || localTimeZone())[0].value },
])

/* ---------------- 时区选项 ---------------- */

const zoneOptions = computed(() =>
  supportedTimeZones().map((z) => ({ value: z, label: z }))
)

const effectiveZone = computed(() => state.zone || localTimeZone())

const compareOptions = computed(() => {
  const all = new Set([...COMMON_ZONES, effectiveZone.value, ...supportedTimeZones()])
  return [...all].map((z) => ({ value: z, label: z }))
})

function addCompareZone(z) {
  if (!z || state.compareZones.includes(z)) return
  state.compareZones.push(z)
}

function removeCompareZone(z) {
  state.compareZones = state.compareZones.filter((x) => x !== z)
}

/* ---------------- 时间戳 → 时间 ---------------- */

const stampResult = ref(null)
const stampError = ref('')

function runStamp() {
  stampError.value = ''
  stampResult.value = null

  if (!state.stampInput.trim()) return

  const r = parseTimestamp(state.stampInput, state.unit)
  if (r.error) {
    stampError.value = r.error
    return
  }
  if (Number.isNaN(r.ms)) {
    stampError.value = '这个数值无法转换成有效日期'
    return
  }
  stampResult.value = new Date(r.ms)
}

// 输入位数和当前单位不符时给个提示——不自动改，只提醒
const unitHint = computed(() => {
  const s = state.stampInput.trim()
  if (!s || state.direction !== 'stamp2date') return ''
  const guessed = guessUnit(s)
  if (guessed === state.unit) return ''
  return `这串数字看起来是${guessed === 's' ? '秒' : '毫秒'}，但当前按${state.unit === 's' ? '秒' : '毫秒'}解析`
})

const formats = computed(() => {
  if (!stampResult.value) return []
  const base = commonFormats(stampResult.value, effectiveZone.value)
  return [
    ...base,
    {
      label: '相对现在',
      value: relativeTime(stampResult.value, now.value),
    },
  ]
})

const zoneRows = computed(() => {
  if (!stampResult.value) return []
  const zones = [effectiveZone.value, ...state.compareZones]
  return zones.map((z) => {
    const off = zoneOffsetMinutes(stampResult.value, z)
    return {
      zone: z === localTimeZone() ? `${z}（本地）` : z,
      offset: formatOffset(off),
      time: new Intl.DateTimeFormat('zh-CN', {
        timeZone: z,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'short',
      }).format(stampResult.value),
      stamp: String(Math.floor(stampResult.value.getTime() / 1000)),
    }
  })
})

const zoneColumns = [
  { key: 'zone', label: '时区' },
  { key: 'offset', label: '偏移', width: '80px', mono: true },
  { key: 'time', label: '时间' },
  { key: 'stamp', label: '秒级时间戳', mono: true },
]

/* ---------------- 时间 → 时间戳 ---------------- */

const dateResult = ref(null)
const dateError = ref('')

function runDate() {
  dateError.value = ''
  dateResult.value = null

  if (!state.dateInput.trim()) return

  const r = parseDateInput(state.dateInput)
  if (r.error) {
    dateError.value = r.error
    return
  }
  dateResult.value = new Date(r.ms)
}

const dateRows = computed(() => {
  if (!dateResult.value) return []
  const ms = dateResult.value.getTime()
  return [
    { label: '秒（10 位）', value: String(Math.floor(ms / 1000)) },
    { label: '毫秒（13 位）', value: String(ms) },
    { label: '微秒', value: String(ms * 1000) },
    { label: '解析为', value: commonFormats(dateResult.value, effectiveZone.value)[0].value },
    { label: '相对现在', value: relativeTime(dateResult.value, now.value) },
  ]
})

/* ---------------- 统一触发 ---------------- */

watch(
  () => [
    state.direction,
    state.stampInput,
    state.unit,
    state.dateInput,
    state.zone,
  ],
  () => {
    if (state.direction === 'stamp2date') runStamp()
    else runDate()
  },
  { immediate: true }
)

function useNowAsInput() {
  state.direction = 'stamp2date'
  if (state.unit === 's') state.stampInput = String(live.value.seconds)
  else state.stampInput = String(live.value.millis)
}
</script>

<template>
  <ToolPanel title="时间戳转换" desc="实时时间戳 · 秒毫秒互转 · 多时区 · 多格式输出">
    <template #actions>
      <button class="plain-btn" @click="reset">重置</button>
    </template>

    <!-- ---------------- 实时时钟 ---------------- -->

    <section class="live">
      <div v-for="row in liveRows" :key="row.label" class="live-item">
        <span class="live-label">{{ row.label }}</span>
        <span class="live-value mono">{{ row.value }}</span>
        <CopyButton :text="row.value" />
      </div>
    </section>

    <!-- ---------------- 转换区 ---------------- -->

    <OptionBar divider>
      <SegmentedControl
        v-model="state.direction"
        :options="[
          { value: 'stamp2date', label: '时间戳 → 时间', title: '输入一串数字，看它对应什么时间' },
          { value: 'date2stamp', label: '时间 → 时间戳', title: '输入日期文本，得到时间戳' },
        ]"
      />
      <SelectField v-model="state.zone" label="时区" :options="zoneOptions" />
      <button class="plain-btn" @click="useNowAsInput">用当前时间</button>
    </OptionBar>

    <!-- ---------------- 时间戳 → 时间 ---------------- -->

    <template v-if="state.direction === 'stamp2date'">
      <div class="input-row">
        <input
          v-model="state.stampInput"
          class="stamp-input mono"
          type="text"
          inputmode="numeric"
          placeholder="例如 1757000000 或 1757000000000"
          aria-label="时间戳"
        />
        <SegmentedControl
          v-model="state.unit"
          :options="[
            { value: 's', label: '秒' },
            { value: 'ms', label: '毫秒' },
          ]"
        />
      </div>

      <p v-if="unitHint" class="field-note warn">{{ unitHint }}</p>
      <ErrorBanner v-if="stampError" :message="stampError" />

      <template v-if="formats.length">
        <div class="kv-list">
          <div v-for="f in formats" :key="f.label" class="kv">
            <span class="kv-key">{{ f.label }}</span>
            <span class="kv-val">{{ f.value }}</span>
            <CopyButton :text="f.value" />
          </div>
        </div>

        <section class="zones">
          <div class="section-head">
            <h2 class="block-title">多时区对比</h2>
            <SelectField
              :model-value="''"
              :options="compareOptions"
              placeholder="添加时区…"
              label=""
              @update:model-value="addCompareZone"
            />
          </div>

          <div v-if="state.compareZones.length" class="chips">
            <button
              v-for="z in state.compareZones"
              :key="z"
              class="chip"
              @click="removeCompareZone(z)"
            >
              {{ z }} <span aria-hidden="true">×</span>
            </button>
          </div>

          <DataTable :columns="zoneColumns" :rows="zoneRows" />
        </section>
      </template>

      <p v-else-if="!state.stampInput" class="empty-hint">
        输入一个时间戳，下面会显示它对应的各种时间格式
      </p>
    </template>

    <!-- ---------------- 时间 → 时间戳 ---------------- -->

    <template v-else>
      <TextAreaField
        v-model="state.dateInput"
        label="日期文本"
        placeholder="例如 2026-09-13T21:06:00 或 2026-09-13T21:06:00+08:00 或 2026-09-13"
        :rows="4"
      />

      <ErrorBanner v-if="dateError" :message="dateError" />

      <StatusBar
        v-if="dateResult"
        :items="[
          { label: '秒', value: String(Math.floor(dateResult.getTime() / 1000)) },
          { label: '毫秒', value: String(dateResult.getTime()) },
        ]"
      />

      <div v-if="dateRows.length" class="kv-list">
        <div v-for="row in dateRows" :key="row.label" class="kv">
          <span class="kv-key">{{ row.label }}</span>
          <span class="kv-val">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </div>
    </template>
  </ToolPanel>
</template>

<style scoped>
/* ---------- 实时时钟 ---------- */

.live {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--sp-2);
}

.live-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background-color: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.live-label {
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  flex-shrink: 0;
  min-width: 82px;
}

.live-value {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 输入 ---------- */

.input-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.stamp-input {
  flex: 1;
  min-width: 240px;
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-md);
}

/* ---------- 输出 ---------- */

.kv-list {
  padding: var(--sp-1) var(--sp-3);
  background-color: var(--bg-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.zones {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-2);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.chip {
  padding: 2px var(--sp-2);
  background-color: var(--accent-bg);
  color: var(--accent);
  border-radius: var(--radius-full);
  font-size: var(--fs-xs);
}

.chip:hover {
  background-color: var(--accent-hover);
  color: var(--fg-on-accent);
}
</style>
