import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { test, vi } from 'vitest'

async function setup(saved, seed = '#6750a4') {
  const classes = new Set()
  const elements = []
  const storage = new Map(saved === undefined ? [] : [['monetEnabled', JSON.stringify(saved)]])
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }
  globalThis.document = {
    documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } },
    createElement: (tag) => ({ tag }),
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

test('disabled by default: no host stylesheet or generated override', async () => {
  const state = await setup()
  assert.equal(state.monetEnabled.value, false)
  assert.equal(state.elements.length, 0)
  assert.equal(state.classes.has('m-theme-monet'), false)
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
  test(`${outcome} host stylesheet leaves the original theme untouched`, async () => {
    const state = await setup(true, outcome === 'invalid' ? 'invalid' : '')
    if (outcome === 'error') state.elements[0].onerror()
    else state.elements[0].onload()
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal(state.classes.has('m-theme-monet'), false)
    assert.equal(state.elements.filter((e) => e.tag === 'style').length, 0)
  })
}
