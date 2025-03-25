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
        <div v-if="sortedSchedules.length > 0" class="schedules-list">
            <div v-for="schedule in sortedSchedules" :key="schedule.id" class="schedule-item">
                <span class="schedule-time">{{ formatTime(schedule) }}</span>
                <button @click="removeSchedule(schedule.id)" class="remove-button">
                    删除
                </button>
            </div>
        </div>
        <div v-else class="no-schedules">
            暂无定时设置
        </div>
        <div v-if="saveMessage" :class="['save-message', saveMessage.type]">
            {{ saveMessage.text }}
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElTimePicker } from 'element-plus'
import { MODES } from '../constants'

const newTimeValue = ref(null)
const schedules = ref([])
const isSaving = ref(false)
const saveMessage = ref(null)
const isDaily = ref(false)

// 计算属性：按24小时制时间排序的任务列表
const sortedSchedules = computed(() => {
    return [...schedules.value].sort((a, b) => {
        // 获取时间的小时和分钟
        const timeA = a.time
        const timeB = b.time
        const hoursA = timeA.getHours()
        const hoursB = timeB.getHours()
        const minutesA = timeA.getMinutes()
        const minutesB = timeB.getMinutes()

        // 首先按小时比较
        if (hoursA !== hoursB) {
            return hoursA - hoursB
        }
        // 如果小时相同，则按分钟比较
        return minutesA - minutesB
    })
})

// 加载保存的定时设置
const loadSavedSchedules = () => {
  window.api.getSavedSchedules().then((savedSchedules) => {
    if (savedSchedules && Array.isArray(savedSchedules)) {
      const now = new Date();
      // 过滤过期单次任务
      const validSchedules = savedSchedules
        .map(schedule => ({
          ...schedule,
          time: new Date(schedule.scheduledTime)
        }))
        .filter(s => {
          if (s.isDaily) return true;
          return s.time > now;
        });

      schedules.value = validSchedules;
      
      // 如果有任务被过滤掉（过期的单次任务），更新存储
      if (validSchedules.length < savedSchedules.length) {
        handleSchedulesChange(validSchedules, true);
      }
    }
  });
};

// 处理schedules变化
const handleSchedulesChange = (schedules, isInitialLoad = false) => {
  const now = new Date();
  
  // 过滤出有效的定时任务：
  // 1. 每天执行的任务
  // 2. 未来时间的单次任务
  const validSchedules = Array.isArray(schedules) ? schedules : schedules.value;
  const filteredSchedules = validSchedules.filter(s => {
    if (s.isDaily) return true;
    return s.time > now;
  });

  // 更新本地状态
  if (filteredSchedules.length < validSchedules.length) {
    schedules.value = filteredSchedules;
  }

  const schedulesToSend = validSchedules.map(s => {
    const scheduleTime = new Date(s.time);
    let targetTime;

    if (s.isDaily) {
      // 对于每日任务，如果今天的时间已经过了，就设置为明天
      const now = new Date();
      targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
        scheduleTime.getHours(), scheduleTime.getMinutes(), 0, 0);
      
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
    } else {
      // 对于单次任务，直接使用设定的时间
      targetTime = scheduleTime;
    }

    return {
      ...s,
      time: targetTime.getTime() - now.getTime(), // 计算延迟时间
      scheduledTime: targetTime.toISOString()
    };
  });

  // 添加一个标记，表示这是删除操作
  const isModeSwitch = window.isSwitchingMode;
  const isDelete = window.lastSchedulesLength > schedules.length;
  window.lastSchedulesLength = validSchedules.length; // 使用过滤后的长度

  // 如果有有效的定时任务，或者这是一个删除操作，才发送更新
  if (validSchedules.length > 0 || isDelete) {
    window.api.send('set-multi-schedules', {
      schedules: schedulesToSend,
      mode: MODES.SCHEDULE,
      isDelete, // 传递删除标记
      isSilent: true // 总是使用静默模式，避免重复显示消息
    });
  }
};

// 监听schedules的变化，自动保存
watch(schedules, (newSchedules) => handleSchedulesChange(newSchedules, false), { deep: true });

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
        return
    }

    // 检查是否选择了过去的时间（仅对非每日任务进行检查）
    if (!isDaily.value) {
        const now = new Date();
        const selectedTime = new Date(newTimeValue.value);
        selectedTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (selectedTime <= now) {
            saveMessage.value = { type: 'error', text: '请选择未来的时间' }
            setTimeout(() => {
                saveMessage.value = null
            }, 3000)
            return
        }
    }

    const now = new Date();
    const selectedTime = new Date(newTimeValue.value);
    selectedTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (!isDaily.value && selectedTime <= now) {
        // 如果不是每日执行且选择的时间小于或等于当前时间，将其设置为明天的同一时间
        selectedTime.setDate(selectedTime.getDate() + 1);
    }
    
    const id = Date.now()
    const newSchedule = {
        id,
        time: selectedTime,
        isDaily: isDaily.value
    };
    
    schedules.value.push(newSchedule)
    newTimeValue.value = null

    // 显示添加成功消息
    saveMessage.value = { type: 'success', text: `已添加1个定时任务` }
    setTimeout(() => {
        saveMessage.value = null
    }, 3000)
}

