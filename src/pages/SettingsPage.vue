<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import {
  FileCode2,
  Monitor,
  Moon,
  Palette,
  Power,
  RefreshCw,
  Route,
  Settings2,
  Sun,
} from '@lucide/vue'
import { useModuleState } from '../composables/useModuleState'
import { useMonetTheme } from '../composables/useMonetTheme'
import { useStoredTheme } from '../composables/useStoredTheme'
import * as moduleApi from '../api/module'

const { status, busy, refreshStatus, runAction } = useModuleState()
const { mode, setThemeMode } = useStoredTheme()
const { monetEnabled } = useMonetTheme()

const themeModes = [
  { value: 'system', label: '系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
]

const currentThemeMode = computed({
  get: () => mode.value,
  set: (value) => setThemeMode(value),
})

onMounted(() => {
  refreshStatus(false)
})

const pathIsDefault = computed(() => status.value?.backendPathIsDefault ?? false)

function handleAutostartToggle(event) {
  const nextValue = event.target.checked
  if (nextValue === status.value?.autostart) return
  runAction('toggle-autostart', () => moduleApi.toggleAutostart()).then((ok) => {
    if (!ok) refreshStatus(false)
  })
}

const tab = ref(0)
const editorVisited = ref(false)
const EnvFileEditor = defineAsyncComponent(() => import('@/components/EnvFileEditor.vue'))

watch(tab, (value) => {
  if (value === 1) editorVisited.value = true
})
</script>

<template>
  <div class="settings-page">
  <div class="segmented-control settings-tabs" role="tablist" aria-label="配置页签">
    <button
      type="button"
      role="tab"
      :aria-selected="tab === 0"
      @click="tab = 0"
    >
      <Settings2 :size="16" style="vertical-align: -3px; margin-right: 5px" />
      设置
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="tab === 1"
      @click="tab = 1"
    >
      <FileCode2 :size="16" style="vertical-align: -3px; margin-right: 5px" />
      环境变量
    </button>
  </div>

  <div v-show="tab === 0" class="settings-panel">
    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">外观</h2>
        <p class="section-heading__subtitle">主题与宿主动态取色</p>
      </div>
      <Palette :size="20" color="var(--md-sys-color-primary)" />
    </div>
    <div class="m3e-card m3e-card__body">
      <div class="m3e-field">
        <span class="m3e-field__label">主题模式</span>
        <div class="segmented-control" role="tablist" aria-label="主题模式">
          <button
            v-for="item in themeModes"
            :key="item.value"
            type="button"
            role="tab"
            :aria-selected="currentThemeMode === item.value"
            @click="currentThemeMode = item.value"
          >
            <component :is="item.icon" :size="16" style="vertical-align: -3px; margin-right: 4px" />
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="m3e-list" style="margin-top: 16px">
        <div class="m3e-list-row" style="padding-right: 0; padding-left: 0">
          <span class="m3e-list-row__icon">
            <Palette :size="20" />
          </span>
          <div class="m3e-list-row__copy">
            <p class="m3e-list-row__title">Monet 动态取色</p>
            <p class="m3e-list-row__summary">读取 KernelSU 宿主配色并生成完整 Material 3 色板</p>
          </div>
          <label class="m3e-switch" aria-label="启用 Monet 动态取色">
            <input v-model="monetEnabled" type="checkbox">
            <span class="m3e-switch__track">
              <span class="m3e-switch__thumb" />
            </span>
          </label>
        </div>
      </div>
    </div>

    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">启动</h2>
        <p class="section-heading__subtitle">模块与核心服务的开机行为</p>
      </div>
    </div>
    <div class="m3e-card">
      <div class="m3e-list">
        <div v-if="status" class="m3e-list-row">
          <span class="m3e-list-row__icon">
            <Power :size="20" />
          </span>
          <div class="m3e-list-row__copy">
            <p class="m3e-list-row__title">开机自启</p>
            <p class="m3e-list-row__summary">下次设备启动后自动拉起 Sub-Store</p>
          </div>
          <label class="m3e-switch" aria-label="切换开机自启">
            <input
              type="checkbox"
              :checked="status.autostart"
              @change="handleAutostartToggle"
            >
            <span class="m3e-switch__track">
              <span class="m3e-switch__thumb" />
            </span>
          </label>
        </div>
      </div>
    </div>

    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">访问路径</h2>
        <p class="section-heading__subtitle">降低未授权访问风险</p>
      </div>
      <Route :size="20" color="var(--md-sys-color-primary)" />
    </div>
    <div class="m3e-card m3e-card__body">
      <button
        type="button"
        class="m3e-button m3e-button--tonal m3e-button--wide"
        :disabled="busy"
        @click="runAction('regenerate-backend-path', () => moduleApi.regenerateBackendPath())"
      >
        <RefreshCw :size="18" />
        重新生成随机路径
      </button>
      <div v-if="status && pathIsDefault" class="m3e-error">
        <Route :size="18" />
        <span>当前仍为模块默认值，所有安装者相同，建议立即重新生成。</span>
      </div>
    </div>
  </div>

  <div v-if="editorVisited" v-show="tab === 1" class="editor-panel">
    <EnvFileEditor title="sub_store.env" />
  </div>
  </div>
</template>

<style scoped>
.settings-tabs {
  margin: 8px 0 4px;
}

.settings-panel {
  min-height: 0;
}

.editor-panel {
  height: calc(100dvh - 270px);
  min-height: 420px;
  padding-top: 10px;
}
</style>
