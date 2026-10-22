import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createMonetPalettes } from '../src/theme/monet.js'

function luminance(hex) {
  const channels = hex.slice(1, 7).match(/../g).map((c) => parseInt(c, 16) / 255)
  const linear = channels.map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

for (const seed of ['#6750a4', '#008577', '#ff9800']) {
  test(`${seed}: generate distinct, readable light and dark palettes`, () => {
    const { light, dark } = createMonetPalettes(seed)
    assert.ok(luminance(light['--md-sys-color-background']) > 0.8)
    assert.ok(luminance(dark['--md-sys-color-background']) < 0.05)
    assert.notEqual(light['--md-sys-color-primary'], dark['--md-sys-color-primary'])

    for (const palette of [light, dark]) {
      for (const role of ['primary', 'primary-container', 'secondary', 'secondary-container', 'tertiary-container', 'error', 'error-container', 'background', 'surface']) {
        const ratio = contrast(palette[`--md-sys-color-${role}`], palette[`--md-sys-color-on-${role}`])
        assert.ok(ratio >= 4.5, `${role} contrast is only ${ratio}`)
      }
      for (const [token, color] of Object.entries(palette)) {
        assert.match(token, /^--md-sys-color-/)
        assert.match(color, /^#[0-9a-f]{6}([0-9a-f]{2})?$/i)
      }
    }
  })
}

test('use the host seed rather than a fixed fallback color', () => {
  const purple = createMonetPalettes('#6750a4')
  const green = createMonetPalettes('#008577')
  assert.notEqual(purple.light['--md-sys-color-primary'], green.light['--md-sys-color-primary'])
  assert.notEqual(purple.dark['--md-sys-color-primary'], green.dark['--md-sys-color-primary'])
})

test('accept opaque native CSS colors with an alpha channel', () => {
  assert.deepEqual(createMonetPalettes(' #6750a4ff '), createMonetPalettes('#6750a4'))
})

test('missing or invalid host colors do not generate a fallback palette', () => {
  for (const seed of ['', ' ', undefined, null, 'invalid', '#gggggg', '#12345', '#6750a400']) {
    assert.equal(createMonetPalettes(seed), null)
  }
})
