import { reactive, watch, onScopeDispose } from 'vue'
import { loadJSON, saveJSON } from '@/utils/storage'

/**
 * 工具输入状态，自动同步到 localStorage
 *
 * 用法（在任意工具的 <script setup> 里）：
 *
 *   const { state, reset } = useToolState('json', {
 *     input: '',
 *     indent: '2',
 *     sortKeys: false,
 *   })
 *   // 模板里直接用 state.input / state.indent
 *
 * 行为：
 *   - 首次进入用 defaults；之后进入自动恢复上次的内容
 *   - 输入停止 400ms 后写盘（防抖）
 *   - 切换工具离开时立即补写一次
 *
 * @param {string} toolId 工具 id，与 registry 里的 id 一致
 * @param {object} defaults 默认值。**只有这里声明过的键才会被持久化和恢复**
 */
export function useToolState(toolId, defaults) {
  const key = `tool:${toolId}`
  const state = reactive({ ...defaults })

  // 只恢复 defaults 里声明过的键。
  // 为什么不直接 Object.assign：将来把 indent 改名成 indentSize 时，
  // 老用户的 localStorage 里还留着 indent，无脑合并会往响应式对象里塞一个幽灵字段。
  const saved = loadJSON(key, null)
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(defaults)) {
      if (k in saved) state[k] = saved[k]
    }
  }

  let timer = null

  function flush() {
    clearTimeout(timer)
    timer = null
    saveJSON(key, { ...state })
  }

  const stop = watch(
    state,
    () => {
      clearTimeout(timer)
      timer = setTimeout(flush, 400)
    },
    { deep: true }
  )

  onScopeDispose(() => {
    // 用户打完字 200ms 内就切走了工具，防抖还没触发，这里补一次写盘，
    // 否则这次的改动就丢了
    stop()
    flush()
  })

  /** 恢复到默认值（工具页的「清空」按钮用） */
  function reset() {
    Object.assign(state, defaults)
  }

  return { state, flush, reset }
}
