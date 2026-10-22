<script setup>
import {
  computed,
  defineAsyncComponent,
  inject,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
} from 'vue'
import {
  ArrowLeft,
  ChevronRight,
  FileCode2,
  Palette,
  Power,
  RefreshCw,
  Route,
} from '@lucide/vue'
import { useModuleState } from '../composables/useModuleState'
import { useMonetTheme } from '../composables/useMonetTheme'
import { useStoredTheme, withThemeTransition } from '../composables/useStoredTheme'
import {
  cancelHistoryLayer,
  closeHistoryLayer,
  pushHistoryLayer,
} from '../composables/useHistoryLayer'
import * as moduleApi from '../api/module'
import { createMonetPalettes } from '../theme/monet'
import M3LoadingIndicator from '../components/M3LoadingIndicator.vue'
import M3Select from '../components/M3Select.vue'

const { status, busy, refreshStatus, runAction } = useModuleState()
const { mode, setThemeMode, pureBlack, setPureBlack } = useStoredTheme()
const pageHeroHidden = inject('pageHeroHidden', ref(false))
const {
  themePalette,
  effectiveSeed,
  paletteStyleOptions,
} = useMonetTheme()

const themeModes = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

const paletteNames = {
  tonal: 'Tonal Spot',
  expressive: 'Expressive',
  vibrant: 'Vibrant',
  neutral: 'Neutral',
  monochrome: 'Monochrome',
}

const paletteOptions = computed(() => paletteStyleOptions.map((style) => {
  const palette = createMonetPalettes(effectiveSeed.value, style.value)?.light
  return {
    ...style,
    label: paletteNames[style.value] || style.label,
    colors: [
      palette?.['--md-sys-color-primary'] || '#68607f',
      palette?.['--md-sys-color-secondary'] || '#797780',
      palette?.['--md-sys-color-tertiary'] || '#88727d',
    ],
  }
}))

const currentModeLabel = computed(() => (
  themeModes.find((item) => item.value === mode.value)?.label || '跟随系统'
))
const currentPaletteLabel = computed(() => (
  paletteOptions.value.find((item) => item.value === themePalette.value)?.label || 'Tonal Spot'
))
const themeSummary = computed(() => (
  `${currentModeLabel.value} · ${currentPaletteLabel.value}${pureBlack.value ? ' · 纯黑' : ''}`
))
const pathSummary = computed(() => (
  pathIsDefault.value ? '仍在使用模块默认路径' : '已使用自定义路径'
))
const pathIsDefault = computed(() => status.value?.backendPathIsDefault ?? false)

const themeModeValue = computed({
  get: () => mode.value,
  set: (value) => {
    withThemeTransition(() => setThemeMode(value))
  },
})

const paletteValue = computed({
  get: () => themePalette.value,
  set: (value) => {
    withThemeTransition(() => {
      themePalette.value = value
    })
  },
})

function updatePureBlack(enabled) {
  withThemeTransition(() => setPureBlack(enabled))
}

function handleAutostartToggle(event) {
  const nextValue = event.target.checked
  if (nextValue === status.value?.autostart) return
  runAction('toggle-autostart', () => moduleApi.toggleAutostart()).then((ok) => {
    if (!ok) refreshStatus(false)
  })
}

const settingsView = ref('main')
const editorVisited = ref(false)
const envExpanded = ref(false)
const EnvFileEditor = defineAsyncComponent(() => import('@/components/EnvFileEditor.vue'))
let viewLayer = null
let envLayer = null

function scrollToPageTop() {
  document.querySelector('.app-scroll')?.scrollTo({ top: 0 })
}

function openSettingsView(view) {
  if (settingsView.value === view) return
  settingsView.value = view
  pageHeroHidden.value = true
  viewLayer = pushHistoryLayer(() => {
    settingsView.value = 'main'
    pageHeroHidden.value = false
    viewLayer = null
    scrollToPageTop()
  })
  scrollToPageTop()
}

function closeSettingsView() {
  if (viewLayer) {
    closeHistoryLayer(viewLayer)
    return
  }
  settingsView.value = 'main'
  pageHeroHidden.value = false
}

function toggleEnvEditor() {
  if (envExpanded.value) {
    if (envLayer) closeHistoryLayer(envLayer)
    else envExpanded.value = false
    return
  }

  editorVisited.value = true
  envExpanded.value = true
  envLayer = pushHistoryLayer(() => {
    envExpanded.value = false
    envLayer = null
  })
  nextTick(() => {
    document.querySelector('.env-inline')?.scrollIntoView({ block: 'start' })
  })
}

