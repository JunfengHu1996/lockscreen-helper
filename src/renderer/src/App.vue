<template>
    <div class="app-container">
    
        <page-header :title="title" />
    
        <main class="main-content">
    
            <div class="card" :class="{ 'card--expanded': isCountingDown || isScheduled }">
    
                <!-- 模式切换 -->
    
                <mode-tabs :current-mode="mode" :tabs="tabs" @change="handleModeChange" />
    
    
    
                <!-- 倒计时模式 -->
    
                <countdown-panel v-show="mode === 'countdown'" :time="lockTime" :is-counting="isCountingDown" :countdown="countdown" @start="startCountdownTimer" @cancel="cancelLockTimer" @update:time="lockTime = $event" />
    
    
    
                <!-- 定时模式 -->
    
                <schedule-panel v-show="mode === 'schedule'" :time-value="scheduleTimeValue" :is-scheduled="isScheduled" :formatted-time="formattedScheduleTime" :is-valid-time="isValidScheduleTime" @start="startScheduleTimer" @cancel="cancelLockTimer" @update:time-value="scheduleTimeValue = $event"
    
                />
    
    
    
                <!-- 操作结果提示 -->
    
                <div class="result-container">
    
                    <result-message v-if="lockResult" :type="lockResult.success ? 'success' : 'error'" :message="lockResult.message || (lockResult.success ? '屏幕已锁定' : '锁屏失败')" />
    
                </div>
    
            </div>
    
        </main>
    
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTimer } from './composables/useTimer'
import { MODES, TIME_LIMITS } from './constants'

// 组件导入
import PageHeader from './components/PageHeader.vue'
import ModeTabs from './components/ModeTabs.vue'
import CountdownPanel from './components/CountdownPanel.vue'
import SchedulePanel from './components/SchedulePanel.vue'
import ResultMessage from './components/ResultMessage.vue'

// ============ 状态定义 ============
const title = ref('倒计时锁屏')
const mode = ref(MODES.COUNTDOWN)
const lockTime = ref(300) // 默认设置为5分钟
const lockResult = ref(null)

// 倒计时状态
const {
    isRunning: isCountingDown,
    countdown,
    startTimer: startCountdown,
    stopTimer: stopCountdown
} = useTimer()

// 定时状态
const {
    timeValue: scheduleTimeValue,
    isRunning: isScheduled,
    startTimer: startSchedule,
    stopTimer: cancelSchedule,
    formatTime: formatScheduleTime
} = useTimer({ isScheduleMode: true })

// 计算属性：格式化的定时时间
const formattedScheduleTime = computed(() => {
    return formatScheduleTime(scheduleTimeValue.value)
})

// ============ 常量和计算属性 ============
const tabs = [
    { value: MODES.COUNTDOWN, label: '倒计时锁屏' },
    { value: MODES.SCHEDULE, label: '定时锁屏' }
]

// ============ 方法定义 ============
const handleModeChange = (newMode) => {
    if (mode.value === newMode) return

    // 切换前清理当前模式的状态
    clearCurrentMode()

    // 更新模式和标题
    mode.value = newMode
    title.value = newMode === MODES.COUNTDOWN ? '倒计时锁屏' : '定时锁屏'
}

const startCountdownTimer = () => {
    if (!isValidCountdownTime(lockTime.value) || isCountingDown.value) return

    startCountdown(lockTime.value)
    window.api.send('start-lock-timer', lockTime.value)
}

const startScheduleTimer = () => {
    if (!scheduleTimeValue.value || isScheduled.value) return

    const now = new Date()
    const targetDate = new Date(scheduleTimeValue.value)
    const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetDate.getHours(), targetDate.getMinutes(), 0, 0)

    const scheduleDuration = scheduleDate - now

    // 使用毫秒转换为秒
    const durationInSeconds = Math.floor(scheduleDuration / 1000)
    startSchedule(durationInSeconds)
    window.api.send('start-lock-timer', durationInSeconds)
}

