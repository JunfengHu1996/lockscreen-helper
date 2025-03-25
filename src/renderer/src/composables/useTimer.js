import { ref } from 'vue'

export function useTimer(options = { isScheduleMode: false }) {
  const isRunning = ref(false)
  const countdown = ref(0)
  const timeValue = ref(null)
  
  let timer = null
  let endTime = null
  
  const startTimer = (duration) => {
    if (isRunning.value) return
    
    isRunning.value = true
    countdown.value = duration
    endTime = Date.now() + duration * 1000
    
    const updateCountdown = () => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      countdown.value = remaining
      
      if (remaining <= 0) {
        stopTimer()
      } else {
        requestAnimationFrame(updateCountdown)
      }
    }
    
    updateCountdown()
  }
  
  const stopTimer = () => {
    if (timer) {
      cancelAnimationFrame(timer)
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