function releaseLayers() {
  cancelHistoryLayer(viewLayer)
  cancelHistoryLayer(envLayer)
  viewLayer = null
  envLayer = null
  settingsView.value = 'main'
  envExpanded.value = false
  pageHeroHidden.value = false
}

onActivated(() => {
  refreshStatus(false)
})

onDeactivated(releaseLayers)
onBeforeUnmount(releaseLayers)
</script>

<template>
  <div class="settings-page">
    <div v-show="settingsView === 'main'" class="settings-panel">
      <div class="section-heading">
        <div class="section-heading__copy">
          <h2 class="section-heading__title">个性化</h2>
          <p class="section-heading__subtitle">面板外观与显示方式</p>
        </div>
      </div>
      <div class="m3e-card">
        <div class="m3e-list">
          <button type="button" class="m3e-list-row" @click="openSettingsView('theme')">
            <span class="m3e-list-row__icon">
              <Palette :size="22" />
            </span>
            <span class="m3e-list-row__copy">
              <span class="m3e-list-row__title">主题设置</span>
              <span class="m3e-list-row__summary">{{ themeSummary }}</span>
            </span>
            <ChevronRight :size="20" class="settings-chevron" />
          </button>
        </div>
      </div>

      <div class="section-heading">
        <div class="section-heading__copy">
          <h2 class="section-heading__title">常规</h2>
          <p class="section-heading__subtitle">服务启动与访问入口</p>
        </div>
      </div>
      <div class="m3e-card">
        <div class="m3e-list">
          <div v-if="status" class="m3e-list-row">
            <span class="m3e-list-row__icon">
              <Power :size="22" />
            </span>
            <div class="m3e-list-row__copy">
              <p class="m3e-list-row__title">开机自启</p>
              <p class="m3e-list-row__summary">设备启动后自动拉起服务</p>
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
          <button type="button" class="m3e-list-row" @click="openSettingsView('path')">
            <span class="m3e-list-row__icon">
              <Route :size="22" />
            </span>
            <span class="m3e-list-row__copy">
              <span class="m3e-list-row__title">访问路径</span>
              <span class="m3e-list-row__summary">{{ pathSummary }}</span>
            </span>
            <ChevronRight :size="20" class="settings-chevron" />
          </button>
        </div>
      </div>

      <div class="section-heading">
        <div class="section-heading__copy">
          <h2 class="section-heading__title">环境</h2>
          <p class="section-heading__subtitle">直接在当前页面编辑运行变量</p>
        </div>
      </div>
      <div class="m3e-card">
        <div class="m3e-list">
          <button
            type="button"
            class="m3e-list-row"
            :aria-expanded="envExpanded"
            @click="toggleEnvEditor"
          >
            <span class="m3e-list-row__icon">
              <FileCode2 :size="22" />
            </span>
            <span class="m3e-list-row__copy">
              <span class="m3e-list-row__title">环境变量</span>
              <span class="m3e-list-row__summary">
                {{ envExpanded ? '编辑器已展开' : '编辑 sub_store.env，保存后重启服务生效' }}
              </span>
            </span>
            <ChevronRight
              :size="20"
              class="settings-chevron env-toggle-icon"
              :class="{ 'is-expanded': envExpanded }"
            />
          </button>
        </div>
      </div>

      <div v-if="editorVisited" v-show="envExpanded" class="env-inline">
        <EnvFileEditor title="sub_store.env" />
      </div>
    </div>

    <Transition name="settings-view" mode="out-in">
      <div v-if="settingsView === 'theme'" key="theme" class="settings-detail">
        <header class="settings-detail__header">
          <button
            type="button"
            class="settings-back-button"
            aria-label="返回配置"
            @click="closeSettingsView"
          >
            <ArrowLeft :size="22" />
          </button>
          <h1 class="settings-detail__title">主题设置</h1>
        </header>

        <div class="m3e-card">
          <div class="m3e-list">
            <div class="m3e-list-row settings-value-row">
              <span class="m3e-list-row__copy">
                <span class="m3e-list-row__title">界面风格</span>
              </span>
              <span class="settings-row-value">Material 3</span>
            </div>
            <div class="m3e-list-row settings-value-row">
              <span class="m3e-list-row__copy">
                <span class="m3e-list-row__title">主题模式</span>
              </span>
              <M3Select
                v-model="themeModeValue"
                :options="themeModes"
                variant="row"
                label="主题模式"
                aria-label="选择主题模式"
              />
            </div>
          </div>
        </div>

        <div class="m3e-card theme-group-card">
          <div class="m3e-list">
            <label class="m3e-list-row">
              <span class="m3e-list-row__copy">
                <span class="m3e-list-row__title">深色使用纯黑背景</span>
              </span>
              <span class="m3e-switch" aria-label="深色使用纯黑背景">
                <input
                  type="checkbox"
                  :checked="pureBlack"
                  @change="updatePureBlack($event.target.checked)"
                >
                <span class="m3e-switch__track">
                  <span class="m3e-switch__thumb" />
                </span>
              </span>
            </label>
          </div>
        </div>

        <div class="m3e-card theme-group-card">
          <div class="m3e-list">
            <div class="m3e-list-row settings-value-row palette-setting-row">
              <span class="m3e-list-row__copy">
                <span class="m3e-list-row__title">色彩风格</span>
              </span>
              <M3Select
                v-model="paletteValue"
                :options="paletteOptions"
                variant="row"
                label="色彩风格"
                aria-label="选择色彩风格"
              >
                <template #trigger="{ selected }">
                  <span class="palette-dots" aria-hidden="true">
                    <i
                      v-for="(color, index) in selected?.colors || []"
                      :key="index"
                      :style="{ backgroundColor: color }"
                    />
                  </span>
                  <span class="palette-trigger-label">{{ selected?.label }}</span>
                </template>
                <template #option-preview="{ option }">
                  <span class="palette-dots palette-dots--option" aria-hidden="true">
                    <i
                      v-for="(color, index) in option.colors"
                      :key="index"
                      :style="{ backgroundColor: color }"
                    />
                  </span>
                </template>
              </M3Select>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="settingsView === 'path'" key="path" class="settings-detail">
        <header class="settings-detail__header">
          <button
            type="button"
            class="settings-back-button"
            aria-label="返回配置"
            @click="closeSettingsView"
          >
            <ArrowLeft :size="22" />
          </button>
          <h1 class="settings-detail__title">访问路径</h1>
        </header>
        <div class="m3e-card m3e-card__body">
          <button
            type="button"
            class="m3e-button m3e-button--tonal m3e-button--wide"
            :class="{ 'is-loading': busy }"
            :disabled="busy"
            @click="runAction('regenerate-backend-path', () => moduleApi.regenerateBackendPath())"
          >
            <M3LoadingIndicator v-if="busy" :size="19" tone="inherit" />
            <RefreshCw v-else :size="18" />
            重新生成随机路径
          </button>
          <div v-if="status && pathIsDefault" class="m3e-error">
            <Route :size="18" />
            <span>当前仍为模块默认值，所有安装者相同，建议立即重新生成。</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.settings-panel {
  min-height: 0;
}