const isFutureTime = (date) => {
    const now = new Date();
    return date > now;
}

const removeSchedule = (id) => {
    console.log('Removing schedule with id:', id);
    console.log('Before removal, schedules:', JSON.stringify(schedules.value));
    
    // 过滤掉要删除的任务
    const updatedSchedules = schedules.value.filter(schedule => schedule.id !== id);
    schedules.value = updatedSchedules;
    
    console.log('After removal, schedules:', JSON.stringify(schedules.value));
    
    // 立即触发更新到主进程
    const now = new Date();
    const schedulesToSend = updatedSchedules.map(s => {
        const scheduleTime = new Date(s.time);
        let targetTime;

        if (s.isDaily) {
            // 对于每日任务，如果今天的时间已经过了，就设置为明天
            targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                scheduleTime.getHours(), scheduleTime.getMinutes(), 0, 0);
            
            if (targetTime <= now) {
                targetTime.setDate(targetTime.getDate() + 1);
            }
        } else {
            // 对于单次任务，直接使用设定的时间
            targetTime = scheduleTime;
        }

        return {
            ...s,
            time: targetTime.getTime() - now.getTime(), // 计算延迟时间（毫秒）
            scheduledTime: targetTime.toISOString()
        };
    });

    // 发送更新到主进程，并标记这是一个删除操作
    window.api.send('set-multi-schedules', {
        schedules: schedulesToSend,
        mode: MODES.SCHEDULE,
        isDelete: true,
        isSilent: false
    });
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

// 监听来自主进程的锁屏结果
const handleLockScreenResult = (result) => {
    console.log('MultiSchedulePanel received lock-screen-result:', result);
    isSaving.value = false;
    
    if (result.fromMultiSchedule) {
        if (!result.success) {
            // 处理错误消息
            saveMessage.value = { 
                type: 'error', 
                text: result.error || '操作失败' 
            };
        } else if (result.isDelete) {
            // 处理删除成功消息
            saveMessage.value = { 
                type: 'success', 
                text: result.message || '删除成功' 
            };
        }
        // 3秒后清除消息
        setTimeout(() => {
            saveMessage.value = null;
        }, 3000);
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

// 处理定时任务执行完成的事件
const handleScheduleExecuted = (result) => {
    console.log('Schedule executed:', result);
    
    // 如果有更新后的任务列表
    if (result.updatedSchedules) {
        // 立即更新本地任务列表，确保时间格式正确
        const now = new Date();
        const updatedSchedules = result.updatedSchedules
            .map(schedule => ({
                ...schedule,
                time: new Date(schedule.scheduledTime)
            }))
            .filter(s => s.isDaily || s.time > now); // 再次过滤确保移除过期任务

        schedules.value = updatedSchedules;
        
        // 根据任务类型显示不同的提示消息
        if (result.isDaily) {
            saveMessage.value = { 
                type: 'success', 
                text: '每日任务已执行，将在明天继续' 
            };
        } else {
            // 确认任务已被移除
            if (!updatedSchedules.find(s => s.id === result.scheduleId)) {
                saveMessage.value = { 
                    type: 'success', 
                    text: '单次任务已执行完成并移除' 
                };
            }
        }
        
        // 3秒后清除消息
        if (saveMessage.value) {
            setTimeout(() => {
                saveMessage.value = null;
            }, 3000);
        }

        // 触发变化处理以确保数据同步
        handleSchedulesChange(updatedSchedules);
    }
};

onMounted(() => {
    // 监听多次定时设置的结果
    window.api.on('multi-schedule-result', handleLockScreenResult)
    
    // 监听锁屏执行结果
    window.api.on('lock-execution-result', handleLockExecutionResult)

    // 监听定时任务执行完成事件
    window.api.on('schedule-executed', handleScheduleExecuted)

    // 初始化长度记录器
    window.lastSchedulesLength = 0;

    // 加载保存的定时设置
    loadSavedSchedules();
})

onUnmounted(() => {
    newTimeValue.value = null
    clearTimeout(saveMessage.value?.timer)
    
    // 移除事件监听器
    window.api.off('multi-schedule-result', handleLockScreenResult)
    window.api.off('lock-execution-result', handleLockExecutionResult)
    window.api.off('schedule-executed', handleScheduleExecuted)
})
</script>

<style scoped>
.multi-schedule-panel {
    padding: var(--spacing-sm);
    background: rgba(102, 126, 234, 0.12);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid rgba(102, 126, 234, 0.25);
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.time-picker-container {
    background: rgba(255, 255, 255, 0.7);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xs);
    margin-bottom: var(--spacing-sm);
    border: 1px solid rgba(102, 126, 234, 0.15);
    backdrop-filter: blur(8px);
    box-sizing: border-box;
}

.schedules-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    max-height: 200px;
    overflow-y: auto;
    background: transparent !important;
    border-radius: var(--radius-sm);
    margin-top: var(--spacing-xs);
    box-sizing: border-box;
    padding: 0;
    /* 自定义滚动条样式 */
    scrollbar-width: thin; /* Firefox */
    scrollbar-color: transparent transparent; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    
    /* Webkit浏览器的滚动条样式 */
    &::-webkit-scrollbar {
        width: 6px;
        background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
        background-color: rgba(102, 126, 234, 0.2);
        border-radius: 3px;
    }
    
    /* 鼠标悬停时显示滚动条 */
    &:hover {
        scrollbar-color: rgba(102, 126, 234, 0.2) transparent; /* Firefox */
        
        &::-webkit-scrollbar-thumb {
            background-color: rgba(102, 126, 234, 0.2);
        }
    }
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
    flex-grow: 0;
    height: 48px;
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


.schedule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-xs);
    margin-bottom: var(--spacing-xs);
    border: 1px solid rgba(102, 126, 234, 0.15);
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
    box-sizing: border-box;
    width: 100%;
}

