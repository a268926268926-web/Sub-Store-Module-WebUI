import { Hct, TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities'

export const PALETTE_STYLE_OPTIONS = [
  { value: 'tonal', label: '协调' },
  { value: 'expressive', label: '表现' },
  { value: 'vibrant', label: '鲜艳' },
  { value: 'neutral', label: '低饱和' },
  { value: 'monochrome', label: '单色' },
]

export const THEME_SEED_OPTIONS = [
  { label: '暮紫', value: '#6750a4' },
  { label: '湖蓝', value: '#00639b' },
  { label: '海松', value: '#006a67' },
  { label: '松林', value: '#4a672d' },
  { label: '靛青', value: '#5355a9' },
  { label: '珊瑚', value: '#b94073' },
  { label: '琥珀', value: '#8c5300' },
  { label: '岩灰', value: '#5f6162' },
]

const STYLE_CONFIG = {
  tonal: {
    primaryHue: 0,
    primaryChroma: 42,
    secondaryHue: 8,
    secondaryChroma: 16,
    tertiaryHue: 60,
    tertiaryChroma: 24,
    neutralChroma: 4,
  },
  expressive: {
    primaryHue: 10,
    primaryChroma: 54,
    secondaryHue: 28,
    secondaryChroma: 24,
    tertiaryHue: 112,
    tertiaryChroma: 34,
    neutralChroma: 6,
  },
  vibrant: {
    primaryHue: 0,
    primaryChroma: 78,
    secondaryHue: 18,
    secondaryChroma: 32,
    tertiaryHue: 48,
    tertiaryChroma: 54,
    neutralChroma: 7,
  },
  neutral: {
    primaryHue: 0,
    primaryChroma: 14,
    secondaryHue: 8,
    secondaryChroma: 8,
    tertiaryHue: 45,
    tertiaryChroma: 12,
    neutralChroma: 2,
  },
  monochrome: {
    primaryHue: 0,
    primaryChroma: 0,
    secondaryHue: 0,
    secondaryChroma: 0,
    tertiaryHue: 0,
    tertiaryChroma: 0,
    neutralChroma: 0,
  },
}

const TONES = {
  light: {
    primary: 40,
    onPrimary: 100,
    primaryContainer: 90,
    onPrimaryContainer: 10,
    secondary: 40,
    onSecondary: 100,
    secondaryContainer: 90,
    onSecondaryContainer: 10,
    tertiary: 40,
    onTertiary: 100,
    tertiaryContainer: 90,
    onTertiaryContainer: 10,
    error: 40,
    onError: 100,
    errorContainer: 90,
    onErrorContainer: 10,
    background: 98,
    onBackground: 10,
    surface: 98,
    onSurface: 10,
    surfaceVariant: 90,
    onSurfaceVariant: 30,
    outline: 50,
    outlineVariant: 80,
    inverseSurface: 20,
    inverseOnSurface: 95,
    inversePrimary: 80,
    surfaceDim: 87,
    surfaceBright: 98,
    lowest: 100,
    low: 96,
    container: 94,
    high: 92,
    highest: 90,
  },
  dark: {
    primary: 80,
    onPrimary: 20,
    primaryContainer: 30,
    onPrimaryContainer: 90,
    secondary: 80,
    onSecondary: 20,
    secondaryContainer: 30,
    onSecondaryContainer: 90,
    tertiary: 80,
    onTertiary: 20,
    tertiaryContainer: 30,
    onTertiaryContainer: 90,
    error: 80,
    onError: 20,
    errorContainer: 30,
    onErrorContainer: 90,
    background: 6,
    onBackground: 90,
    surface: 6,
    onSurface: 90,
    surfaceVariant: 30,
    onSurfaceVariant: 80,
    outline: 60,
    outlineVariant: 30,
    inverseSurface: 90,
    inverseOnSurface: 20,
    inversePrimary: 40,
    surfaceDim: 6,
    surfaceBright: 24,
    lowest: 4,
    low: 6,
    container: 12,
    high: 17,
    highest: 22,
  },
}

function normalizeHex(seed) {
  if (typeof seed !== 'string') return null
  const value = seed.trim().toLowerCase()
  if (/^#[\da-f]{6}$/i.test(value)) return value
  if (/^#[\da-f]{3}$/i.test(value)) {
    return `#${value.slice(1).split('').map((part) => `${part}${part}`).join('')}`
  }
  if (/^#[\da-f]{8}$/i.test(value)) {
    return value.endsWith('00') ? null : value.slice(0, 7)
  }

  const rgb = value.match(/^rgba?\(\s*([^)]+)\)$/i)
  if (rgb) {
    const allChannels = rgb[1].split(/[,\s/]+/).filter(Boolean)
    const channels = allChannels.slice(0, 3)
    if (channels.length !== 3) return null
    if (allChannels[3] != null) {
      const alpha = allChannels[3].endsWith('%')
        ? Number.parseFloat(allChannels[3]) / 100
        : Number.parseFloat(allChannels[3])
      if (!Number.isFinite(alpha) || alpha <= 0) return null
    }
    const parsed = channels.map((channel) => {
      if (channel.endsWith('%')) {
        return Math.round(Number.parseFloat(channel) * 2.55)
      }
      return Math.round(Number.parseFloat(channel))
    })
    if (parsed.some((channel) => !Number.isFinite(channel))) return null
    return `#${parsed.map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0')).join('')}`
  }

  const srgb = value.match(/^color\(\s*srgb\s+([^\s)]+)\s+([^\s)]+)\s+([^\s)]+)/)
  if (srgb) {
    const parsed = srgb.slice(1, 4).map((channel) => {
      const numeric = Number.parseFloat(channel)
      return Number.isFinite(numeric) ? Math.round(Math.max(0, Math.min(1, numeric)) * 255) : NaN
    })
    if (parsed.some((channel) => !Number.isFinite(channel))) return null
    return `#${parsed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
  }

  return null
}

function tone(palette, value) {
  return hexFromArgb(palette.tone(value))
}

export function createMonetPalettes(seed, style = 'tonal') {
  const normalizedSeed = normalizeHex(seed)
  if (!normalizedSeed) return null

  const source = Hct.fromInt(argbFromHex(normalizedSeed))
  const config = STYLE_CONFIG[style] || STYLE_CONFIG.tonal
  const primary = TonalPalette.fromHueAndChroma(
    source.hue + config.primaryHue,
    Math.max(source.chroma, config.primaryChroma),
  )
  const secondary = TonalPalette.fromHueAndChroma(
    source.hue + config.secondaryHue,
    config.secondaryChroma,
  )
  const tertiary = TonalPalette.fromHueAndChroma(
    source.hue + config.tertiaryHue,
    config.tertiaryChroma,
  )
  const neutral = TonalPalette.fromHueAndChroma(source.hue, config.neutralChroma)
  const neutralVariant = TonalPalette.fromHueAndChroma(source.hue, Math.max(8, config.neutralChroma + 4))
  const error = TonalPalette.fromHueAndChroma(25, style === 'monochrome' ? 0 : 84)

  function palette(isDark) {
    const t = isDark ? TONES.dark : TONES.light
    return {
      '--md-sys-color-primary': tone(primary, t.primary),
      '--md-sys-color-on-primary': tone(primary, t.onPrimary),
      '--md-sys-color-primary-container': tone(primary, t.primaryContainer),
      '--md-sys-color-on-primary-container': tone(primary, t.onPrimaryContainer),
      '--md-sys-color-secondary': tone(secondary, t.secondary),
      '--md-sys-color-on-secondary': tone(secondary, t.onSecondary),
      '--md-sys-color-secondary-container': tone(secondary, t.secondaryContainer),
      '--md-sys-color-on-secondary-container': tone(secondary, t.onSecondaryContainer),
      '--md-sys-color-tertiary': tone(tertiary, t.tertiary),
      '--md-sys-color-on-tertiary': tone(tertiary, t.onTertiary),
      '--md-sys-color-tertiary-container': tone(tertiary, t.tertiaryContainer),
      '--md-sys-color-on-tertiary-container': tone(tertiary, t.onTertiaryContainer),
      '--md-sys-color-error': tone(error, t.error),
      '--md-sys-color-on-error': tone(error, t.onError),
      '--md-sys-color-error-container': tone(error, t.errorContainer),
      '--md-sys-color-on-error-container': tone(error, t.onErrorContainer),
      '--md-sys-color-background': tone(neutral, t.background),
      '--md-sys-color-on-background': tone(neutral, t.onBackground),
      '--md-sys-color-surface': tone(neutral, t.surface),
      '--md-sys-color-on-surface': tone(neutral, t.onSurface),
      '--md-sys-color-surface-variant': tone(neutralVariant, t.surfaceVariant),
      '--md-sys-color-on-surface-variant': tone(neutralVariant, t.onSurfaceVariant),
      '--md-sys-color-outline': tone(neutralVariant, t.outline),
      '--md-sys-color-outline-variant': tone(neutralVariant, t.outlineVariant),
      '--md-sys-color-shadow': '#000000',
      '--md-sys-color-scrim': '#000000',
      '--md-sys-color-inverse-surface': tone(neutral, t.inverseSurface),
      '--md-sys-color-inverse-on-surface': tone(neutral, t.inverseOnSurface),
      '--md-sys-color-inverse-primary': tone(primary, t.inversePrimary),
      '--md-sys-color-surface-dim': tone(neutral, t.surfaceDim),
      '--md-sys-color-surface-bright': tone(neutral, t.surfaceBright),
      '--md-sys-color-surface-container-lowest': tone(neutral, t.lowest),
      '--md-sys-color-surface-container-low': tone(neutral, t.low),
      '--md-sys-color-surface-container': tone(neutral, t.container),
      '--md-sys-color-surface-container-high': tone(neutral, t.high),
      '--md-sys-color-surface-container-highest': tone(neutral, t.highest),
    }
  }

  return { light: palette(false), dark: palette(true), seed: normalizedSeed, style }
}
