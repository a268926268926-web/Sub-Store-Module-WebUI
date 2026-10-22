<script setup>
defineProps({
  size: { type: Number, default: 24 },
  contained: { type: Boolean, default: false },
  tone: { type: String, default: 'primary' },
  label: { type: String, default: '正在加载' },
})
</script>

<template>
  <span
    class="m3-loading-indicator"
    :class="{ 'is-contained': contained, 'is-inherit': tone === 'inherit' }"
    role="progressbar"
    :aria-label="label"
    :style="{ '--indicator-size': `${size}px` }"
  >
    <span class="m3-loading-indicator__bars" aria-hidden="true">
      <i v-for="index in 8" :key="index" :style="{ '--bar-index': index - 1 }" />
    </span>
  </span>
</template>

<style scoped>
.m3-loading-indicator {
  display: inline-grid;
  flex: none;
  width: var(--indicator-size);
  height: var(--indicator-size);
  place-items: center;
  color: var(--md-sys-color-primary);
}

.m3-loading-indicator.is-contained {
  border-radius: 50%;
  background: color-mix(in srgb, var(--md-sys-color-primary-container) 82%, transparent);
  color: var(--md-sys-color-on-primary-container);
}

.m3-loading-indicator.is-inherit {
  color: currentColor;
}

.m3-loading-indicator__bars {
  position: relative;
  width: 68%;
  height: 68%;
}

.m3-loading-indicator__bars i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10%;
  height: 34%;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.3;
  transform:
    translate(-50%, -50%)
    rotate(calc(var(--bar-index) * 45deg))
    translateY(-155%);
  transform-origin: center;
  animation: m3-indicator 1.08s linear infinite;
  animation-delay: calc(var(--bar-index) * -135ms);
}

@keyframes m3-indicator {
  0%,
  100% {
    opacity: 0.22;
    scale: 0.84;
  }

  22% {
    opacity: 1;
    scale: 1;
  }

  44% {
    opacity: 0.46;
    scale: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-loading-indicator__bars i {
    animation-duration: 2.8s;
  }
}
</style>
