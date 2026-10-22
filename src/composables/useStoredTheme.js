import { computed, ref, watch } from 'vue'
import { useStorage } from './useStorage'

const VALID_MODES = new Set(['system', 'light', 'dark'])
const storedMode = useStorage('themeMode', 'system')
storedMode.value = VALID_MODES.has(storedMode.value) ? storedMode.value : 'system'

const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
const systemDark = ref(mediaQuery?.matches ?? false)
const resolvedMode = computed(() => {
  if (storedMode.value === 'system') return systemDark.value ? 'dark' : 'light'
  return storedMode.value
})

function applyTheme() {
  const root = document.documentElement
  root.dataset.theme = resolvedMode.value
  root.classList.toggle('theme-dark', resolvedMode.value === 'dark')
  root.style.colorScheme = resolvedMode.value
}

watch(resolvedMode, applyTheme, { immediate: true })

mediaQuery?.addEventListener?.('change', (event) => {
  systemDark.value = event.matches
})

function setThemeMode(nextMode) {
  storedMode.value = VALID_MODES.has(nextMode) ? nextMode : 'system'
}

export function useStoredTheme() {
  return { mode: storedMode, resolvedMode, setThemeMode }
}
