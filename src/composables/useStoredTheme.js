import { computed, nextTick, ref, watch } from 'vue'
import { useStorage } from './useStorage'

const VALID_MODES = new Set(['system', 'light', 'dark'])
const storedMode = useStorage('themeMode', 'system')
const pureBlack = useStorage('pureBlack', false)
storedMode.value = VALID_MODES.has(storedMode.value) ? storedMode.value : 'system'
pureBlack.value = pureBlack.value === true

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
  root.classList.toggle('theme-black', pureBlack.value)
  root.style.colorScheme = resolvedMode.value
}

watch([resolvedMode, pureBlack], applyTheme, { immediate: true })

mediaQuery?.addEventListener?.('change', (event) => {
  systemDark.value = event.matches
})

function setThemeMode(nextMode) {
  storedMode.value = VALID_MODES.has(nextMode) ? nextMode : 'system'
}

function setPureBlack(enabled) {
  pureBlack.value = enabled === true
}

let transitionQueue = Promise.resolve()

async function runThemeTransition(update) {
  const apply = async () => {
    await update()
    await nextTick()
  }
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  if (!reducedMotion && typeof document.startViewTransition === 'function') {
    document.documentElement.classList.add('theme-changing')
    const transition = document.startViewTransition(apply)
    try {
      await transition?.finished
    } catch {
      /* Interrupted view transitions still leave the requested state applied. */
    } finally {
      document.documentElement.classList.remove('theme-changing')
    }
    return
  }
  await apply()
}

// Theme changes are serialized so snapshot transitions cannot overlap page
// motion or an immediately preceding palette change.
export function withThemeTransition(update) {
  transitionQueue = transitionQueue.then(
    () => runThemeTransition(update),
    () => runThemeTransition(update),
  )
  return transitionQueue
}

export function useStoredTheme() {
  return {
    mode: storedMode,
    resolvedMode,
    pureBlack,
    setThemeMode,
    setPureBlack,
  }
}