.settings-detail {
  display: grid;
  gap: 12px;
}

.settings-detail__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 4px 8px;
}

.settings-back-button {
  display: grid;
  flex: none;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  place-items: center;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  transition: background-color 140ms ease, transform 160ms var(--m3e-ease-spring);
}

.settings-back-button:hover {
  background: var(--md-sys-color-surface-container-highest);
}

.settings-back-button:active {
  transform: scale(0.94);
}

.settings-detail__title {
  margin: 0;
  font-size: 31px;
  font-weight: 520;
  line-height: 1.2;
}

.settings-chevron {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  transition: transform 160ms ease;
}

.env-toggle-icon.is-expanded {
  transform: rotate(90deg);
}

.env-inline {
  margin-top: 12px;
}

.settings-view-enter-active,
.settings-view-leave-active {
  transition: opacity 120ms ease, transform 160ms var(--m3e-ease-spring);
}

.settings-view-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.settings-view-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

.settings-value-row {
  min-height: 66px;
  justify-content: space-between;
}

.settings-row-value {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 14px;
}

.theme-group-card {
  background: var(--md-sys-color-surface-container-high);
}

.palette-setting-row {
  gap: 8px;
}

.palette-dots {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  margin-right: 3px;
}

.palette-dots i {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-sys-color-outline) 24%, transparent);
}

.palette-dots--option {
  width: 54px;
}

.palette-dots--option i {
  width: 13px;
  height: 13px;
}

.palette-trigger-label {
  min-width: 78px;
  text-align: right;
}

@media (max-width: 360px) {
  .settings-detail__title {
    font-size: 28px;
  }

  .palette-trigger-label {
    min-width: 0;
    max-width: 88px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
