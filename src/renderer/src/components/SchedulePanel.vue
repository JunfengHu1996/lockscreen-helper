<template>
  <div class="schedule-panel">
    <div class="mode-switch">
      <button 
        :class="['tab-button', { active: !isMultiScheduleMode }]" 
        @click="setMode(false)"
        :aria-pressed="!isMultiScheduleMode"
      >
        <span>单次定时</span>
      </button>
      <button 
        :class="['tab-button', { active: isMultiScheduleMode }]" 
        @click="setMode(true)"
        :aria-pressed="isMultiScheduleMode"
      >
        <span>多次定时</span>
      </button>
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

const setMode = (isMulti) => {
  isMultiScheduleMode.value = isMulti
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
  margin-bottom: var(--spacing-lg);
  gap: var(--spacing-sm);
}

.tab-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  position: relative;
  transition: var(--transition-normal);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-button::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-radius: 50%;
  transition: var(--transition-normal);
}

.tab-button.active {
  color: var(--primary);
  font-weight: 600;
}

.tab-button.active::before {
  background-color: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.tab-button:not(.active):hover {
  color: var(--primary-dark);
}

.tab-button:not(.active):hover::before {
  border-color: var(--primary-dark);
  transform: scale(0.9);
}

.tab-button:focus {
  outline: none;
}

.tab-button:focus-visible::before {
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

@media (max-width: 480px) {
  .mode-switch {
    flex-direction: column;
    align-items: flex-start;
    padding-left: var(--spacing-md);
  }
}

/* 基本样式 */

</style>