import { ref, onScopeDispose } from 'vue'

/**
 * 每秒更新的当前时间
 *
 * 时间戳工具要显示"实时当前时间戳"，就必须有个每秒 tick 的时钟。
 *
 * ⚠️ 定时器必须在组件卸载时清理。不清理的话，用户切到别的工具后
 *    定时器还在跑，ref 还在更新，页面会持续重渲染。
 *    onScopeDispose 在 <script setup> 里等价于 onUnmounted，但也能在
 *    普通 effectScope 里工作，适用面更广。
 */
export function useNow() {
  const now = ref(Date.now())

  const id = setInterval(() => {
    now.value = Date.now()
  }, 1000)

  onScopeDispose(() => clearInterval(id))

  return now
}
