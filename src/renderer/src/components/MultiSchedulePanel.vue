<template>
    <div class="multi-schedule-panel">
        <div class="time-picker-container">
            <el-time-picker v-model="newTimeValue" format="HH:mm" placeholder="选择时间" :clearable="false" :size="'default'" class="time-picker" />
            <button @click="addSchedule" class="add-button" :disabled="!isValidTime">
            添加
          </button>
        </div>
        <div v-if="schedules.length > 0" class="schedules-list">
            <div v-for="schedule in schedules" :key="schedule.id" class="schedule-item">
                <span class="schedule-time">{{ formatTime(schedule.time) }}</span>
                <button @click="removeSchedule(schedule.id)" class="remove-button">
              <i class="el-icon-delete"></i>
            </button>
            </div>
        </div>
        <div v-else class="no-schedules">
            暂无定时设置
        </div>
        <button @click="saveSchedules" :disabled="schedules.length === 0 || isSaving" class="action-button">
          {{ isSaving ? '保存中...' : '保存设置' }}
        </button>
        <div v-if="saveMessage" :class="['save-message', saveMessage.type]">
            {{ saveMessage.text }}
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElTimePicker } from 'element-plus'

const newTimeValue = ref(null)
const schedules = ref([])
const isSaving = ref(false)
const saveMessage = ref(null)

const isValidTime = computed(() => {
    if (!(newTimeValue.value instanceof Date) || isNaN(newTimeValue.value)) return false;
    const now = new Date();
    const selectedTime = new Date(newTimeValue.value);
    selectedTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    return selectedTime > now;
})

const addSchedule = () => {
    if (isValidTime.value) {
        const id = Date.now()
        schedules.value.push({
            id,
            time: newTimeValue.value
        })
        newTimeValue.value = null
    }
}

const removeSchedule = (id) => {
    schedules.value = schedules.value.filter(schedule => schedule.id !== id)
}

const formatTime = (date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const saveSchedules = () => {
    isSaving.value = true
    saveMessage.value = null
    // 发送多次定时设置到主进程
    window.api.send('set-multi-schedules', schedules.value.map(s => ({
        time: s.time.getTime() - Date.now(),
        id: s.id
    })))
    console.log('Schedules saved:', schedules.value)

    // 模拟异步操作
    setTimeout(() => {
        isSaving.value = false
        saveMessage.value = { type: 'success', text: '设置已保存' }
        // 3秒后清除消息
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
    }, 1000)
}

// 监听来自主进程的锁屏结果
window.api.on('lock-screen-result', (result) => {
    if (result.success) {
        saveMessage.value = { type: 'success', text: '锁屏成功' }
    } else {
        saveMessage.value = { type: 'error', text: `锁屏失败: ${result.error}` }
    }
    // 3秒后清除消息
    setTimeout(() => {
        saveMessage.value = null
    }, 3000)
})
</script>

<style scoped>
.multi-schedule-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.time-picker-container {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.time-picker {
    flex-grow: 1;
}

.add-button {
    padding: 0 var(--spacing-md);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary);
    background-color: white;
    border: 1px solid var(--primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-normal);
}

.add-button:hover:not(:disabled) {
    color: white;
    background-color: var(--primary);
}

.add-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.schedules-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-height: 200px;
    overflow-y: auto;
    padding: var(--spacing-sm);
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: var(--radius-sm);
}

.schedule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: white;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
}

.schedule-time {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
}

.remove-button {
    padding: 0.25rem;
    font-size: 0.875rem;
    color: var(--error);
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: var(--transition-normal);
}

.remove-button:hover {
    color: var(--error-dark);
}

.no-schedules {
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
    padding: var(--spacing-md);
}

.action-button {
    width: 100%;
    height: 40px;
    font-size: 1rem;
    font-weight: 600;
    background: var(--bg-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-normal);
    box-shadow: var(--shadow-sm);
    letter-spacing: 0.5px;
    margin-top: var(--spacing-sm);
}

.action-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.action-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Element Plus 样式覆盖 */

:deep(.el-input__wrapper) {
    background-color: rgba(255, 255, 255, 0.8) !important;
    border: 1px solid var(--primary) !important;
    box-shadow: var(--shadow-sm) !important;
    transition: var(--transition-normal);
    border-radius: var(--radius-sm);
}

:deep(.el-input__inner) {
    font-size: 1rem !important;
    color: var(--text-primary) !important;
    font-weight: 500 !important;
}

:deep(.el-input__inner::placeholder) {
    color: var(--text-secondary) !important;
    font-size: 0.875rem !important;
    font-weight: 400 !important;
    opacity: 0.7;
}

:deep(.el-input__wrapper:hover) {
    border-color: var(--primary-dark) !important;
}

:deep(.el-input__wrapper.is-focus) {
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2) !important;
}

.save-message {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    text-align: center;
}

.save-message.success {
    background-color: rgba(72, 187, 120, 0.1);
    color: #2f855a;
}

.save-message.error {
    background-color: rgba(229, 62, 62, 0.1);
    color: #c53030;
}
</style>