import { ref, computed, watchEffect } from 'vue'

/**
 * 主题状态机（三态）
 *
 *   'auto'  —— 跟随系统偏好，系统切夜间模式时页面实时跟着变（默认）
 *   'light' —— 用户显式指定浅色
 *   'dark'  —— 用户显式指定深色
 *
 * 为什么要有 'auto' 这一态：如果只做浅/深两态，用户点过一次之后就永远
 * 回不到"跟随系统"了，只能去手动清 localStorage。多一个状态只多几行代码，
 * 但体验是完整的。
 *
 * ⚠️ 本文件的 KEY 与三态语义必须与 index.html 里那段防闪白内联脚本完全一致。
 *    改这里就必须同步改那边，反之亦然。
 */

const KEY = 'aitw:theme'

const media = window.matchMedia('(prefers-color-scheme: dark)')

// 模块级单例：所有组件共享同一份状态。
// 初始值直接从 DOM 属性读回来 —— index.html 的内联脚本在首帧之前就已经
// 把判定结果写进去了，读回来能保证两处逻辑不会算出不同结果。
const mode = ref(
  document.documentElement.getAttribute('data-theme-mode') || 'auto'
)

const systemDark = ref(media.matches)

// 监听系统偏好变化。只有 mode === 'auto' 时才会真正影响外观
media.addEventListener('change', (e) => {
  systemDark.value = e.matches
})

/** 当前实际生效的外观：'light' | 'dark' */
const resolved = computed(() =>
  mode.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : mode.value
)

watchEffect(() => {
  const el = document.documentElement
  el.setAttribute('data-theme', resolved.value)
  el.setAttribute('data-theme-mode', mode.value)
  try {
    localStorage.setItem(KEY, mode.value)
  } catch {
    // Safari 无痕模式下 localStorage 会抛异常，静默忽略
  }
})

export function useTheme() {
  /** 循环切换：自动 → 浅色 → 深色 → 自动 */
  function cycle() {
    mode.value =
      mode.value === 'auto' ? 'light' : mode.value === 'light' ? 'dark' : 'auto'
  }

  return { mode, resolved, cycle }
}
