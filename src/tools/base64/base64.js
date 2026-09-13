/**
 * Base64 编解码
 *
 * 浏览器原生的 btoa / atob 只处理 Latin-1（每字符一字节），
 * 直接塞中文会抛 InvalidCharacterError。所以正确做法是：
 *   字符串 --TextEncoder--> 字节 --binary string--> btoa
 * 反过来同理，并且解码时要用 fatal 模式把非 UTF-8 的二进制内容识别出来。
 */

/**
 * 字节数组转 binary string
 *
 * ⚠️ 必须分块。String.fromCharCode(...arr) 的实参个数有上限
 *   （各引擎约 6–12 万），一次性展开几十万字节会抛
 *   RangeError: Maximum call stack size exceeded。
 *   这不是性能优化，是不分块就会崩。
 */
function bytesToBinary(bytes) {
  const CHUNK = 0x8000 // 32768，远低于各引擎上限，且是常见的安全值
  let out = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return out
}

function binaryToBytes(bin) {
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** 转成 URL-safe 变体：+/ 换成 -_，去掉末尾的 = 填充 */
export function toUrlSafe(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** URL-safe 变体还原成标准 Base64 */
export function fromUrlSafe(b64) {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/')
  // 补回被去掉的 = 填充，长度必须是 4 的倍数
  const pad = s.length % 4
  if (pad === 2) s += '=='
  else if (pad === 3) s += '='
  else if (pad === 1) throw new Error('Base64 长度不合法（不可能是 4n+1 个字符），输入可能被截断了')
  return s
}

/**
 * 文本 → Base64
 * @param {string} text
 * @param {boolean} urlSafe 是否输出 URL-safe 变体
 */
export function encodeBase64(text, urlSafe = false) {
  if (text === '') return ''
  const bytes = new TextEncoder().encode(text)
  const b64 = btoa(bytesToBinary(bytes))
  return urlSafe ? toUrlSafe(b64) : b64
}

/**
 * Base64 → 文本
 *
 * @param {string} b64
 * @param {boolean} urlSafe 输入是否为 URL-safe 变体
 * @throws {Error} 输入不是合法 Base64，或解码结果不是合法 UTF-8（即原始内容是二进制）
 */
export function decodeBase64(b64, urlSafe = false) {
  // atob 遇到换行、空格会直接抛错。PEM 格式和 `base64` 命令的输出都带换行，
  // 所以先剥掉所有空白字符，这是用户最常踩的一脚
  let s = b64.replace(/\s+/g, '')
  if (s === '') return ''

  if (urlSafe) s = fromUrlSafe(s)

  const pad = s.length % 4
  if (pad === 2) s += '=='
  else if (pad === 3) s += '='
  else if (pad === 1) throw new Error('Base64 长度不合法，输入可能被截断了')

  let bin
  try {
    bin = atob(s)
  } catch {
    throw new Error('不是合法的 Base64：包含字母表之外的字符（只允许 A-Z a-z 0-9 + / =）')
  }

  const bytes = binaryToBytes(bin)

  try {
    // fatal: true 让非 UTF-8 的字节序列抛错，而不是静默替换成 U+FFFD（�）。
    // 没有它，用户粘贴一段二进制内容的 Base64 会看到满屏乱码却不知道为什么。
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    const err = new Error(
      '解码成功，但结果不是合法的 UTF-8 文本 —— 原始内容很可能是二进制数据（图片、压缩包等）'
    )
    err.isBinary = true
    err.bytes = bytes
    throw err
  }
}

/** Base64 是否像 URL-safe 变体（含 - 或 _，且不含 + 和 /） */
export function looksUrlSafe(s) {
  return /[-_]/.test(s) && !/[+/]/.test(s)
}

/**
 * 文件 → Data URL
 * @returns {Promise<{ dataUrl: string, base64: string, size: number, mime: string }>}
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const comma = dataUrl.indexOf(',')
      resolve({
        dataUrl,
        base64: dataUrl.slice(comma + 1),
        size: file.size,
        mime: file.type || 'application/octet-stream',
      })
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

/** 人类可读的体积 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