.schedule-item:hover {
    background-color: rgba(255, 255, 255, 0.85);
    border-color: rgba(102, 126, 234, 0.3);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}

.schedule-item:last-child {
    margin-bottom: 0;
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

/* Element Plus 样式覆盖 */

:deep(.el-input__wrapper) {
    background-color: rgba(255, 255, 255, 0.5) !important;
    border: 1px solid rgba(102, 126, 234, 0.2) !important;
    box-shadow: var(--shadow-xs) !important;
    transition: var(--transition-normal);
    border-radius: var(--radius-md);
    height: 48px;
    padding: 0 var(--spacing-md);
    backdrop-filter: blur(4px);
}

:deep(.el-time-picker) {
    width: 180px;
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
    font-size: 1.125rem !important;
    color: var(--text-primary) !important;
    height: 48px !important;
    font-weight: 500 !important;
    user-select: none !important;
    -webkit-user-select: none !important;
}

:deep(.el-input__inner::placeholder) {
    color: var(--text-secondary) !important;
    font-size: 1rem !important;
    font-weight: 400 !important;
    opacity: 0.7;
}

:deep(.el-input__prefix) {
    display: flex;
    align-items: center;
    height: 100%;
}

:deep(.el-input__suffix) {
    display: flex;
    align-items: center;
    height: 100%;
}

:deep(.el-input__wrapper:hover) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm) !important;
    background-color: rgba(255, 255, 255, 0.75) !important;
    border-color: rgba(102, 126, 234, 0.3) !important;
}

:deep(.el-input__wrapper.is-focus) {
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15) !important;
    transform: translateY(-1px);
    background-color: rgba(255, 255, 255, 0.85) !important;
}

:deep(.el-input__wrapper.is-disabled) {
    background-color: rgba(255, 255, 255, 0.5) !important;
    cursor: not-allowed;
    opacity: 0.8;
    transform: none !important;
}

/* 调整时间选择器弹出框样式 */
:deep(.el-time-panel) {
    border: none;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(10px);
    background-color: var(--bg-light);
}

:deep(.el-time-spinner__item) {
    color: var(--text-primary);
    font-size: 1rem;
    height: 32px;
    line-height: 32px;
}

:deep(.el-time-spinner__item.active:not(.disabled)) {
    color: var(--primary);
    font-weight: 600;
    background-color: transparent !important;
}

:deep(.el-time-spinner__item.selected:not(.disabled)) {
    background-color: transparent !important;
}

:deep(.el-time-spinner__item:hover:not(.disabled)) {
    background-color: rgba(102, 126, 234, 0.1) !important;
}

:deep(.el-time-spinner__list) {
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
}

:deep(.el-time-panel__footer) {
    border-top: 1px solid rgba(102, 126, 234, 0.1);
}

:deep(.el-time-panel__btn) {
    color: var(--primary);
    border: none;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 500;
}

:deep(.el-time-panel__btn.confirm) {
    font-weight: 600;
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