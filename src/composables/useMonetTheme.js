import { watch } from 'vue'
import { useStorage } from './useStorage'

const monetEnabled = useStorage('monetEnabled', false)
monetEnabled.value = monetEnabled.value === true

let palettesPromise
let paletteStyle

function loadPalettes() {
  if (!palettesPromise) {
    palettesPromise = new Promise((resolve) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://mui.kernelsu.org/internal/colors.css'
      link.onload = () => resolve(getComputedStyle(document.documentElement).getPropertyValue('--primary'))
      link.onerror = () => resolve('')
      document.head.append(link)
    }).then(async (seed) => {
      if (!seed.trim()) return null
      const { createMonetPalettes } = await import('../theme/monet.js')
      return createMonetPalettes(seed)
    }).catch(() => null)
  }
  return palettesPromise
}

function rule(selector, colors) {
  const declarations = Object.entries(colors).map(([token, color]) => `${token}:${color}`).join(';')
  return `${selector}{${declarations}}`
}

watch(monetEnabled, async (enabled, _previous, onCleanup) => {
  const root = document.documentElement
  root.classList.remove('m-theme-monet')
  if (enabled !== true) return

  let cancelled = false
  onCleanup(() => { cancelled = true })
  const palettes = await loadPalettes()
  if (cancelled || !palettes) return

  if (!paletteStyle) {
    paletteStyle = document.createElement('style')
    paletteStyle.textContent = rule(':root.m-theme-monet[data-theme="light"]', palettes.light)
      + rule(':root.m-theme-monet[data-theme="dark"]', palettes.dark)
    document.head.append(paletteStyle)
  }
  root.classList.add('m-theme-monet')
}, { immediate: true })

export function useMonetTheme() {
  return { monetEnabled }
}
