/**
 * localStorage 安全读写
 *
 * 为什么每个操作都要包 try/catch：
 * Safari 无痕模式下 localStorage.setItem 会 **直接抛异常**（不是静默失败）。
 * 不包的话整个应用会白屏，而且报错信息完全看不出跟存储有关。
 */

const PREFIX = 'aitw:'

/**
 * 单个工具的持久化体积上限。
 *
 * 为什么需要这个：localStorage 通常只有 5 MB 配额，而 Base64 工具里
 * 一张 3 MB 的图片转出来就是约 4 MB 的字符串，直接顶爆配额。
 * 超限时选择"不存"而不是"抛错"—— 用户下次进来看到空输入框，
 * 总比整个应用崩掉好。
 */
const MAX_BYTES = 256 * 1024

export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    // JSON 损坏 / localStorage 被禁用 / 无痕模式 —— 一律静默回退到默认值
    return fallback
  }
}

/**
 * @returns {boolean} 是否成功写入。返回 false 说明超限或被禁用，调用方可据此提示用户
 */
export function saveJSON(key, value) {
  try {
    const s = JSON.stringify(value)
    if (s.length > MAX_BYTES) {
      localStorage.removeItem(PREFIX + key)
      return false
    }
    localStorage.setItem(PREFIX + key, s)
    return true
  } catch {
    // QuotaExceededError / Safari 无痕模式 —— 静默吞掉
    return false
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* 忽略 */
  }
}

/** 列出本应用占用的所有 key（侧边栏的"清空本地数据"按钮用） */
export function listKeys() {
  try {
    const out = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) out.push(k)
    }
    return out
  } catch {
    return []
  }
}

/** 清空本应用写入的全部数据 */
export function clearAll() {
  for (const k of listKeys()) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* 忽略 */
    }
  }
}

/**
 * 估算本应用占用的字节数（UTF-16 下每个字符约 2 字节，这里按字符数粗估）
 */
export function usedBytes() {
  let total = 0
  try {
    for (const k of listKeys()) {
      total += (localStorage.getItem(k) || '').length
    }
  } catch {
    /* 忽略 */
  }
  return total
}