// 新增：检查选择的时间是否有效
const isValidScheduleTime = computed(() => {
    if (!scheduleTimeValue.value) return false
    const now = new Date()
    const targetDate = new Date(scheduleTimeValue.value)
    const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetDate.getHours(), targetDate.getMinutes(), 0, 0)
    return scheduleDate > now
})

const cancelLockTimer = () => {
    if (mode.value === MODES.COUNTDOWN) {
        stopCountdown()
    } else {
        cancelSchedule()
    }
    window.api.send('cancel-lock-timer')
}

const clearCurrentMode = () => {
    cancelLockTimer()
}

const handleLockResult = (result) => {
    lockResult.value = result
    if (!result.success) {
        // 如果是错误消息，不清除当前模式
        scheduleTimeValue.value = new Date() // 重置为当前时间
    } else {
        clearCurrentMode()
    }

    // 3秒后清除结果提示
    setTimeout(() => {
        lockResult.value = null
    }, 3000)
}

// 新增：处理多次定时
const handleMultiSchedules = (schedules) => {
    window.api.send('set-multi-schedules', schedules)
}

// 在 onMounted 钩子中添加监听
onMounted(() => {
    // ... 其他代码

    // 监听多次定时设置
    window.api.on('set-multi-schedules', handleMultiSchedules)
})

// 在 onUnmounted 钩子中移除监听
onUnmounted(() => {
    // ... 其他代码

    // 移除多次定时设置监听
    window.api.off('set-multi-schedules', handleMultiSchedules)
})

// ============ 辅助函数 ============
const isValidCountdownTime = (time) => {
    return time >= TIME_LIMITS.MIN && time <= TIME_LIMITS.MAX
}

const calculateScheduleDuration = (timeValue) => {
    const targetDate = new Date(timeValue)
    const now = new Date()
    const scheduleDate = new Date()

    scheduleDate.setHours(targetDate.getHours(), targetDate.getMinutes(), 0, 0)

    if (scheduleDate <= now) {
        scheduleDate.setDate(scheduleDate.getDate() + 1)
    }

    return scheduleDate - now
}

// ============ 生命周期钩子 ============
onMounted(() => {
    // 初始化定时器时间为当前时间
    scheduleTimeValue.value = new Date()

    // 监听锁屏结果
    window.api.on('lock-screen-result', handleLockResult)
})

onUnmounted(() => {
    clearCurrentMode()
})
</script>

<style>
:root {
    /* 颜色变量 */
    --primary: #667eea;
    --primary-dark: #5a67d8;
    --secondary: #764ba2;
    --success: #48bb78;
    --error: #e53e3e;
    --text-primary: #2d3748;
    --text-secondary: #4a5568;
    --bg-gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    --bg-light: rgba(255, 255, 255, 0.95);
    /* 尺寸变量 */
    --spacing-xs: 0.5rem;
    --spacing-sm: 1rem;
    --spacing-md: 1.5rem;
    --spacing-lg: 2rem;
    --spacing-xl: 2.5rem;
    /* 圆角变量 */
    --radius-sm: 0.5rem;
    --radius-md: 0.75rem;
    --radius-lg: 1rem;
    /* 阴影变量 */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.15);
    /* 过渡变量 */
    --transition-fast: 0.2s ease;
    --transition-normal: 0.3s ease;
}

body,
html {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--bg-gradient);
    color: var(--text-primary);
}
</style>

<style scoped>
.app-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.main-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--spacing-xl) * 2) var(--spacing-md) var(--spacing-md);
}

.card {
    background: var(--bg-light);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    width: 100%;
    max-width: 580px;
    min-height: 300px;
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    transition: all var(--transition-normal);
    margin-top: var(--spacing-xl);
    overflow-y: auto;
}

.card--expanded {
    min-height: 500px;
}

.card>* {
    margin-bottom: var(--spacing-md);
}

.card>*:last-child {
    margin-bottom: 0;
}

.result-container {
    margin-top: auto;
    min-height: 60px;
    display: flex;
    align-items: flex-end;
}

@media (max-width: 480px) {
    .card {
        padding: var(--spacing-lg);
        margin: var(--spacing-md);
    }
    .main-content {
        padding: var(--spacing-xl) 0 0;
    }
}
</style>