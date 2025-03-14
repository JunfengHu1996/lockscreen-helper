<template>
  <div class="countdown-panel">
    <div class="time-picker">
      <div class="time-inputs">
        <div class="input-group">
          <input 
            type="number" 
            v-model.number="hours"
            :disabled="isCounting"
            min="0"
            max="23"
            class="time-input"
            aria-label="小时"
            @wheel="handleWheel($event, 'hours', 23)"
          />
          <span class="unit">时</span>
        </div>
        <div class="input-group">
          <input 
            type="number" 
            v-model.number="minutes"
            :disabled="isCounting"
            min="0"
            max="59"
            class="time-input"
            aria-label="分钟"
            @wheel="handleWheel($event, 'minutes', 59)"
          />
          <span class="unit">分</span>
        </div>
        <div class="input-group">
          <input 
            type="number" 
            v-model.number="seconds"
            :disabled="isCounting"
            min="0"
            max="59"
            class="time-input"
            aria-label="秒"
            @wheel="handleWheel($event, 'seconds', 59)"
          />
          <span class="unit">秒</span>
        </div>
      </div>
    </div>
    <button 
      v-if="!isCounting"
      @click="$emit('start')" 
      :disabled="!isValidTime" 
      class="action-button"
    >
      开始
    </button>
    <div v-else class="countdown-actions">
      <div class="countdown">
        {{ formattedCountdown }}
      </div>
      <div class="countdown-info">
        <span class="countdown-text">倒计时锁屏进行中</span>
        <button @click="$emit('cancel')" class="cancel-button">
          取消
        </button>
      </div>
    </div>
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

const emit = defineEmits(['update:time', 'start', 'cancel'])

const { formatSeconds } = useTimeFormat()

const hours = ref(Math.floor(props.time / 3600))
const minutes = ref(Math.floor((props.time % 3600) / 60))
const seconds = ref(props.time % 60)

const totalSeconds = computed(() => {
  return (hours.value || 0) * 3600 + (minutes.value || 0) * 60 + (seconds.value || 0)
})

const isValidTime = computed(() => {
  return totalSeconds.value > 0 && totalSeconds.value <= TIME_LIMITS.MAX
})

const formattedCountdown = computed(() => {
  return formatSeconds(props.countdown)
})

// 鼠标滚轮事件处理
const handleWheel = (event, type, max) => {
  if (!props.isCounting) {
    const delta = event.deltaY < 0 ? 1 : -1;
    const currentValue = type === 'hours' ? hours.value : type === 'minutes' ? minutes.value : seconds.value;
    let newValue = (currentValue || 0) + delta;
    
    // 循环处理
    if (newValue < 0) newValue = max;
    if (newValue > max) newValue = 0;
    
    if (type === 'hours') hours.value = newValue;
    else if (type === 'minutes') minutes.value = newValue;
    else seconds.value = newValue;
  }
};

// 监听时分秒的变化，更新父组件的时间值
watch([hours, minutes, seconds], () => {
  emit('update:time', totalSeconds.value)
})

// 监听props.time的变化，更新本地时间值
watch(() => props.time, (newTime) => {
  hours.value = Math.floor(newTime / 3600)
  minutes.value = Math.floor((newTime % 3600) / 60)
  seconds.value = newTime % 60
})
</script>

<style scoped>
.countdown-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  min-height: 300px;
  height: 100%;
}

.time-picker {
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--spacing-md);
}

.time-inputs {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.input-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.time-input {
  width: 70px;
  height: 60px;
  font-size: 1.5rem;
  font-weight: 600;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  background-color: rgba(255, 255, 255, 0.8);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-normal);
  -moz-appearance: textfield;
  appearance: textfield;
  text-align: center;
  padding: 0;
  line-height: 60px; /* 与height相同，实现垂直居中 */
}

.time-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.time-input:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.time-input:disabled {
  background-color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  opacity: 0.8;
}

/* 默认隐藏上下箭头 */
.time-input::-webkit-inner-spin-button,
.time-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

/* 鼠标悬浮时显示上下箭头 */
.time-input:hover::-webkit-inner-spin-button,
.time-input:hover::-webkit-outer-spin-button {
  -webkit-appearance: inner-spin-button;
  appearance: auto;
  opacity: 1;
  cursor: pointer;
  width: 20px; /* 设置固定宽度 */
}


/* 为Firefox浏览器设置样式 */
.time-input:hover {
  -moz-appearance: number-input;
}

.unit {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
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

.countdown-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  width: 100%;
}

.countdown {
  font-size: 5rem;
  font-weight: 700;
  text-align: center;
  background: var(--bg-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 2px;
  text-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  animation: pulse 1s infinite alternate;
  margin-bottom: var(--spacing-md);
}

.countdown-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: rgba(102, 126, 234, 0.1);
  border-radius: var(--radius-sm);
  margin-top: auto;
}

.countdown-text {
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

@keyframes pulse {
  from {
    opacity: 0.9;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>