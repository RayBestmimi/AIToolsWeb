import { ref, computed, watch, watchEffect } from 'vue'

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
 *
 * 另一个耦合点：下面用的 THEME_CLASS 与 base.css 里的过渡规则配套，
 * 改名要两处一起改。内联脚本不需要知道这个类 —— 它从不加类，所以首帧永远无过渡。
 */

const KEY = 'aitw:theme'

/** 切主题时临时挂在 <html> 上的类，base.css 靠它开一个过渡窗口 */
const THEME_CLASS = 'theme-transition'

/** 过渡窗口时长。必须 ≥ CSS 里的 --transition-theme(200ms)，留 20ms 余量 */
const THEME_MS = 220

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)')

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

let transitionTimer = null

/**
 * 外观写入 + 过渡窗口
 *
 * 为什么拆成两个 watch 而不是一个 watchEffect：
 * 过渡窗口必须在"外观真的变了"时才开。watchEffect 不告诉你上一个值是什么，
 * 首次运行也会触发一次 —— 那次是页面初始渲染，绝不能带过渡。
 * watch 拿得到 (next, prev)，用 prev === undefined 就能精确排除首次。
 */
watch(
  resolved,
  (next, prev) => {
    const root = document.documentElement

    if (prev !== undefined && next !== prev && !REDUCE.matches) {
      root.classList.add(THEME_CLASS)
      clearTimeout(transitionTimer)
      transitionTimer = setTimeout(
        () => root.classList.remove(THEME_CLASS),
        THEME_MS
      )
    }

    root.setAttribute('data-theme', next)
  },
  { immediate: true }
)

/** 与外观无关的写入：用户的选择、以及持久化 */
watchEffect(() => {
  const root = document.documentElement
  root.setAttribute('data-theme-mode', mode.value)
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
