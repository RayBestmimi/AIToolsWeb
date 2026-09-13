/**
 * 日期 / 时间戳处理
 *
 * 全部基于浏览器原生的 Intl，不引 dayjs / luxon。
 * 最大的好处：Intl 自带完整的 IANA 时区数据库，跟着浏览器更新，
 * 不用像 dayjs 那样装 timezone 插件再手动跟着 tzdata 升级。
 */

/* ---------------------------------------------------------------------------
   时区列表
   --------------------------------------------------------------------------- */

let cachedZones = null

/**
 * 获取支持的时区列表。
 * Intl.supportedValuesOf 从 Chrome 99 / Safari 15.4 / Firefox 93 起可用，
 * 更老的浏览器要有降级。
 */
export function supportedTimeZones() {
  if (cachedZones) return cachedZones
  try {
    cachedZones = Intl.supportedValuesOf('timeZone')
  } catch {
    cachedZones = [
      'UTC',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Europe/London',
      'Europe/Paris',
      'America/New_York',
      'America/Los_Angeles',
    ]
  }
  return cachedZones
}

/** 本地时区名，取不到就退回 UTC */
export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 常用时区，置顶显示，省得在下拉里翻 400 项 */
export const COMMON_ZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Paris',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
]

/**
 * 时区在某一时刻相对 UTC 的偏移（分钟）
 *
 * 做法：把同一时刻分别按 UTC 和按目标时区格式化，比较两者差。
 * 这是纯 Intl 的通用做法，能自动处理夏令时。
 */
export function zoneOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value])
  )
  // 注意 hour 在 hour12:false 下可能返回 "24"（表示午夜），要归一成 0
  const hour = parts.hour === '24' ? '00' : parts.hour
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second)
  )
  // 抹掉毫秒再比较，否则差里会混进毫秒
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

/** 格式化成 +08:00 / -05:00 这样的偏移字符串 */
export function formatOffset(minutes) {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

/** 某个时区此刻是不是夏令时 */
export function isDST(date, timeZone) {
  const jan = zoneOffsetMinutes(new Date(Date.UTC(date.getUTCFullYear(), 0, 1)), timeZone)
  const jul = zoneOffsetMinutes(new Date(Date.UTC(date.getUTCFullYear(), 6, 1)), timeZone)
  return zoneOffsetMinutes(date, timeZone) !== Math.min(jan, jul)
}

/* ---------------------------------------------------------------------------
   时间戳解析
   --------------------------------------------------------------------------- */

/**
 * 解析用户输入的时间戳
 *
 * 不靠位数猜单位 —— 位数只能用来设一个**默认值**，最终由用户显式选择。
 * 因为 10 位数字也可能是某个编号，13 位也可能是别的含义，猜错了很难发现。
 *
 * @param {string} raw
 * @param {'s'|'ms'} unit
 * @returns {{ ms: number } | { error: string }}
 */
export function parseTimestamp(raw, unit) {
  const s = raw.trim()
  if (!s) return { error: '' }

  // 允许负数（1970 年之前）和小数
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    return { error: '时间戳只能是数字（可以带负号和小数点）' }
  }

  const n = Number(s)
  if (!Number.isFinite(n)) return { error: '数值超出可表示范围' }

  const ms = unit === 's' ? n * 1000 : n

  // Date 的有效范围是 ±8.64e15 毫秒（约 ±27.5 万年）
  if (Math.abs(ms) > 8.64e15) {
    return { error: '超出 JavaScript 日期能表示的范围（约公元 ±27 万年）' }
  }

  return { ms }
}

/** 按位数猜一个默认单位。仅用于初始化 UI，不做实际转换依据 */
export function guessUnit(raw) {
  const s = raw.trim().replace(/^-/, '')
  if (!/^\d+$/.test(s)) return 'ms'
  return s.length <= 10 ? 's' : 'ms'
}

/* ---------------------------------------------------------------------------
   格式化
   --------------------------------------------------------------------------- */

function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}

/**
 * 转成带本地偏移的 ISO 8601
 *
 * ⚠️ Date.prototype.toISOString() 永远返回 UTC（带 Z 后缀），
 *    要输出 2026-09-13T21:06:00.000+08:00 这种带本地偏移的形式，
 *    只能自己拼字符串。
 */
export function toIsoWithOffset(date, timeZone) {
  const tz = timeZone || localTimeZone()
  const off = zoneOffsetMinutes(date, tz)
  const shifted = new Date(date.getTime() + off * 60000)
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}` +
    `.${pad(shifted.getUTCMilliseconds(), 3)}${formatOffset(off)}`
  )
}

/**
 * 在指定时区下格式化
 * @param {Date} date
 * @param {string} timeZone
 * @param {Intl.DateTimeFormatOptions} options
 * @param {string} locale
 */
export function formatInZone(date, timeZone, options, locale = 'zh-CN') {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date)
  } catch {
    return '—'
  }
}

/**
 * 生成一组常用格式
 *
 * 星期几和月份名走 Intl 而不是手写数组：
 * 手写 ['周日','周一',...] 是按本地时区算的，显示纽约时间时会错一天。
 */
export function commonFormats(date, timeZone) {
  const tz = timeZone || localTimeZone()
  const off = zoneOffsetMinutes(date, tz)

  return [
    {
      label: '本地时间',
      value: formatInZone(date, tz, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'short',
      }),
    },
    {
      label: 'ISO 8601（带偏移）',
      value: toIsoWithOffset(date, tz),
    },
    {
      label: 'UTC（ISO）',
      value: date.toISOString(),
    },
    {
      label: 'RFC 2822',
      value: formatInZone(
        date,
        tz,
        {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZoneName: 'short',
        },
        'en-US'
      ),
    },
    {
      label: 'UTC 字符串',
      value: date.toUTCString(),
    },
    {
      label: '日期',
      value: formatInZone(date, tz, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    },
    {
      label: '时间',
      value: formatInZone(date, tz, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    },
    {
      label: '时区偏移',
      value: `${formatOffset(off)}（${tz}${isDST(date, tz) ? '，夏令时' : ''}）`,
    },
  ]
}

/**
 * 相对时间："3 小时前"
 */
export function relativeTime(date, now = Date.now()) {
  const diffMs = date.getTime() - now
  const abs = Math.abs(diffMs)

  const units = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ]

  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') {
      return rtf.format(Math.round(diffMs / ms), unit)
    }
  }
  return '刚刚'
}

/**
 * 解析用户输入的日期字符串 → 时间戳
 *
 * 只支持能被 Date 原生解析的格式（ISO 8601 最可靠）。
 * 刻意不提供「某个时区的墙上时间 → UTC 时间戳」这种反查能力：
 * JS 没有直接 API，需要迭代逼近，复杂且容易出错，收益也低。
 *
 * @returns {{ ms: number } | { error: string }}
 */
export function parseDateInput(raw) {
  const s = raw.trim()
  if (!s) return { error: '' }

  const ms = Date.parse(s)
  if (Number.isNaN(ms)) {
    return {
      error: '无法识别这个日期格式，建议用 ISO 8601，例如 2026-09-13T21:06:00 或 2026-09-13T21:06:00+08:00',
    }
  }
  return { ms }
}

/** 当前时间戳的几种表示 */
export function nowStamps(now = Date.now()) {
  return {
    seconds: Math.floor(now / 1000),
    millis: now,
    micros: now * 1000,
    nanos: now * 1e6,
  }
}
