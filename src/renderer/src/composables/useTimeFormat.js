/**
 * 时间格式化组合函数
 */
export function useTimeFormat() {
  /**
   * 格式化秒数为分:秒格式
   * @param {number} seconds - 总秒数
   * @returns {string} - 格式化后的时间字符串 (MM:SS)
   */
  const formatSeconds = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }
  
  /**
   * 格式化日期对象为小时:分钟格式
   * @param {Date} date - 日期对象
   * @returns {string} - 格式化后的时间字符串 (HH:MM)
   */
  const formatTime = (date) => {
    if (!date) return ''
    
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  
  /**
   * 计算两个日期之间的差值（毫秒）
   * @param {Date} targetDate - 目标日期
   * @param {Date} [baseDate=new Date()] - 基准日期，默认为当前时间
   * @returns {number} - 差值（毫秒）
   */
  const getTimeDifference = (targetDate, baseDate = new Date()) => {
    return targetDate.getTime() - baseDate.getTime()
  }
  
  return {
    formatSeconds,
    formatTime,
    getTimeDifference
  }
}