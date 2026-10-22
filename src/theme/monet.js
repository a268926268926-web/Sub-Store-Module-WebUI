import { Hct, SchemeExpressive, argbFromHex, hexFromArgb } from '@material/material-color-utilities'

// KernelSU exposes only the host seed color. Generate complete light/dark
// Material 3 role sets and expose them as CSS custom properties.
const roles = {
  primary: 'primary',
  'on-primary': 'onPrimary',
  'primary-container': 'primaryContainer',
  'on-primary-container': 'onPrimaryContainer',
  secondary: 'secondary',
  'on-secondary': 'onSecondary',
  'secondary-container': 'secondaryContainer',
  'on-secondary-container': 'onSecondaryContainer',
  tertiary: 'tertiary',
  'on-tertiary': 'onTertiary',
  'tertiary-container': 'tertiaryContainer',
  'on-tertiary-container': 'onTertiaryContainer',
  error: 'error',
  'on-error': 'onError',
  'error-container': 'errorContainer',
  'on-error-container': 'onErrorContainer',
  background: 'background',
  'on-background': 'onBackground',
  surface: 'surface',
  'on-surface': 'onSurface',
  'surface-variant': 'surfaceVariant',
  'on-surface-variant': 'onSurfaceVariant',
  outline: 'outline',
  'outline-variant': 'outlineVariant',
  shadow: 'shadow',
  scrim: 'scrim',
  'inverse-surface': 'inverseSurface',
  'inverse-on-surface': 'inverseOnSurface',
  'inverse-primary': 'inversePrimary',
  'surface-dim': 'surfaceDim',
  'surface-bright': 'surfaceBright',
  'surface-container-lowest': 'surfaceContainerLowest',
  'surface-container-low': 'surfaceContainerLow',
  'surface-container': 'surfaceContainer',
  'surface-container-high': 'surfaceContainerHigh',
  'surface-container-highest': 'surfaceContainerHighest',
}

export function createMonetPalettes(seed) {
  if (typeof seed !== 'string' || !/^#[\da-f]{6}(ff)?$/i.test(seed.trim())) return null
  const source = Hct.fromInt(argbFromHex(seed.trim().slice(0, 7)))

  function palette(isDark) {
    const scheme = new SchemeExpressive(source, isDark, 0)
    return Object.fromEntries(
      Object.entries(roles).map(([token, role]) => [
        `--md-sys-color-${token}`,
        hexFromArgb(scheme[role]),
      ]),
    )
  }

  return { light: palette(false), dark: palette(true) }
}
