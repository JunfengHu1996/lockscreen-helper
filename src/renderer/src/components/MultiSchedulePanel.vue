<template>
  <div class="multi-schedule-panel">
    <div class="time-picker-container">
      <el-time-picker
        v-model="newTimeValue"
        format="HH:mm"
        placeholder="选择时间"
        :clearable="false"
        :size="'large'"
        class="time-picker"
      />
      <button @click="addSchedule" class="add-button" :disabled="!isValidTime">
        添加
      </button>
    </div>
    <div v-if="schedules.length > 0" class="schedules-list">
      <div v-for="schedule in schedules" :key="schedule.id" class="schedule-item">
        <span class="schedule-time">{{ formatTime(schedule.time) }}</span>
        <button @click="removeSchedule(schedule.id)" class="remove-button">
          删除
        </button>
      </div>
    </div>
    <div v-else class="no-schedules">
      暂无定时设置
    </div>
    <button 
      @click="saveSchedules" 
      :disabled="schedules.length === 0" 
      class="action-button"
    >
      保存设置
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElTimePicker } from 'element-plus'

const newTimeValue = ref(null)
const schedules = ref([])

const isValidTime = computed(() => {
  return newTimeValue.value instanceof Date && !isNaN(newTimeValue.value)
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
  // 这里可以添加保存schedules到本地存储或发送到后端的逻辑
  console.log('Schedules saved:', schedules.value)
}
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
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary);
  background-color: white;
  border: 2px solid var(--primary);
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-md);
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: white;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.schedule-time {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text-primary);
}

.remove-button {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
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
  height: 50px;
  font-size: 1.125rem;
  font-weight: 600;
  background: var(--bg-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-normal);
  box-shadow: var(--shadow-md);
  letter-spacing: 1px;
  margin-top: var(--spacing-sm);
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Element Plus 样式覆盖 */
:deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.5) !important;
  border: 2px solid transparent !important;
  box-shadow: var(--shadow-sm) !important;
  transition: var(--transition-normal);
  border-radius: var(--radius-md);
  height: 60px;
  padding: 0 var(--spacing-md);
}

:deep(.el-input__inner) {
  font-size: 1.5rem !important;
  color: var(--text-primary) !important;
  height: 60px !important;
  font-weight: 600 !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}

:deep(.el-input__inner::placeholder) {
  color: var(--text-secondary) !important;
  font-size: 1.125rem !important;
  font-weight: 400 !important;
  opacity: 0.7;
}

:deep(.el-input__wrapper:hover) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md) !important;
  background-color: rgba(255, 255, 255, 0.8) !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
  transform: translateY(-2px);
  background-color: rgba(255, 255, 255, 0.8) !important;
}
</style>