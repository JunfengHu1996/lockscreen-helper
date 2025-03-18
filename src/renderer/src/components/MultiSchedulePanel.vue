<template>
    <div class="multi-schedule-panel">
        <div class="time-picker-container">
            <div class="time-picker-row">
                <el-time-picker v-model="newTimeValue" format="HH:mm" placeholder="选择时间" :clearable="false" :size="'default'" class="time-picker" />
                <button @click="addSchedule" class="add-button">
    添加
</button>
            </div>
            <div class="daily-option">
                <el-checkbox v-model="isDaily" class="daily-checkbox">每天执行</el-checkbox>
            </div>
        </div>
        <div v-if="schedules.length > 0" class="schedules-list">
            <div v-for="schedule in schedules" :key="schedule.id" class="schedule-item">
    <span class="schedule-time">{{ formatTime(schedule) }}</span>
    <button @click="removeSchedule(schedule.id)" class="remove-button">
      删除
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElTimePicker } from 'element-plus'
import { MODES } from '../constants'

const newTimeValue = ref(null)
const schedules = ref([])
const isSaving = ref(false)
const saveMessage = ref(null)
const isDaily = ref(false)

const isValidTime = computed(() => {
    // 当没有选择时间时，返回false
    if (!newTimeValue.value) return false;
    
    // 检查是否是有效的日期对象
    if (!(newTimeValue.value instanceof Date) || isNaN(newTimeValue.value)) return false;
    
    // 如果是每天执行，则时间总是有效的
    if (isDaily.value) return true;
    
    // 否则检查是否是未来时间
    const now = new Date();
    const selectedTime = new Date(newTimeValue.value);
    selectedTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    return selectedTime > now;
})

const addSchedule = () => {
    if (!newTimeValue.value) {
        saveMessage.value = { type: 'error', text: '请先选择时间' }
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
        return
    }
    if (isValidTime.value) {
        const now = new Date();
        const selectedTime = new Date(newTimeValue.value);
        selectedTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (selectedTime <= now) {
            // 如果选择的时间小于或等于当前时间，将其设置为明天的同一时间
            selectedTime.setDate(selectedTime.getDate() + 1);
        }
        
        const id = Date.now()
        schedules.value.push({
            id,
            time: selectedTime,
            isDaily: isDaily.value // 添加是否每天执行的标记
        })
        newTimeValue.value = null
    }
}

const isFutureTime = (date) => {
    const now = new Date();
    return date > now;
}

const removeSchedule = (id) => {
    console.log('Removing schedule with id:', id)
    console.log('Before removal, schedules:', JSON.stringify(schedules.value))
    schedules.value = schedules.value.filter(schedule => schedule.id !== id)
    console.log('After removal, schedules:', JSON.stringify(schedules.value))
}

const formatTime = (schedule) => {
    const date = schedule.time;
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (schedule.isDaily) {
        return `每天 ${timeStr}`;
    } else {
        const now = new Date();
        const isToday = date.getDate() === now.getDate() && 
                       date.getMonth() === now.getMonth() && 
                       date.getFullYear() === now.getFullYear();
        return isToday ? `今天 ${timeStr}` : `明天 ${timeStr}`;
    }
}

const saveSchedules = () => {
    isSaving.value = true
    saveMessage.value = null

    const now = new Date();
    const validSchedules = schedules.value.filter(s => isFutureTime(s.time));

    if (validSchedules.length === 0) {
        isSaving.value = false
        saveMessage.value = { type: 'error', text: '没有有效的未来时间设置' }
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
        return
    }

    // 计算每个时间点到现在的毫秒数，并确保都是正数
    const schedulesToSend = validSchedules.map(s => {
        const timeUntilLock = s.time.getTime() - now.getTime();
        console.log(`时间设置：${formatTime(s)}, 剩余毫秒：${timeUntilLock}`);
        return {
            time: timeUntilLock > 0 ? timeUntilLock : 0,
            id: s.id,
            isDaily: s.isDaily, // 添加是否每天执行的标记
            scheduledTime: s.time // 保存原始的预定时间
        };
    }).filter(s => s.time > 0);

    if (schedulesToSend.length === 0) {
        isSaving.value = false
        saveMessage.value = { type: 'error', text: '没有有效的未来时间设置' }
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
        return
    }

    // 发送多次定时设置到主进程
    console.log('Sending schedules to main process:', schedulesToSend);
    // 确保scheduledTime是ISO字符串格式，方便在主进程中重新构造Date对象
    const schedulesToSendProcessed = schedulesToSend.map(s => ({
        ...s,
        scheduledTime: s.scheduledTime.toISOString() // 转换为ISO字符串
    }));
    window.api.send('set-multi-schedules', {
        schedules: schedulesToSendProcessed,
        mode: MODES.SCHEDULE
    });

    // 更新schedules，只保留有效的未来时间
    schedules.value = validSchedules;
}

