import {
  Hct,
  SchemeExpressive,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeTonalSpot,
  SchemeVibrant,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities'

const SCHEMES = {
  tonal: SchemeTonalSpot,
  expressive: SchemeExpressive,
  vibrant: SchemeVibrant,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
}

const COLOR_ROLES = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'shadow',
  'scrim',
  'inverseSurface',
  'inverseOnSurface',
  'inversePrimary',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
]

function normalizeHex(seed) {
  if (typeof seed !== 'string') return null
  const value = seed.trim().toLowerCase()
  if (/^#[\da-f]{6}$/i.test(value)) return value
  if (/^#[\da-f]{3}$/i.test(value)) {
    return `#${value
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`
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
      if (channel.endsWith('%'))
        return Math.round(Number.parseFloat(channel) * 2.55)
      return Math.round(Number.parseFloat(channel))
    })
    if (parsed.some((channel) => !Number.isFinite(channel))) return null
    return `#${parsed.map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0')).join('')}`
  }

  const srgb = value.match(
    /^color\(\s*srgb\s+([^\s)]+)\s+([^\s)]+)\s+([^\s)]+)/,
  )
  if (srgb) {
    const parsed = srgb.slice(1, 4).map((channel) => {
      const numeric = Number.parseFloat(channel)
      return Number.isFinite(numeric)
        ? Math.round(Math.max(0, Math.min(1, numeric)) * 255)
        : NaN
    })
    if (parsed.some((channel) => !Number.isFinite(channel))) return null
    return `#${parsed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
  }
  return null
}

export function createMonetPalettes(seed, style = 'tonal') {
  const normalizedSeed = normalizeHex(seed)
  if (!normalizedSeed) return null
  const source = Hct.fromInt(argbFromHex(normalizedSeed))
  const Scheme = SCHEMES[style] || SCHEMES.tonal

  function palette(isDark) {
    const scheme = new Scheme(source, isDark, 0)
    return Object.fromEntries(
      COLOR_ROLES.map((role) => [
        `--md-sys-color-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
        hexFromArgb(scheme[role]),
      ]),
    )
  }
  return {
    light: palette(false),
    dark: palette(true),
    seed: normalizedSeed,
    style,
  }
}
