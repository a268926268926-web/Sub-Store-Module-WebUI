<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue'
import {
  Info,
  LayoutDashboard,
  Monitor,
  Moon,
  PackageOpen,
  Settings2,
  Sun,
  X,
} from '@lucide/vue'
import { isBrowserDev, MODULE_VERSION, requestFullScreen } from './api/module'
import { useMonetTheme } from './composables/useMonetTheme'
import { useModuleState } from './composables/useModuleState'
import { useStoredTheme } from './composables/useStoredTheme'
import { useToast } from './composables/useToast'
import PageLoading from './components/PageLoading.vue'

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
    icon: LayoutDashboard,
  },
  {
    title: '更新',
    icon: PackageOpen,
  },
  {
    title: '配置',
    icon: Settings2,
  },
  {
    title: '关于',
    icon: Info,
  },
]

const navIndex = ref(0)
const activePage = computed(() => pages[navIndex.value])
const activeNav = computed(() => navItems[navIndex.value])
const pagePending = ref(false)
const { busy, loading } = useModuleState()
const showProgress = computed(() => pagePending.value || busy.value || loading.value)

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
        const nextScroll = scrollPositions.get(navIndex.value) ?? 0
        scrollerRef.value.scrollTop = nextScroll
        isScrolled.value = nextScroll > 8
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
      <p class="top-app-bar__page-title">{{ activeNav.title }}</p>
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
      <span v-if="showProgress" class="app-progress" aria-label="正在处理" />
    </header>

    <main class="app-viewport">
      <div ref="scrollerRef" class="app-scroll" @scroll.passive="handleScroll">
        <div class="page-content" :data-module-version="subtitle">
          <header class="page-hero">
            <h1 class="page-hero__title">{{ activeNav.title }}</h1>
          </header>
          <Transition name="page" mode="out-in">
            <Suspense @pending="pagePending = true" @resolve="pagePending = false">
              <KeepAlive>
                <component :is="activePage" :key="navIndex" />
              </KeepAlive>
              <template #fallback>
                <PageLoading />
              </template>
            </Suspense>
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
