<template>
  <transition name="slide-up">
    <div :class="['result-message', type]" role="alert">
      <span class="result-text">{{ message }}</span>
      <button v-if="closeable" class="close-btn" @click="$emit('close')" aria-label="关闭">×</button>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['success', 'error', 'info'].includes(value)
  },
  message: {
    type: String,
    required: true
  },
  closeable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])
</script>

<style scoped>
.result-message {
  width: 100%;
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: 1.125rem;
  font-weight: 500;
  text-align: center;
  transition: var(--transition-normal);
  margin-bottom: var(--spacing-sm);
}

.success {
  background-color: rgba(72, 187, 120, 0.1);
  color: var(--success);
  border: 1px solid rgba(72, 187, 120, 0.2);
}

.error {
  background-color: rgba(229, 62, 62, 0.1);
  color: var(--error);
  border: 1px solid rgba(229, 62, 62, 0.2);
}

.info {
  background-color: rgba(102, 126, 234, 0.1);
  color: var(--primary);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.result-text {
  flex: 1;
  text-align: center;
}

.result-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.close-btn {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>