// 监听来自主进程的锁屏结果
const handleLockScreenResult = (result) => {
    console.log('MultiSchedulePanel received lock-screen-result:', result);
    isSaving.value = false;
    
    // 只处理多次定时设置相关的消息
    if (result.fromMultiSchedule) {
        if (result.success) {
            saveMessage.value = { 
                type: 'success', 
                text: result.message || '定时设置已保存' 
            }
        } else {
            saveMessage.value = { 
                type: 'error', 
                text: result.error || '设置失败' 
            }
        }

        // 3秒后清除消息
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
    }
}

// 创建一个特定的取消监听器，用于处理锁屏执行结果
const handleLockExecutionResult = (result) => {
    console.log('MultiSchedulePanel received lock execution result:', result);
    
    // 只处理锁屏执行结果，不处理取消消息
    if (!result.error?.includes('用户已取消锁屏')) {
        if (result.success) {
            saveMessage.value = { 
                type: 'success', 
                text: '锁屏成功' 
            }
        } else {
            saveMessage.value = { 
                type: 'error', 
                text: `锁屏失败: ${result.error || '未知错误'}` 
            }
        }

        // 3秒后清除消息
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
    }
}

onMounted(() => {
    // 监听多次定时设置的结果
    window.api.on('multi-schedule-result', handleLockScreenResult)
    
    // 监听锁屏执行结果
    window.api.on('lock-execution-result', handleLockExecutionResult)
})

onUnmounted(() => {
    schedules.value = []
    newTimeValue.value = null
    clearTimeout(saveMessage.value?.timer)
})
</script>

<style scoped>
.multi-schedule-panel {
    padding: var(--spacing-md);
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
}

.time-picker-container {
    background: white;
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xs);
}

.schedules-list {
    gap: var(--spacing-xs);
    padding: 2px;
}

.schedule-item {
    transition: var(--transition-fast);
    border: 1px solid var(--border-subtle);
}

.schedule-item:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow-xs);
}

.buttons-container {
    display: flex;
    gap: var(--spacing-sm);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-subtle);
}

.save-message {
    animation: fadeInUp 0.4s ease-out;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.time-picker-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.time-picker {
    flex-grow: 1;
    height: 32px;  /* 统一高度 */
}

:deep(.el-input__wrapper) {
    height: 32px !important;  /* 确保时间选择器高度一致 */
    padding: 0 8px !important;
}

:deep(.el-input__inner) {
    height: 32px !important;
    line-height: 32px !important;
    font-size: 0.875rem !important; /* 调整时间选择器字体大小 */
}

:deep(.el-input__icon) {
    line-height: 32px !important; /* 调整图标垂直居中 */
}

.time-picker-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    height: 32px; /* 确保整行高度一致 */
}

.daily-option {
    display: flex;
    align-items: center;
    padding-left: 2px;
    margin-top: -2px;
}

.daily-checkbox {
    font-size: 0.9rem;
    color: var(--text-primary);
}

.add-button {
    background: var(--primary);
    color: white;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    border: none;
    font-size: 0.75rem; /* 稍微减小字体大小 */
    font-weight: 500;
    transition: var(--transition-fast);
    box-shadow: var(--shadow-xs);
    cursor: pointer;
    height: 32px;
    display: inline-flex; /* 改为 inline-flex */
    align-items: center;
    justify-content: center;
    white-space: nowrap; /* 防止文字换行 */
    min-width: 60px; /* 设置最小宽度 */
}

.add-button:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}

.add-button:active {
    transform: translateY(0);
    box-shadow: var(--shadow-xs);
}


.remove-button {
    color: var(--danger);
    border: 1px solid var(--danger-light);
}

.remove-button:hover {
    background: var(--danger-light);
}

.action-button {
    width: 100%;
    margin-top: var(--spacing-md);
    background: var(--success);
}

.el-time-picker {
    --el-border-color: var(--border-subtle);
}

.save-message.success {
    background: var(--success-light);
    color: var(--success-dark);
}

.save-message.error {
    background: var(--danger-light);
    color: var(--danger-dark);
}

button:disabled {
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
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: var(--error);
    background-color: transparent;
    border: 1px solid var(--error);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-normal);
}

.remove-button:hover {
    color: white;
    background-color: var(--error);
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

:deep(.el-time-picker) {
    width: 100%;
}

:deep(.el-checkbox__label) {
    font-size: 0.9rem;
    color: var(--text-primary);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background-color: var(--primary);
    border-color: var(--primary);
}

:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: var(--text-primary);
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