<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import {
  Info,
  LayoutDashboard,
  Monitor,
  Moon,
  PackageOpen,
  RefreshCw,
  Settings2,
  Sun,
  X,
} from '@lucide/vue'
import { isBrowserDev, MODULE_VERSION, requestFullScreen } from './api/module'
import { useMonetTheme } from './composables/useMonetTheme'
import { useStoredTheme } from './composables/useStoredTheme'
import { useToast } from './composables/useToast'

const subtitle = MODULE_VERSION ? `v${MODULE_VERSION}` : ''
useMonetTheme()

const pages = [
  defineAsyncComponent(() => import('./pages/OverviewPage.vue')),
  defineAsyncComponent(() => import('./pages/UpdatesPage.vue')),
  defineAsyncComponent(() => import('./pages/SettingsPage.vue')),
  defineAsyncComponent(() => import('./pages/AboutPage.vue')),
]

const navItems = [
  {
    title: '概览',
    eyebrow: 'SUB-STORE ANDROID',
    description: '服务状态、访问入口与运行控制集中在这里。',
    icon: LayoutDashboard,
  },
  {
    title: '更新',
    eyebrow: 'COMPONENTS & SCHEDULE',
    description: '管理手动组件更新，以及关闭页面后仍会执行的后台计划。',
    icon: PackageOpen,
  },
  {
    title: '配置',
    eyebrow: 'SERVICE & ENVIRONMENT',
    description: '调整 M3E 外观、开机行为、访问路径和 Sub-Store 运行环境。',
    icon: Settings2,
  },
  {
    title: '关于',
    eyebrow: 'PROJECT INFORMATION',
    description: '上游项目、维护者、许可与模块来源。',
    icon: Info,
  },
]

const navIndex = ref(0)
const activePage = computed(() => pages[navIndex.value])
const activeNav = computed(() => navItems[navIndex.value])

const { mode, setThemeMode } = useStoredTheme()
const themeIcon = computed(() => {
  if (mode.value === 'light') return Sun
  if (mode.value === 'dark') return Moon
  return Monitor
})
const themeTitle = computed(() => {
  if (mode.value === 'light') return '当前浅色主题，切换到深色'
  if (mode.value === 'dark') return '当前深色主题，切换到跟随系统'
  return '当前跟随系统，切换到浅色'
})

function cycleTheme() {
  const next = { system: 'light', light: 'dark', dark: 'system' }
  setThemeMode(next[mode.value] || 'system')
}

const scrollerRef = ref(null)
const scrollPositions = new Map()
const isScrolled = ref(false)

function handleScroll(event) {
  isScrolled.value = event.currentTarget.scrollTop > 8
}

watch(
  navIndex,
  (_next, previous) => {
    if (scrollerRef.value) {
      scrollPositions.set(previous, scrollerRef.value.scrollTop)
    }
    nextTick(() => {
      if (scrollerRef.value) {
        scrollerRef.value.scrollTop = scrollPositions.get(navIndex.value) ?? 0
      }
    })
  },
)

const { toasts, dismissToast } = useToast()

onMounted(() => {
  requestFullScreen()
  if (!isBrowserDev) {
    const insets = document.createElement('link')
    insets.rel = 'stylesheet'
    insets.href = 'https://mui.kernelsu.org/internal/insets.css'
    document.head.append(insets)
  }
})

</script>

<template>
  <div class="app-shell">
    <header class="top-app-bar" :class="{ 'is-scrolled': isScrolled }">
      <div class="brand-mark" aria-hidden="true">
        <RefreshCw :size="21" :stroke-width="2.2" />
      </div>
      <div class="top-app-bar__copy">
        <p class="top-app-bar__title">Sub-Store Android</p>
        <p class="top-app-bar__subtitle">{{ subtitle || 'KernelSU WebUI' }}</p>
      </div>
      <div class="top-app-bar__actions">
        <button
          type="button"
          class="icon-button"
          :title="themeTitle"
          :aria-label="themeTitle"
          @click="cycleTheme"
        >
          <component :is="themeIcon" :size="22" :stroke-width="2" />
        </button>
      </div>
    </header>

    <main class="app-viewport">
      <div ref="scrollerRef" class="app-scroll" @scroll.passive="handleScroll">
        <div class="page-content" :data-module-version="subtitle">
          <header class="page-hero">
            <p class="page-hero__eyebrow">{{ activeNav.eyebrow }}</p>
            <h1 class="page-hero__title">{{ activeNav.title }}</h1>
            <p class="page-hero__description">{{ activeNav.description }}</p>
          </header>
          <Transition name="page" mode="out-in">
            <KeepAlive>
              <component :is="activePage" :key="navIndex" />
            </KeepAlive>
          </Transition>
        </div>
      </div>
    </main>

    <nav class="nav-rail" aria-label="主导航">
      <button
        v-for="(item, index) in navItems"
        :key="item.title"
        type="button"
        class="nav-rail__item"
        :class="{ 'is-active': navIndex === index }"
        :aria-current="navIndex === index ? 'page' : undefined"
        @click="navIndex = index"
      >
        <span class="nav-rail__icon">
          <component :is="item.icon" :size="22" :stroke-width="2.1" />
        </span>
        <span>{{ item.title }}</span>
      </button>
    </nav>

    <div class="bottom-dock-wrap">
      <nav class="bottom-dock" aria-label="主导航">
        <button
          v-for="(item, index) in navItems"
          :key="item.title"
          type="button"
          class="bottom-dock__item"
          :class="{ 'is-active': navIndex === index }"
          :aria-current="navIndex === index ? 'page' : undefined"
          @click="navIndex = index"
        >
          <span class="bottom-dock__icon">
            <component :is="item.icon" :size="21" :stroke-width="2.1" />
          </span>
          <span>{{ item.title }}</span>
        </button>
      </nav>
    </div>

    <div class="toast-host" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="{ 'toast--error': toast.tone === 'error' }"
        >
          <span style="flex: 1">{{ toast.message }}</span>
          <button
            type="button"
            class="icon-button"
            style="width: 32px; height: 32px"
            aria-label="关闭通知"
            @click="dismissToast(toast.id)"
          >
            <X :size="17" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
