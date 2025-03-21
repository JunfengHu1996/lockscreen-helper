import { ref } from 'vue'

export function useTimer(options = { isScheduleMode: false }) {
  const isRunning = ref(false)
  const countdown = ref(0)
  const timeValue = ref(null)
  
  let timer = null
  
  const startTimer = (duration) => {
    if (isRunning.value) return
    
    isRunning.value = true
    countdown.value = duration
    
    const startTime = Date.now()
    timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
      countdown.value = duration - elapsedSeconds
      
      if (countdown.value <= 0) {
        stopTimer()
      }
    }, 100) // 更新频率提高到100ms，使显示更平滑
  }
  
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isRunning.value = false
    countdown.value = 0
    
    // 如果是定时模式，重置时间值为当前时间
    if (options.isScheduleMode) {
      timeValue.value = new Date()
    }
  }
  
  const formatTime = (date) => {
    if (!date) return ''
    
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  
  // 清理函数
  const cleanup = () => {
    stopTimer()
  }
  
  return {
    isRunning,
    countdown,
    timeValue,
    startTimer,
    stopTimer,
    formatTime,
    cleanup
  }
}