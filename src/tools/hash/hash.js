/**
 * 哈希计算
 *
 * 用浏览器原生的 crypto.subtle，不引任何第三方库：
 *   - 它是 C/C++ 实现，比纯 JS 库（crypto-js、js-sha256）快一个数量级
 *   - 少一个依赖，少一份将来要维护的东西
 *
 * 代价是它只在安全上下文（HTTPS 或 localhost）下存在，
 * 所以下面所有入口都要先能力检测。
 */

export const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

export const ALGO_LABELS = {
  'SHA-1': 'SHA-1',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512',
}

/** 能力检测。局域网 IP 访问 http:// 时 crypto.subtle 是 undefined */
export function isSupported() {
  return typeof crypto !== 'undefined' && !!crypto.subtle && !!crypto.subtle.digest
}

/**
 * 十六进制转换用查表法
 *
 * 不写 [...]map(b => b.toString(16).padStart(2,'0')).join('')：
 * 对几 MB 的输入，那样会产生几十万个临时字符串和一个大数组，
 * 明显拖慢且制造 GC 压力。
 */
const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

export function toHex(bytes) {
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += HEX[bytes[i]]
  return out
}

/**
 * 计算单个摘要
 * @param {ArrayBuffer|Uint8Array} data
 * @param {string} algorithm 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
 * @returns {Promise<string>} 小写十六进制
 */
export async function digest(data, algorithm) {
  const buf = await crypto.subtle.digest(algorithm, data)
  return toHex(new Uint8Array(buf))
}

/**
 * 一次算出全部 4 个算法
 *
 * 为什么要全算：用户往往记不清自己要的是哪个，
 * 并列摆出来比让他一个个点快得多。4 个算法的耗时可忽略。
 *
 * @returns {Promise<Array<{ algo: string, hex: string }>>}
 */
export async function digestAll(data) {
  const results = await Promise.all(
    ALGORITHMS.map(async (algo) => ({ algo, hex: await digest(data, algo) }))
  )
  return results
}

/**
 * 把 \r\n 归一化成 \n
 *
 * 为什么需要：Windows 记事本、Excel 导出的文本换行是 \r\n，
 * 而网页表单、Linux 服务器通常按 \n 处理。同一段文字两种换行算出的
 * SHA-256 完全不同，用户会以为文件被篡改了。
 *
 * @returns {{ text: string, count: number }} count 是替换掉了几处
 */
export function normalizeNewlines(text) {
  const matches = text.match(/\r\n/g)
  return { text: text.replace(/\r\n/g, '\n'), count: matches ? matches.length : 0 }
}

/**
 * 检测文本里有没有 \r\n（用于给用户提示，不实际修改）
 */
export function countCRLF(text) {
  const m = text.match(/\r\n/g)
  return m ? m.length : 0
}

/**
 * 读取文件的 ArrayBuffer
 */
export function readFileBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
