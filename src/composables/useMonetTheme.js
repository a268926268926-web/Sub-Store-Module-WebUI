import { ref, watch } from 'vue'
import {
  PALETTE_STYLE_OPTIONS,
  THEME_SEED_OPTIONS,
  createMonetPalettes,
} from '../theme/monet'
import { useStorage } from './useStorage'

const HOST_COLORS_URL = 'https://mui.kernelsu.org/internal/colors.css'
const DEFAULT_SEED = THEME_SEED_OPTIONS[0].value
const hostThemeSupported = typeof window !== 'undefined' && Boolean(window.ksu)

// Dynamic color follows the KernelSU host by default when available.
const monetEnabled = useStorage('monetEnabled', hostThemeSupported)
const themePalette = useStorage('themePalette', 'tonal')
const themeSeed = useStorage('themeSeed', DEFAULT_SEED)
const colorSource = useStorage('colorSource', 'host')
const hostSeedAvailable = ref(false)
const effectiveSeed = ref(DEFAULT_SEED)

monetEnabled.value = monetEnabled.value === true
if (!PALETTE_STYLE_OPTIONS.some((option) => option.value === themePalette.value)) {
  themePalette.value = 'tonal'
}
if (!/^#[0-9a-f]{6}$/i.test(themeSeed.value || '')) {
  themeSeed.value = DEFAULT_SEED
}
if (!['host', 'seed'].includes(colorSource.value)) colorSource.value = 'host'

let hostSeedPromise
let paletteStyle

const HOST_COLOR_TIMEOUT_MS = 3000

function normalizeCssColor(value) {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  if (
    typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && !CSS.supports('color', trimmed)
  ) return ''
  try {
    const context = document.createElement('canvas').getContext('2d')
    context.fillStyle = trimmed
    return context.fillStyle
  } catch {
    return ''
  }
}

function loadHostSeed() {
  if (!hostThemeSupported) return Promise.resolve('')
  if (!hostSeedPromise) {
    hostSeedPromise = new Promise((resolve) => {
      const link = document.createElement('link')
      let settled = false
      const finish = (seed) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (!seed) link.remove?.()
        resolve(seed)
      }
      link.rel = 'stylesheet'
      link.href = HOST_COLORS_URL
      link.onload = () => finish(normalizeCssColor(
        getComputedStyle(document.documentElement).getPropertyValue('--primary'),
      ))
      link.onerror = () => finish('')
      const timer = setTimeout(() => finish(''), HOST_COLOR_TIMEOUT_MS)
      document.head.append(link)
    }).then((seed) => {
      if (!seed) hostSeedPromise = undefined
      return seed
    }).catch(() => {
      hostSeedPromise = undefined
      return ''
    })
  }
  return hostSeedPromise
}

function rule(selector, colors) {
  const declarations = Object.entries(colors).map(([token, color]) => `${token}:${color}`).join(';')
  return `${selector}{${declarations}}`
}

watch(
  [monetEnabled, themePalette, themeSeed, colorSource],
  async ([enabled, , , source], _previous, onCleanup) => {
    const root = document.documentElement
    root.classList.remove('m-theme-monet')
    if (enabled !== true) {
      hostSeedAvailable.value = false
      effectiveSeed.value = themeSeed.value
      return
    }

    let cancelled = false
    onCleanup(() => { cancelled = true })
    const hostSeed = await loadHostSeed()
    if (cancelled) return
    const hostPalettes = hostSeed
      ? createMonetPalettes(hostSeed, themePalette.value)
      : null
    hostSeedAvailable.value = Boolean(hostPalettes)
    effectiveSeed.value = source === 'host' && hostPalettes ? hostSeed : themeSeed.value
    const palettes = (source === 'host' ? hostPalettes : null)
      || createMonetPalettes(themeSeed.value, themePalette.value)
    if (!palettes) return

    const css = rule(':root.m-theme-monet[data-theme="light"]', palettes.light)
      + rule(':root.m-theme-monet[data-theme="dark"]', palettes.dark)
    if (!paletteStyle) {
      paletteStyle = document.createElement('style')
      document.head.append(paletteStyle)
    }
    paletteStyle.textContent = css
    root.classList.add('m-theme-monet')
  },
  { immediate: true },
)

export function useMonetTheme() {
  return {
    monetEnabled,
    themePalette,
    themeSeed,
    colorSource,
    hostSeedAvailable,
    effectiveSeed,
    paletteStyleOptions: PALETTE_STYLE_OPTIONS,
    themeSeedOptions: THEME_SEED_OPTIONS,
  }
}
