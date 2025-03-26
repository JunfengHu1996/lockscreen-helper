<template>
  <div class="last-lock-time" v-if="lastLockTime">
    <div class="time-display">
      <i class="el-icon-lock"></i>
      <span class="label">上次锁屏时间:</span>
      <span class="time-value">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import relativeTimePlugin from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTimePlugin)
dayjs.locale('zh-cn')

const lastLockTime = ref(null)
const formattedTime = ref('')

// 格式化时间显示
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const time = dayjs(timestamp)
  return time.format('YYYY-MM-DD HH:mm:ss')
}

// 监听锁屏结果
const updateLastLockTime = () => {
  window.api.on('lock-execution-result', (result) => {
    if (result.success) {
      lastLockTime.value = new Date().toISOString()
      formattedTime.value = formatTime(lastLockTime.value)
    }
  })
}

// 获取保存的最后锁屏时间
const getLastLockTime = () => {
  window.api.send('get-last-lock-time')
}

// 监听来自主进程的最后锁屏时间
const listenLastLockTime = () => {
  window.api.on('last-lock-time', (time) => {
    if (time) {
      lastLockTime.value = time
      formattedTime.value = formatTime(time)
    }
  })
}

// 定期更新显示的时间
const startTimeRefresh = () => {
  // 每秒更新一次显示的时间
  const intervalId = setInterval(() => {
    if (lastLockTime.value) {
      formattedTime.value = formatTime(lastLockTime.value)
    }
  }, 1000)

  // 组件卸载时清理定时器
  onUnmounted(() => {
    clearInterval(intervalId)
  })
}

onMounted(() => {
  updateLastLockTime()
  listenLastLockTime()
  getLastLockTime()
  startTimeRefresh()
})
</script>

<style scoped>
.last-lock-time {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: var(--spacing-sm) 0;
}

.time-display {
  color: var(--text-secondary);
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  transition: color 0.2s ease;
}

.time-display:hover {
  color: var(--text-primary);
}

.el-icon-lock {
  font-size: 0.9em;
  margin-right: 2px;
}

.label {
  font-weight: 500;
  color: var(--text-secondary);
}

.time-value {
  color: var(--text-primary);
}

@media (max-width: 480px) {
  .time-display {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .el-icon-lock {
    margin-right: 0;
    margin-bottom: 2px;
  }
}
</style>