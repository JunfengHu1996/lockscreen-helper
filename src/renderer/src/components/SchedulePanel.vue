<template>
  <div class="schedule-panel">
    <multi-schedule-panel />
  </div>
</template>

<script setup>
import MultiSchedulePanel from './MultiSchedulePanel.vue';

// 不再需要props和emit，因为我们只使用多次定时面板
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


/* 基本样式 */

</style>