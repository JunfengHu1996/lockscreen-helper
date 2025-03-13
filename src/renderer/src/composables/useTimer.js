import { ref } from 'vue'

export function useTimer(options = { isScheduleMode: false }) {
  const isRunning = ref(false)
  const countdown = ref(0)
  const timeValue = ref(null)
  const isScheduled = ref(false)
  const scheduleTime = ref('')
  
  let timer = null
  
  const startTimer = (duration) => {
    if (isRunning.value) return
    
    isRunning.value = true
    countdown.value = duration
    
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        stopTimer()
      }
    }, 1000)
  }
  
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isRunning.value = false
    countdown.value = 0
  }
  
  const startSchedule = (duration) => {
    if (isScheduled.value) return
    
    isScheduled.value = true
    timer = setTimeout(() => {
      isScheduled.value = false
      scheduleTime.value = ''
    }, duration)
  }
  
  const cancelSchedule = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    isScheduled.value = false
    scheduleTime.value = ''
    timeValue.value = new Date()
  }
  
  const formatTime = (date) => {
    if (!date) return ''
    
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  
  // 清理函数
  const cleanup = () => {
    if (timer) {
      if (options.isScheduleMode) {
        clearTimeout(timer)
      } else {
        clearInterval(timer)
      }
      timer = null
    }
  }
  
  return {
    isRunning,
    countdown,
    timeValue,
    isScheduled,
    scheduleTime,
    startTimer,
    stopTimer,
    startSchedule,
    cancelSchedule,
    formatTime,
    cleanup
  }
}