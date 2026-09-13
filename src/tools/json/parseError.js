/**
 * 从 JSON.parse 抛出的错误里提取位置信息
 *
 * 各家浏览器的报错格式完全不一样，而且 V8 自己这几年也改过：
 *
 *   Chrome / Edge（新）: Unexpected token '}' (line 3 column 5)
 *   Chrome / Edge（旧）: Unexpected token } in JSON at position 42
 *   Firefox:             JSON.parse: unexpected character at line 3 column 5 of the JSON data
 *   Safari:              JSON Parse error: Unexpected identifier "x"   ← 没有位置信息
 *
 * 所以只能挨个格式试，试不出来就老实说"无法定位"。
 */

const RE_LINE_COL = /line\s+(\d+)\s+column\s+(\d+)/i
const RE_POSITION = /position\s+(\d+)/i

/**
 * 把「第几行第几列」换算成字符下标
 */
export function lineColToIndex(text, line, col) {
  const lines = text.split('\n')
  let index = 0
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    index += lines[i].length + 1 // +1 是那个被 split 掉的换行符
  }
  return index + (col - 1)
}

/**
 * 把字符下标换算成「第几行第几列」
 */
export function indexToLineCol(text, index) {
  const before = text.slice(0, Math.max(0, index))
  const lines = before.split('\n')
  return { line: lines.length, col: lines[lines.length - 1].length + 1 }
}

/**
 * @param {Error} err JSON.parse 抛出的错误
 * @param {string} source 原始输入文本，用来把 position 换算成行列
 * @returns {{ message: string, line: number|null, col: number|null, index: number|null }}
 */
export function describeParseError(err, source) {
  const raw = String(err.message || err)

  // 1. 直接带 line/column 的（新版 V8、Firefox）
  const m1 = raw.match(RE_LINE_COL)
  if (m1) {
    const line = Number(m1[1])
    const col = Number(m1[2])
    return {
      message: cleanMessage(raw),
      line,
      col,
      index: lineColToIndex(source, line, col),
    }
  }

  // 2. 只有字符偏移的（旧版 V8）
  const m2 = raw.match(RE_POSITION)
  if (m2) {
    const index = Number(m2[1])
    const { line, col } = indexToLineCol(source, index)
    return { message: cleanMessage(raw), line, col, index }
  }

  // 3. 什么位置信息都没有（Safari）
  return { message: cleanMessage(raw), line: null, col: null, index: null }
}

/**
 * 把各家冗长的前缀去掉，只留核心描述
 */
function cleanMessage(raw) {
  return raw
    .replace(/^JSON\.parse:\s*/i, '')
    .replace(/^JSON Parse error:\s*/i, '')
    .replace(/\s+of the JSON data\s*$/i, '')
    .trim()
}

/**
 * 把错误位置附近的文本摘出来，让用户一眼看到问题在哪
 *
 * @returns {{ text: string, caretOffset: number } | null}
 */
export function excerptAround(source, index, radius = 40) {
  if (index == null || index < 0 || index > source.length) return null
  const start = Math.max(0, index - radius)
  const end = Math.min(source.length, index + radius)
  const text = source.slice(start, end)
  return {
    text,
    caretOffset: index - start,
    truncatedStart: start > 0,
    truncatedEnd: end < source.length,
  }
}
