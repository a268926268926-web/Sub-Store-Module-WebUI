import { ref, watch } from 'vue'
import {
  DEFAULT_THEME_SEED,
  PALETTE_STYLE_OPTIONS,
} from '../theme/paletteConfig'
import { useStorage } from './useStorage'

const HOST_COLORS_URL = 'https://mui.kernelsu.org/internal/colors.css'
const hostThemeSupported = typeof window !== 'undefined' && Boolean(window.ksu)

const themePalette = useStorage('themePalette', 'tonal')
const hostSeedAvailable = ref(false)
const effectiveSeed = ref(DEFAULT_THEME_SEED)

if (!PALETTE_STYLE_OPTIONS.some((option) => option.value === themePalette.value)) {
  themePalette.value = 'tonal'
}

let hostSeedPromise
let paletteStyle
let createMonetPalettes

const HOST_COLOR_TIMEOUT_MS = 3000

async function loadPaletteFactory() {
  if (!createMonetPalettes) {
    ({ createMonetPalettes } = await import('../theme/monet'))
  }
  return createMonetPalettes
}

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
  themePalette,
  async (paletteStyleName, _previous, onCleanup) => {
    const root = document.documentElement
    root.classList.remove('m-theme-monet')

    let cancelled = false
    onCleanup(() => { cancelled = true })
    try {
      const hostSeed = await loadHostSeed()
      if (cancelled) return
      const createPalette = await loadPaletteFactory()
      if (cancelled) return
      const hostPalettes = hostSeed
        ? createPalette(hostSeed, paletteStyleName)
        : null
      hostSeedAvailable.value = Boolean(hostPalettes)
      effectiveSeed.value = hostPalettes ? hostSeed : DEFAULT_THEME_SEED
      const palettes = hostPalettes || createPalette(DEFAULT_THEME_SEED, paletteStyleName)
      if (!palettes) return

      const css = rule(':root.m-theme-monet[data-theme="light"]', palettes.light)
        + rule(':root.m-theme-monet[data-theme="dark"]', palettes.dark)
      if (!paletteStyle) {
        paletteStyle = document.createElement('style')
        document.head.append(paletteStyle)
      }
      paletteStyle.textContent = css
      root.classList.add('m-theme-monet')
    } catch {
      // A failed lazy palette chunk must not prevent the base theme from
      // rendering; the next palette selection will retry the import.
      createMonetPalettes = undefined
      hostSeedAvailable.value = false
      effectiveSeed.value = DEFAULT_THEME_SEED
    }
  },
  { immediate: true },
)

export function useMonetTheme() {
  return {
    themePalette,
    hostSeedAvailable,
    effectiveSeed,
    paletteStyleOptions: PALETTE_STYLE_OPTIONS,
  }
}
