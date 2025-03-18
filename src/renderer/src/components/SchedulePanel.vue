<template>
  <div class="schedule-panel">
    <div class="mode-switch">
      <el-switch
        v-model="isMultiScheduleMode"
        active-text="多次定时"
        inactive-text="单次定时"
        @change="switchMode"
      />
    </div>
    <multi-schedule-panel v-if="isMultiScheduleMode" />
    <single-schedule-panel v-else
      :time-value="timeValue"
      :is-scheduled="isScheduled"
      :formatted-time="formattedTime"
      :is-valid-time="isValidTime"
      @update:time-value="$emit('update:time-value', $event)"
      @start="$emit('start')"
      @cancel="$emit('cancel')"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElSwitch } from 'element-plus'
import SingleSchedulePanel from './SingleSchedulePanel.vue'
import MultiSchedulePanel from './MultiSchedulePanel.vue'

const isMultiScheduleMode = ref(false)

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
  },
  isValidTime: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:time-value', 'start', 'cancel', 'switch-mode'])

const switchMode = () => {
  emit('switch-mode', isMultiScheduleMode.value)
}
</script>

<style scoped>
.schedule-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0 var(--spacing-sm);
  height: auto;
  min-height: auto;
}

.mode-switch {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-md);
  width: 100%;
}

/* Element Plus Switch 样式覆盖 */
:deep(.el-switch) {
  --el-switch-on-color: var(--primary);
  margin: 0 auto;
}

:deep(.el-switch__label) {
  color: var(--text-secondary);
}

:deep(.el-switch__label.is-active) {
  color: var(--primary);
}

/* 基本样式 */

</style>