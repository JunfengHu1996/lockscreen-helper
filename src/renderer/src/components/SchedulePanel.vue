<template>
  <div class="schedule-panel">
    <div class="time-picker-container">
      <el-time-picker
        v-model="localTimeValue"
        :disabled="isScheduled"
        format="HH:mm"
        placeholder="选择时间"
        :clearable="false"
        :size="'large'"
        class="time-picker"
      />
    </div>
    <button 
      @click="$emit('start')" 
      :disabled="isScheduled || !localTimeValue" 
      class="action-button"
    >
      {{ isScheduled ? '定时中...' : '设定' }}
    </button>
    <transition name="fade">
      <div v-if="isScheduled" class="schedule-info">
        <span class="schedule-text">将在 {{ formattedTime }} 锁定屏幕</span>
        <button @click="$emit('cancel')" class="cancel-button">
          取消
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElTimePicker, ElButton } from 'element-plus'

const props = defineProps({
  timeValue: {
    type: Date,
    required: true
  },
  isScheduled: {
    type: Boolean,
    required: true
  },
  formattedTime: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:time-value', 'start', 'cancel'])

const localTimeValue = ref(props.timeValue)

watch(localTimeValue, (newValue) => {
  emit('update:time-value', newValue)
})
</script>

<style scoped>
.schedule-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  min-height: 300px;
  height: 100%;
}

.time-picker-container {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

.time-picker {
  width: 100%;
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
  font-weight: 600 !important;
  height: 60px !important;
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

.action-button {
  width: 100%;
  height: 56px;
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
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.5;
}

.action-button::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(255, 255, 255, 0.2), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.action-button:not(:disabled):hover::after {
  opacity: 1;
}

.action-button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.schedule-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: rgba(102, 126, 234, 0.1);
  border-radius: var(--radius-sm);
  margin-top: var(--spacing-sm);
}

.schedule-text {
  color: var(--text-primary);
  font-size: 1.125rem;
  font-weight: 500;
}

.cancel-button {
  margin-left: var(--spacing-md);
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--error);
  background-color: white;
  border: 1px solid var(--error);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-normal);
  letter-spacing: 0.5px;
  height: 36px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-button:hover {
  color: white;
  background-color: var(--error);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.cancel-button:active {
  transform: translateY(0);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

</style>