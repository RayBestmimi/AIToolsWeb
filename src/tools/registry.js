/**
 * 工具注册表 —— 全站唯一的"工具清单"
 *
 * ===========================================================================
 * 新增一个工具的完整步骤：
 *
 *   1. 建目录 src/tools/<id>/，在里面写 <Id>Tool.vue（默认导出）
 *   2. 在下面的 tools 数组里追加一个对象
 *
 * 完成。路由、侧边栏、页面标题、localStorage 的 key 全部自动生效，
 * 不需要碰任何其他文件。
 * ===========================================================================
 *
 * 字段说明：
 *   id       {string} 必填。只允许 [a-z0-9-]，不要用中文。
 *                     路由是 /t/<id>，持久化 key 是 tool:<id>，都用它。
 *   name     {string} 必填。侧边栏显示名，也是页面标题。
 *   desc     {string} 必填。一句话说明这个工具干什么，显示在侧边栏 tooltip 和页面副标题
 *   group    {string} 必填。侧边栏分组标题，同名会归到一组（顺序按首次出现）
 *   keywords {string} 空格分隔的搜索关键词，中英文都放，供以后做搜索用
 *   icon     {string} 24×24 viewBox 的 SVG path 的 d 属性，描边风格
 *   load     {Function} 懒加载函数。写成 () => import(...) 让每个工具
 *                       单独打包，首屏只下载用到的那个
 */
export const tools = [
  {
    id: 'json',
    name: 'JSON 格式化',
    desc: '格式化 / 压缩 / 树形查看 / 转义',
    group: '编码与格式',
    keywords: 'json 格式化 format minify 压缩 美化 tree 树 转义 escape 解析 parse',
    icon: 'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1',
    load: () => import('./json/JsonTool.vue'),
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    desc: 'UTF-8 中文安全 / URL-safe 变体 / 图片转 Base64',
    group: '编码与格式',
    keywords: 'base64 编码 解码 encode decode 图片 image dataurl utf8 中文 url safe',
    icon: 'M4 9h12l-3-3M20 15H8l3 3',
    load: () => import('./base64/Base64Tool.vue'),
  },
  {
    id: 'url',
    name: 'URL 编解码',
    desc: 'URI 编解码 / Query 参数解析成表格',
    group: '编码与格式',
    keywords: 'url uri 编码 解码 encode decode query 参数 转义 百分号 percent',
    icon: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
    load: () => import('./url/UrlTool.vue'),
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    desc: '实时时间戳 / 秒毫秒互转 / 多时区 / 多格式',
    group: '计算与校验',
    keywords: 'timestamp unix 时间 日期 时区 timezone 秒 毫秒 date time 转换',
    icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3.5 2',
    load: () => import('./timestamp/TimestampTool.vue'),
  },
  {
    id: 'hash',
    name: '哈希计算',
    desc: 'SHA-1 / 256 / 384 / 512，文本与文件',
    group: '计算与校验',
    keywords: 'hash sha256 sha1 sha512 sha384 摘要 校验 checksum 指纹 digest 文件',
    icon: 'M9 3 7 21M17 3l-2 18M4 9h16M3 15h16',
    load: () => import('./hash/HashTool.vue'),
  },
  {
    id: 'diff',
    name: '文本对比',
    desc: '逐行 diff 高亮 / 忽略大小写与空白',
    group: '文本处理',
    keywords: 'diff 对比 比较 差异 compare 文本 合并 merge',
    icon: 'M12 3v18M8 7 4 11l4 4M16 7l4 4-4 4',
    load: () => import('./diff/DiffTool.vue'),
  },
]

// ---------------------------------------------------------------------------
// 以下均为自动派生，新增工具时不需要改动
// ---------------------------------------------------------------------------

/** id → 工具对象，O(1) 查找（路由守卫、设置页面标题时用） */
export const toolById = new Map(tools.map((t) => [t.id, t]))

/** 按 group 分组，保持声明顺序，供侧边栏渲染 */
export const toolGroups = (() => {
  const map = new Map()
  for (const t of tools) {
    if (!map.has(t.group)) map.set(t.group, [])
    map.get(t.group).push(t)
  }
  return [...map].map(([name, items]) => ({ name, items }))
})()

/** 打开站点时默认进入哪个工具 */
export const defaultToolId = tools[0].id
