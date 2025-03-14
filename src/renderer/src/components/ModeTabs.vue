<template>
  <div class="mode-tabs">
    <button 
      v-for="tab in tabs" 
      :key="tab.value"
      :class="['tab-button', { active: currentMode === tab.value }]" 
      @click="$emit('change', tab.value)"
      :aria-pressed="currentMode === tab.value"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  currentMode: {
    type: String,
    required: true
  },
  tabs: {
    type: Array,
    required: true
  }
})

defineEmits(['change'])
</script>

<style scoped>
.mode-tabs {
  display: flex;
  margin-bottom: var(--spacing-lg);
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: rgba(102, 126, 234, 0.1);
  padding: 0.5rem;
  align-items: center;
}

.tab-button {
  flex: 1;
  padding: 0.5rem 1.25rem;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition-normal);
  font-size: 1rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  letter-spacing: 0.5px;
  font-weight: 500;
  line-height: 1.5;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-button.active {
  background: var(--bg-gradient);
  color: white;
  box-shadow: var(--shadow-md);
}

.tab-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.4);
}

.tab-button:not(.active):hover {
  background-color: rgba(102, 126, 234, 0.05);
  color: var(--primary);
}
</style>