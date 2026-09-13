import { diffArrays, diffWordsWithSpace } from 'diff'

/**
 * 文本对比引擎
 *
 * 用 jsdiff（`diff` 包）而不是自己实现：
 *
 *   朴素的 LCS 动态规划是 O(n×m) 的空间复杂度——两段各 5000 行的文本
 *   就是 2500 万个格子，浏览器会直接卡死。生产可用的实现需要 Myers
 *   O(ND) 算法，加上公共前后缀裁剪、大编辑距离时降级到直方图模式等优化。
 *   而且「忽略大小写 / 忽略空白」和行内词级高亮，它都已经有现成能力。
 *
 *   它是零依赖的纯 JS 库，gzip 后约 10 KB，2011 年维护至今，API 稳定。
 *   这是"引一个库"的最低风险形态。
 */

/**
 * 切成行
 *
 * ⚠️ 不能直接 text.split('\n')：'a\n' 会变成 ['a', '']，
 *    末尾凭空多出一个空行，diff 结果里就会多一行假的改动。
 */
export function splitLines(text) {
  if (text === '') return []
  return text.replace(/\n$/, '').split('\n')
}

/**
 * 计算差异
 *
 * @param {string} oldText
 * @param {string} newText
 * @param {{ ignoreCase?: boolean, ignoreWhitespace?: boolean }} options
 * @returns {{
 *   rows: Array<object>,
 *   stats: { added: number, removed: number, changed: number, same: number },
 *   truncated: boolean
 * }}
 */
export function buildDiff(oldText, newText, options = {}) {
  const { ignoreCase = false, ignoreWhitespace = false } = options

  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)

  // 规范化只用于「比较」，不用于显示。
  // jsdiff 的 comparator 语义是：两个 token 被判为相等时，
  // change.value 里保留的是**原始内容**，所以显示出来还是用户输入的原文。
  function normalize(line) {
    let v = line
    if (ignoreCase) v = v.toLowerCase()
    if (ignoreWhitespace) v = v.replace(/\s+/g, ' ').trim()
    return v
  }

  const changes = diffArrays(oldLines, newLines, {
    comparator: (a, b) => normalize(a) === normalize(b),
  })

  const rows = []
  const stats = { added: 0, removed: 0, changed: 0, same: 0 }

  let leftNo = 1
  let rightNo = 1
  let i = 0

  while (i < changes.length) {
    const c = changes[i]

    // ---- 没有变化的连续行 ----
    if (!c.added && !c.removed) {
      for (const line of c.value) {
        rows.push({
          type: 'same',
          leftNo: leftNo++,
          rightNo: rightNo++,
          left: line,
          right: line,
        })
        stats.same++
      }
      i++
      continue
    }

    // ---- 收集一块「删除」和紧随其后的一块「新增」 ----
    let removed = []
    let added = []
    if (c.removed) {
      removed = c.value
      i++
      if (i < changes.length && changes[i].added) {
        added = changes[i].value
        i++
      }
    } else {
      added = c.value
      i++
    }

    const pairCount = Math.min(removed.length, added.length)

    // ⚠️ 行内词级高亮只在两侧行数**完全相等**时才做。
    //    删了 1 行、加了 5 行的情况下硬配对，会产生完全错乱的标注。
    const doInline = removed.length > 0 && removed.length === added.length

    for (let k = 0; k < pairCount; k++) {
      let leftSegs = null
      let rightSegs = null

      if (doInline) {
        const parts = diffWordsWithSpace(removed[k], added[k])
        leftSegs = []
        rightSegs = []
        for (const p of parts) {
          if (p.added) {
            rightSegs.push({ text: p.value, changed: true })
          } else if (p.removed) {
            leftSegs.push({ text: p.value, changed: true })
          } else {
            leftSegs.push({ text: p.value, changed: false })
            rightSegs.push({ text: p.value, changed: false })
          }
        }
      }

      rows.push({
        type: 'change',
        leftNo: leftNo++,
        rightNo: rightNo++,
        left: removed[k],
        right: added[k],
        leftSegs,
        rightSegs,
      })
      stats.changed++
    }

    // 多出来的删除行
    for (let k = pairCount; k < removed.length; k++) {
      rows.push({
        type: 'del',
        leftNo: leftNo++,
        rightNo: null,
        left: removed[k],
        right: null,
      })
      stats.removed++
    }

    // 多出来的新增行
    for (let k = pairCount; k < added.length; k++) {
      rows.push({
        type: 'add',
        leftNo: null,
        rightNo: rightNo++,
        left: null,
        right: added[k],
      })
      stats.added++
    }
  }

  return { rows, stats, truncated: false }
}

/**
 * 大输入的性能保护
 *
 * jsdiff 用 Myers 算法，时间复杂度 O(N·D)（D 是编辑距离）。
 * 两段完全不同的超长文本会明显卡顿，所以超过阈值直接拒绝计算，
 * 让用户知道要拆开看，而不是让页面假装卡死。
 */
export const MAX_LINES = 20000

export function checkSize(oldText, newText) {
  const a = splitLines(oldText).length
  const b = splitLines(newText).length
  if (a > MAX_LINES || b > MAX_LINES) {
    return {
      ok: false,
      message: `两侧行数分别为 ${a} 和 ${b}，超过 ${MAX_LINES} 行上限`,
      detail: '对比算法在超大输入下会明显变慢。建议拆成几段分别对比，或先用其他方式筛出有差异的部分。',
    }
  }
  return { ok: true }
}
