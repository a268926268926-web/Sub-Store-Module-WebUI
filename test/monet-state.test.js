import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { test, vi } from 'vitest'
import { createMonetPalettes } from '../src/theme/monet.js'
import { DEFAULT_THEME_SEED } from '../src/theme/paletteConfig.js'

async function setup({ host = true, seed = '#6750a4', savedValues = {} } = {}) {
  const classes = new Set()
  const elements = []
  const storage = new Map()
  for (const [key, value] of Object.entries(savedValues)) {
    storage.set(key, JSON.stringify(value))
  }
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }
  globalThis.window = {
    ksu: host ? {} : undefined,
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  }
  globalThis.CSS = {
    supports: (_property, value) => value !== 'invalid',
  }
  globalThis.document = {
    documentElement: { classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value) } },
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          getContext: () => ({
            fillStyle: '',
          }),
        }
      }
      return { tag, remove: vi.fn() }
    },
    head: { append: (element) => elements.push(element) },
  }
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => seed })
  vi.resetModules()
  const { useMonetTheme } = await import('../src/composables/useMonetTheme.js')
  return { ...useMonetTheme(), classes, elements, storage }
}

async function waitFor(predicate) {
  for (let index = 0; index < 100; index++) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  assert.fail('Monet did not finish loading')
}

test('loads the host seed and applies generated light and dark palettes', async () => {
  const state = await setup({ seed: '#008577' })
  assert.equal(state.elements[0].href, 'https://mui.kernelsu.org/internal/colors.css')
  state.elements[0].onload()
  await waitFor(() => state.classes.has('m-theme-monet'))

  assert.equal(state.hostSeedAvailable.value, true)
  assert.equal(state.effectiveSeed.value, '#008577')
  const hostPrimary = createMonetPalettes('#008577').light['--md-sys-color-primary']
  const css = state.elements.find((element) => element.tag === 'style').textContent
  assert.match(css, new RegExp(`--md-sys-color-primary:${hostPrimary}`))
  assert.match(css, /:root\.m-theme-monet\[data-theme="dark"\]\{/)
})

test('persists a supported palette style without exposing seed controls', async () => {
  const state = await setup({ savedValues: { themePalette: 'vibrant' } })
  state.elements[0].onload()
  await waitFor(() => state.classes.has('m-theme-monet'))
  assert.equal(state.themePalette.value, 'vibrant')
  assert.equal(state.storage.get('themePalette'), '"vibrant"')
  assert.equal(state.storage.has('monetEnabled'), false)
  assert.equal(state.storage.has('themeSeed'), false)
  assert.equal(state.storage.has('colorSource'), false)
})

test('invalid stored palette style falls back to tonal', async () => {
  const state = await setup({ savedValues: { themePalette: 'unknown' } })
  await nextTick()
  assert.equal(state.themePalette.value, 'tonal')
  assert.equal(state.storage.get('themePalette'), '"tonal"')
})

test('failed host color probe uses the fixed fallback palette', async () => {
  const state = await setup()
  state.elements[0].onerror()
  await waitFor(() => state.classes.has('m-theme-monet'))
  assert.equal(state.hostSeedAvailable.value, false)
  assert.equal(state.effectiveSeed.value, DEFAULT_THEME_SEED)
  assert.ok(state.elements.some((element) => element.tag === 'style'))
})

test('palette changes reuse one host stylesheet and replace the generated CSS', async () => {
  const state = await setup()
  state.elements[0].onload()
  await waitFor(() => state.hostSeedAvailable.value)
  const firstCss = state.elements.find((element) => element.tag === 'style').textContent

  state.themePalette.value = 'monochrome'
  await waitFor(() => {
    const css = state.elements.find((element) => element.tag === 'style')?.textContent
    return css && css !== firstCss
  })
  assert.equal(state.elements.filter((element) => element.tag === 'link').length, 1)
  assert.equal(state.elements.filter((element) => element.tag === 'style').length, 1)
})

test('plain browser environments skip the host probe and still generate a palette', async () => {
  const state = await setup({ host: false })
  await waitFor(() => state.classes.has('m-theme-monet'))
  assert.equal(state.elements.filter((element) => element.tag === 'link').length, 0)
  assert.equal(state.hostSeedAvailable.value, false)
  assert.equal(state.effectiveSeed.value, DEFAULT_THEME_SEED)
})
