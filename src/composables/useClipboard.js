import { ref } from 'vue'

/**
 * 复制到剪贴板
 *
 * navigator.clipboard 只在安全上下文（HTTPS 或 localhost）下存在。
 * 如果用 `npm run dev -- --host` 从局域网 IP 打开，它是 undefined，
 * 所以这里必须有降级路径，否则用户会收到一个看不懂的 TypeError。
 */
export function useClipboard() {
  const copied = ref(false)
  const failed = ref(false)
  let timer = null

  /**
   * 老式降级方案：造一个屏幕外的 textarea，选中，执行 copy 命令。
   * 在所有现代浏览器里都还能用，只是不推荐作为首选。
   */
  function fallbackCopy(text) {
    const ta = document.createElement('textarea')
    ta.value = text
    // 固定定位且移出视口，避免复制时页面跳动
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.setAttribute('readonly', '')
    document.body.appendChild(ta)
    try {
      ta.select()
      ta.setSelectionRange(0, text.length)
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      document.body.removeChild(ta)
    }
  }

  /**
   * @param {string} text 要复制的文本
   * @returns {Promise<boolean>} 是否成功
   */
  async function copy(text) {
    clearTimeout(timer)
    failed.value = false

    let ok = false
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        ok = true
      } catch {
        // 用户拒绝授权、或页面失焦 —— 退回老方案再试一次
        ok = fallbackCopy(text)
      }
    } else {
      ok = fallbackCopy(text)
    }

    if (ok) {
      copied.value = true
      timer = setTimeout(() => {
        copied.value = false
      }, 2000)
    } else {
      failed.value = true
      timer = setTimeout(() => {
        failed.value = false
      }, 2000)
    }
    return ok
  }

  return { copy, copied, failed }
}
