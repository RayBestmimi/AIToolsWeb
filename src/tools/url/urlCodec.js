/**
 * URL 编解码的纯函数
 *
 * 这里集中处理几个容易搞错的语义问题，UI 层只管调用。
 */

/**
 * 找出第一个非法的百分号编码
 *
 * decodeURIComponent 遇到 `%ZZ` 或残缺的 `%E4%BD` 会抛 URIError，
 * 但它的报错信息（"URI malformed"）完全没告诉你错在哪。
 * 自己扫一遍能给出精确位置。
 *
 * @returns {{index: number, text: string} | null} 位置从 0 开始
 */
export function findInvalidPercent(input) {
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== '%') continue
    const hex = input.slice(i + 1, i + 3)
    if (hex.length < 2 || !/^[0-9A-Fa-f]{2}$/.test(hex)) {
      return { index: i, text: input.slice(i, i + 3) }
    }
    i += 2 // 跳过这两个十六进制位，避免把 %25 里的 25 再当成新的 %
  }
  return null
}

/** 把位置换算成行列号，用于"跳到错误位置" */
export function indexToLineCol(input, index) {
  const before = input.slice(0, index)
  const lines = before.split('\n')
  return { line: lines.length, col: lines[lines.length - 1].length + 1 }
}

/**
 * 解码，失败时抛出带位置信息的错误
 */
export function safeDecode(input, usePlusAsSpace) {
  // decodeURIComponent 把 `+` 当字面加号，而 query string 规范里 `+` 表示空格。
  // 两种理解都有人用，所以做成开关，默认按 query 规范把 + 换成空格。
  const src = usePlusAsSpace ? input.replace(/\+/g, ' ') : input

  const bad = findInvalidPercent(src)
  if (bad) {
    const { line, col } = indexToLineCol(src, bad.index)
    const err = new Error(
      `第 ${line} 行第 ${col} 列处的 "${bad.text}" 不是合法的百分号编码，应该是 %XX 形式（XX 为两位十六进制）`
    )
    err.index = bad.index
    throw err
  }

  return decodeURIComponent(src)
}

/**
 * 解析 query 字符串成数组
 *
 * ⚠️ 返回数组而不是对象：`?a=1&a=2` 这种重复键用对象存会丢数据。
 *
 * @param {string} input 可以带开头的 ?，也可以只是 a=1&b=2
 * @returns {Array<{ key: string, value: string, index: number }>}
 */
export function parseQuery(input, usePlusAsSpace) {
  let s = input.trim()
  // 容忍用户整条 URL 粘进来，只取 ? 之后的部分
  const q = s.indexOf('?')
  if (q !== -1) s = s.slice(q + 1)
  // 去掉 hash 片段（它不属于 query）
  const h = s.indexOf('#')
  if (h !== -1) s = s.slice(0, h)
  if (!s) return []

  const decode = (str) => {
    try {
      return safeDecode(str, usePlusAsSpace)
    } catch {
      // 单个键值解不开时退回原文，不要因为一个坏参数让整张表都出不来
      return str
    }
  }

  return s
    .split('&')
    .filter(Boolean)
    .map((pair, i) => {
      const eq = pair.indexOf('=')
      const rawKey = eq === -1 ? pair : pair.slice(0, eq)
      const rawVal = eq === -1 ? '' : pair.slice(eq + 1)
      return {
        key: decode(rawKey),
        value: decode(rawVal),
        index: i, // 重复键靠它区分，表格里显示为 #1 #2
      }
    })
}

/** 把键值对数组还原成 query 字符串（编码模式用） */
export function buildQuery(pairs) {
  return pairs
    .map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

/** 常见字符在 encodeURIComponent 下的转义结果，供用户对照 */
export const PERCENT_TABLE = [
  { char: '空格', encoded: '%20', note: '在 query 里也常写作 +' },
  { char: '+', encoded: '%2B', note: '加号本身必须转义，否则会被当成空格' },
  { char: '&', encoded: '%26', note: '参数分隔符，出现在值里必须转义' },
  { char: '=', encoded: '%3D', note: '键值分隔符' },
  { char: '?', encoded: '%3F', note: 'query 起始符' },
  { char: '#', encoded: '%23', note: 'hash 起始符' },
  { char: '/', encoded: '%2F', note: '路径分隔符' },
  { char: '中', encoded: '%E4%B8%AD', note: '中文按 UTF-8 编成 3 字节' },
]
