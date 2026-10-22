<script setup>
import { computed, onMounted, ref } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { EditorView } from '@codemirror/view'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { oneDark } from '@codemirror/theme-one-dark'
import { CircleAlert, FileCode2, RefreshCw, Save } from '@lucide/vue'
import { readEnvFile, writeEnvFile } from '../api/module'
import { useStoredTheme } from '../composables/useStoredTheme'
import { showToast } from '../composables/useToast'
import '@fontsource-variable/jetbrains-mono/wght.css'

const props = defineProps({
  title: { type: String, default: '' },
})
const emit = defineEmits(['saved', 'error'])

const content = ref('')
const original = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const dirty = computed(() => content.value !== original.value)
const { resolvedMode } = useStoredTheme()

const extensions = computed(() => [
  EditorView.lineWrapping,
  StreamLanguage.define(shell),
  ...(resolvedMode.value === 'dark' ? [oneDark] : []),
])

onMounted(load)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const text = await readEnvFile()
    content.value = text
    original.value = text
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await writeEnvFile(content.value)
    original.value = content.value
    emit('saved')
    showToast('环境变量已保存；重启服务后生效')
  } catch (err) {
    error.value = err.message
    emit('error', err)
    showToast(error.value, { tone: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="env-editor">
    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">{{ title }}</h2>
        <p class="section-heading__subtitle">
          {{ dirty ? '有未保存修改' : '内容已同步' }}
        </p>
      </div>
      <FileCode2 :size="20" color="var(--md-sys-color-primary)" />
    </div>

    <div class="m3e-card env-editor__card">
      <Codemirror
        v-model="content"
        class="env-editor__code"
        :extensions="extensions"
        :disabled="loading || saving"
        placeholder="加载中…"
      />
    </div>

    <div v-if="error" class="m3e-error">
      <CircleAlert :size="18" />
      <span>{{ error }}</span>
    </div>

    <div class="env-editor__actions">
      <button
        type="button"
        class="m3e-button m3e-button--outline"
        :disabled="loading || saving || !dirty"
        @click="load"
      >
        <RefreshCw :size="18" />
        重新加载
      </button>
      <button
        type="button"
        class="m3e-button"
        :disabled="loading || saving || !dirty"
        @click="save"
      >
        <Save :size="18" />
        {{ saving ? '保存中…' : '保存修改' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.env-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.env-editor__card {
  display: flex;
  flex: 1;
  min-height: 320px;
  overflow: hidden;
  background: var(--md-sys-color-surface-container-lowest);
}

.env-editor__code {
  display: flex;
  flex: 1;
  min-height: 0;
}

.env-editor__code :deep(.cm-editor) {
  flex: 1;
  min-height: 320px;
  font-size: 13px;
}

.env-editor__code :deep(.cm-scroller) {
  height: 100%;
  min-height: 320px;
  overflow: auto;
  font-family: 'JetBrains Mono Variable', monospace;
}

.env-editor__actions {
  display: flex;
  flex: none;
  gap: 10px;
  margin-top: 12px;
}

.env-editor__actions .m3e-button {
  flex: 1;
}
</style>
