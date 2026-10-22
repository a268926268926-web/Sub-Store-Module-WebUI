import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { test, vi } from 'vitest'
import { createMonetPalettes } from '../src/theme/monet.js'

async function setup(saved, seed = '#6750a4', savedValues = {}) {
  const classes = new Set()
  const elements = []
  const storage = new Map(saved === undefined ? [] : [['monetEnabled', JSON.stringify(saved)]])
  for (const [key, value] of Object.entries(savedValues)) {
    storage.set(key, JSON.stringify(value))
  }
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }
  globalThis.window = {
    ksu: {},
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  }
  globalThis.CSS = {
    supports: (_property, value) => value !== 'invalid',
  }
  globalThis.document = {
    documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } },
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          getContext: () => ({
            fillStyle: '',
          }),
        }
      }
      return { tag }
    },
    head: { append: (element) => elements.push(element) },
  }
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => seed })
  vi.resetModules()
  const { useMonetTheme } = await import('../src/composables/useMonetTheme.js')
  return { ...useMonetTheme(), classes, elements, storage }
}

async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  assert.fail('Monet did not finish loading')
}

test('enabled by default on a supported host and loads the host palette', async () => {
  const state = await setup(undefined, '#008577', { themeSeed: '#6750a4' })
  assert.equal(state.monetEnabled.value, true)
  assert.equal(state.elements[0].href, 'https://mui.kernelsu.org/internal/colors.css')
  state.elements[0].onload()
  await waitFor(() => state.classes.has('m-theme-monet'))
  assert.equal(state.effectiveSeed.value, '#008577')
  const hostPrimary = createMonetPalettes('#008577').light['--md-sys-color-primary']
  assert.match(
    state.elements.find((element) => element.tag === 'style').textContent,
    new RegExp(`--md-sys-color-primary:${hostPrimary}`),
  )
})

for (const saved of [1, 0, 'true', 'false', null]) {
  test(`non-boolean saved value ${JSON.stringify(saved)} cannot show Monet as enabled`, async () => {
    const state = await setup(saved)
    assert.equal(state.monetEnabled.value, false)
    assert.equal(state.elements.length, 0)
    assert.equal(state.classes.has('m-theme-monet'), false)
    await nextTick()
    assert.equal(state.storage.get('monetEnabled'), 'false')
  })
}

test('restore saved preference, persist changes, and remove the override when disabled', async () => {
  const state = await setup(true)
  assert.equal(state.elements[0].href, 'https://mui.kernelsu.org/internal/colors.css')
  state.elements[0].onload()
  await waitFor(() => state.classes.has('m-theme-monet'))
  const css = state.elements.find((e) => e.tag === 'style').textContent
  assert.match(css, /:root\.m-theme-monet\[data-theme="light"\]\{/)
  assert.match(css, /:root\.m-theme-monet\[data-theme="dark"\]\{/)

  state.monetEnabled.value = false
  await nextTick()
  assert.equal(state.storage.get('monetEnabled'), 'false')
  assert.equal(state.classes.has('m-theme-monet'), false)
  state.monetEnabled.value = true
  await waitFor(() => state.classes.has('m-theme-monet'))
  assert.equal(state.storage.get('monetEnabled'), 'true')
  assert.equal(state.elements.filter((e) => e.tag === 'link').length, 1)
  assert.equal(state.elements.filter((e) => e.tag === 'style').length, 1)
})

test('a saved local seed still probes and enables the host color source', async () => {
  const state = await setup(true, '#6750a4', {
    colorSource: 'seed',
    themeSeed: '#00639b',
  })
  assert.equal(state.elements[0].href, 'https://mui.kernelsu.org/internal/colors.css')
  state.elements[0].onload()
  await waitFor(() => state.hostSeedAvailable.value)
  assert.equal(state.colorSource.value, 'seed')
  assert.equal(state.themeSeed.value, '#00639b')
  assert.equal(state.effectiveSeed.value, '#00639b')
})

test('a failed host color probe retries on the next theme change', async () => {
  const state = await setup(true)
  state.elements[0].onerror()
  await waitFor(() => state.classes.has('m-theme-monet'))
  assert.equal(state.hostSeedAvailable.value, false)

  state.themePalette.value = 'vibrant'
  await waitFor(() => state.elements.filter((element) => element.tag === 'link').length === 2)
  state.elements.filter((element) => element.tag === 'link').at(-1).onload()
  await waitFor(() => state.hostSeedAvailable.value)
})

test('a pending load cannot reactivate a switch that was turned off', async () => {
  const state = await setup()
  state.monetEnabled.value = true
  await nextTick()
  state.monetEnabled.value = false
  await nextTick()
  state.elements[0].onload()
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(state.classes.has('m-theme-monet'), false)
  assert.equal(state.elements.filter((e) => e.tag === 'style').length, 0)
  // The completed palette can still be reused on a later explicit enable.
  state.monetEnabled.value = true
  await waitFor(() => state.classes.has('m-theme-monet'))
  state.monetEnabled.value = false
  await nextTick()
  assert.equal(state.classes.has('m-theme-monet'), false)
  assert.equal(state.storage.get('monetEnabled'), 'false')
})

for (const outcome of ['empty', 'invalid', 'error']) {
  test(`${outcome} host stylesheet falls back to the selected local seed`, async () => {
    const state = await setup(true, outcome === 'invalid' ? 'invalid' : '')
    if (outcome === 'error') state.elements[0].onerror()
    else state.elements[0].onload()
    await waitFor(() => state.classes.has('m-theme-monet'))
    assert.equal(state.hostSeedAvailable.value, false)
    assert.equal(state.elements.filter((e) => e.tag === 'style').length, 1)
    assert.match(
      state.elements.find((e) => e.tag === 'style').textContent,
      /:root\.m-theme-monet\[data-theme="light"\]\{/,
    )
  })
}
