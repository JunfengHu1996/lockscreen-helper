/**
 * 应用常量定义
 */

// 模式常量
export const MODES = {
  COUNTDOWN: 'countdown',
  SCHEDULE: 'schedule'
}

// 时间限制常量
export const TIME_LIMITS = {
  MIN: 1,
  MAX: 86400, // 24小时 = 86400秒
  DEFAULT: 300 // 默认5分钟
}

// 结果显示时间（毫秒）
export const RESULT_DISPLAY_TIME = 3000

// 状态类型
export const STATUS_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error'
}