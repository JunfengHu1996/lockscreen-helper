<template>
  <header class="page-header">
    <h1 class="title">{{ title }}</h1>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.page-header {
  text-align: center;
  padding: var(--spacing-md) var(--spacing-md);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.title {
  font-size: 1.75rem;
  font-weight: 600;
  color: white;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  letter-spacing: 1px;
}

@media (max-width: 480px) {
  .title {
    font-size: 1.5rem;
  }
}
</style>