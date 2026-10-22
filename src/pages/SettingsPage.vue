<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import {
  Check,
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
import { useStoredTheme, withThemeTransition } from '../composables/useStoredTheme'
import * as moduleApi from '../api/module'
import { createMonetPalettes } from '../theme/monet'

const { status, busy, refreshStatus, runAction } = useModuleState()
const { mode, setThemeMode } = useStoredTheme()
const {
  monetEnabled,
  themePalette,
  themeSeed,
  colorSource,
  hostSeedAvailable,
  effectiveSeed,
  paletteStyleOptions,
  themeSeedOptions,
} = useMonetTheme()

const themeModes = [
  { value: 'system', label: '系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
]

const currentThemeMode = computed(() => mode.value)
const displayedColorSource = computed(() => (
  hostSeedAvailable.value ? colorSource.value : 'seed'
))
const paletteStylePreviews = computed(() => paletteStyleOptions.map((style) => {
  const palette = createMonetPalettes(effectiveSeed.value, style.value)?.light
  return {
    ...style,
    primary: palette?.['--md-sys-color-primary'] || '#456823',
    secondary: palette?.['--md-sys-color-secondary'] || '#54634d',
    tertiary: palette?.['--md-sys-color-tertiary'] || '#386664',
  }
}))

function updateThemeMode(value) {
  withThemeTransition(() => setThemeMode(value))
}

function updateMonet(enabled) {
  withThemeTransition(() => {
    monetEnabled.value = enabled
  })
}

function updatePalette(value) {
  withThemeTransition(() => {
    themePalette.value = value
  })
}

function updateColorSource(value) {
  withThemeTransition(() => {
    colorSource.value = value
  })
}

function updateSeed(value) {
  withThemeTransition(() => {
    themeSeed.value = value
    colorSource.value = 'seed'
  })
}

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
            @click="updateThemeMode(item.value)"
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
            <p class="m3e-list-row__title">动态色彩</p>
            <p class="m3e-list-row__summary">
              跟随宿主配色，也可以用自选种子色生成本地 Material 3 色板
            </p>
          </div>
          <label class="m3e-switch" aria-label="启用动态色彩">
            <input
              type="checkbox"
              :checked="monetEnabled"
              @change="updateMonet($event.target.checked)"
            >
            <span class="m3e-switch__track">
              <span class="m3e-switch__thumb" />
            </span>
          </label>
        </div>
      </div>

      <Transition name="theme-studio">
        <div v-if="monetEnabled" class="theme-studio">
          <div class="m3e-field">
            <span class="m3e-field__label">取色来源</span>
            <div class="segmented-control" role="tablist" aria-label="取色来源">
              <button
                type="button"
                role="tab"
                :aria-selected="displayedColorSource === 'host'"
                :disabled="!hostSeedAvailable"
                @click="updateColorSource('host')"
              >
                宿主配色
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="displayedColorSource === 'seed'"
                @click="updateColorSource('seed')"
              >
                自选种子
              </button>
            </div>
          </div>

          <div class="m3e-field">
            <span class="m3e-field__label">色板风格</span>
            <div class="palette-style-grid">
              <button
                v-for="style in paletteStylePreviews"
                :key="style.value"
                type="button"
                class="palette-style"
                :class="{ 'is-selected': themePalette === style.value }"
                :aria-pressed="themePalette === style.value"
                @click="updatePalette(style.value)"
              >
                <span
                  class="palette-style__preview"
                  :data-style="style.value"
                  :style="{
                    '--preview-primary': style.primary,
                    '--preview-secondary': style.secondary,
                    '--preview-tertiary': style.tertiary,
                  }"
                >
                  <i />
                  <i />
                  <i />
                </span>
                <span>{{ style.label }}</span>
                <Check v-if="themePalette === style.value" :size="15" />
              </button>
            </div>
          </div>

          <div class="m3e-field">
            <span class="m3e-field__label">种子色</span>
            <div class="seed-grid">
              <button
                v-for="seed in themeSeedOptions"
                :key="seed.value"
                type="button"
                class="seed-swatch"
                :class="{ 'is-selected': themeSeed === seed.value && displayedColorSource === 'seed' }"
                :aria-label="`使用${seed.label}作为种子色`"
                :aria-pressed="themeSeed === seed.value && displayedColorSource === 'seed'"
                @click="updateSeed(seed.value)"
              >
                <span class="seed-swatch__dot" :style="{ backgroundColor: seed.value }">
                  <Check
                    v-if="themeSeed === seed.value && displayedColorSource === 'seed'"
                    :size="17"
                  />
                </span>
                <span>{{ seed.label }}</span>
              </button>
            </div>
            <p class="theme-studio__hint">
              {{ hostSeedAvailable ? '宿主配色可用；选择种子色会自动切换到自选模式。' : '当前宿主未提供动态色，使用自选种子色生成配色。' }}
            </p>
          </div>
        </div>
      </Transition>
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

.theme-studio {
  display: grid;
  gap: 18px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.theme-studio__hint {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
  line-height: 1.5;
}

.palette-style-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.palette-style {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 9px;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--m3e-radius-md);
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  font-size: 13px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, background-color 180ms ease, border-radius 240ms var(--m3e-ease-expressive);
}

.palette-style.is-selected {
  border-color: var(--md-sys-color-primary);
  border-radius: 14px 22px 14px 22px;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.palette-style__preview {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 34px;
  height: 32px;
  padding: 5px;
  border-radius: 11px;
  background: var(--md-sys-color-surface-container-highest);
}

.palette-style__preview i {
  display: block;
  flex: 1;
  border-radius: 999px;
}

.palette-style__preview i:nth-child(1) {
  height: 18px;
  background: var(--preview-primary);
}

.palette-style__preview i:nth-child(2) {
  height: 12px;
  background: var(--preview-secondary);
}

.palette-style__preview i:nth-child(3) {
  height: 7px;
  background: var(--preview-tertiary);
}

.palette-style__preview[data-style='expressive'] i:nth-child(1) {
  height: 8px;
}

.palette-style__preview[data-style='expressive'] i:nth-child(2) {
  height: 20px;
}

.palette-style__preview[data-style='vibrant'] {
  transform: rotate(-4deg);
}

.palette-style__preview[data-style='neutral'] i {
  background: var(--md-sys-color-on-surface-variant);
}

.palette-style__preview[data-style='monochrome'] i {
  background: var(--md-sys-color-on-surface);
}

.seed-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.seed-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 7px 2px;
  border: 0;
  border-radius: var(--m3e-radius-md);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
  font-weight: 620;
  cursor: pointer;
}

.seed-swatch__dot {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 3px solid var(--md-sys-color-surface-container-low);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--md-sys-color-outline-variant);
  color: #fff;
  transition: transform 220ms var(--m3e-ease-expressive), box-shadow 180ms ease;
}

.seed-swatch.is-selected .seed-swatch__dot {
  transform: scale(1.08);
  box-shadow: 0 0 0 2px var(--md-sys-color-primary);
}

.theme-studio-enter-active,
.theme-studio-leave-active {
  transition: opacity 180ms ease, transform 260ms var(--m3e-ease-spring);
}

.theme-studio-enter-from,
.theme-studio-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 360px) {
  .palette-style-grid {
    grid-template-columns: 1fr;
  }
}
</style>
