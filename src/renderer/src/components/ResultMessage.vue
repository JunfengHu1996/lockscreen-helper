<template>
  <transition name="slide-up">
    <div :class="['result-message', type]" role="alert">
      {{ message }}
    </div>
  </transition>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['success', 'error'].includes(value)
  },
  message: {
    type: String,
    required: true
  }
})
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