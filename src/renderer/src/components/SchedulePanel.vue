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
        <el-button 
          @click="$emit('cancel')" 
          class="cancel-button"
          plain
          type="danger"
          size="small"
        >
          取消
        </el-button>
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
  gap: var(--spacing-md);
}

.time-picker-container {
  width: 100%;
}

.time-picker {
  width: 100%;
}

.action-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  background: var(--bg-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-normal);
  box-shadow: var(--shadow-md);
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
  padding: var(--spacing-md);
  background-color: rgba(102, 126, 234, 0.1);
  border-radius: var(--radius-sm);
  margin-top: var(--spacing-sm);
}

.schedule-text {
  color: var(--text-primary);
  font-size: 1.125rem;
}

:deep(.cancel-button) {
  margin-left: var(--spacing-sm);
  font-size: 0.875rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Element Plus 样式覆盖 */
:deep(.el-input__wrapper) {
  background-color: var(--bg-light) !important;
  border: 1px solid var(--primary) !important;
  box-shadow: none !important;
}

:deep(.el-input__inner) {
  font-size: 1.125rem !important;
  color: var(--text-primary) !important;
  height: 44px !important;
}

:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  border-color: var(--primary-dark) !important;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2) !important;
}
</style>