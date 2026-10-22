<script setup>
import M3LoadingIndicator from './M3LoadingIndicator.vue'
</script>

<template>
  <div class="page-loading" aria-busy="true" aria-label="正在载入页面">
    <M3LoadingIndicator :size="40" contained label="正在载入页面" />
    <div class="page-loading__rows" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  </div>
</template>

<style scoped>
.page-loading {
  display: grid;
  gap: 20px;
  padding: 18px 0 40px;
}

.page-loading__rows {
  display: grid;
  gap: 3px;
}

.page-loading__rows span {
  display: block;
  height: 76px;
  border-radius: 20px;
  background:
    linear-gradient(
      100deg,
      var(--md-sys-color-surface-container-high) 20%,
      var(--md-sys-color-surface-container-highest) 38%,
      var(--md-sys-color-surface-container-high) 56%
    );
  background-size: 240% 100%;
  animation: page-loading-shimmer 1.7s ease-in-out infinite;
}

.page-loading__rows span:nth-child(2) {
  border-radius: 6px;
}

.page-loading__rows span:nth-child(3) {
  border-radius: 6px 6px 20px 20px;
}

@keyframes page-loading-shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}
</style>
