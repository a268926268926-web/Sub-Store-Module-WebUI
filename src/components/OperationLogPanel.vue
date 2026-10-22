<script setup>
import { ref, watch } from 'vue'
import { TerminalSquare } from '@lucide/vue'
import M3LoadingIndicator from './M3LoadingIndicator.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  content: { type: String, default: '' },
  title: { type: String, required: true },
  fill: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const boxRef = ref(null)

function logLineClass(line) {
  if (/\[Error\]/.test(line)) return 'log-line--error'
  if (/\[Warn\]/.test(line)) return 'log-line--warn'
  if (/\[Info\]/.test(line)) return 'log-line--info'
  return ''
}

watch(
  () => props.content,
  () => {
    const box = boxRef.value
    if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 40) {
      box.scrollTop = box.scrollHeight
    }
  },
)
</script>

<template>
  <template v-if="visible && content">
    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">{{ title }}</h2>
        <p class="section-heading__subtitle">后台执行输出，完成后保留本次结果</p>
      </div>
      <M3LoadingIndicator v-if="loading" :size="22" label="后台任务执行中" />
      <TerminalSquare v-else :size="20" color="var(--md-sys-color-primary)" />
    </div>
    <div
      ref="boxRef"
      class="log-surface"
      :style="fill ? 'max-height: none; flex: 1;' : undefined"
    >
      <div
        v-for="(line, index) in content.split('\n')"
        :key="index"
        class="log-line"
        :class="logLineClass(line)"
      >{{ line || ' ' }}</div>
    </div>
  </template>
</template>
