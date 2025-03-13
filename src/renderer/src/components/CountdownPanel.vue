<template>
  <div class="countdown-panel">
    <div class="input-group">
      <input 
        type="number" 
        v-model.number="localTime" 
        :disabled="isCounting" 
        min="1" 
        max="3600" 
        class="time-input" 
        aria-label="倒计时时间（秒）"
      />
      <span class="unit">秒</span>
    </div>
    <button 
      @click="$emit('start')" 
      :disabled="isCounting || !isValidTime" 
      class="action-button"
    >
      {{ isCounting ? '倒计时中...' : '开始' }}
    </button>
    <transition name="fade">
      <div v-if="isCounting" class="countdown">
        {{ formattedCountdown }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTimeFormat } from '../composables/useTimeFormat'
import { TIME_LIMITS } from '../constants'

const props = defineProps({
  time: {
    type: Number,
    required: true
  },
  isCounting: {
    type: Boolean,
    required: true
  },
  countdown: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:time', 'start'])

const { formatSeconds } = useTimeFormat()

const localTime = ref(props.time)

const isValidTime = computed(() => {
  return localTime.value >= TIME_LIMITS.MIN && localTime.value <= TIME_LIMITS.MAX
})

const formattedCountdown = computed(() => {
  return formatSeconds(props.countdown)
})

watch(localTime, (newValue) => {
  emit('update:time', newValue)
})
</script>

<style scoped>
.countdown-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.input-group {
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-input {
  width: 120px;
  padding: 0.875rem;
  font-size: 1.25rem;
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  text-align: center;
  transition: var(--transition-normal);
}

.time-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.time-input:disabled {
  background-color: var(--bg-light);
  cursor: not-allowed;
}

.unit {
  margin-left: 0.9375rem;
  font-size: 1.25rem;
  color: var(--text-secondary);
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

.countdown {
  font-size: 4rem;
  font-weight: 600;
  text-align: center;
  background: var(--bg-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: var(--spacing-md) 0;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>