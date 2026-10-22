import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import { test, vi } from 'vitest'

async function setup({ matchDark = true, saved = {} } = {}) {
  const storage = new Map()
  for (const [key, value] of Object.entries(saved)) {
    storage.set(key, JSON.stringify(value))
  }
  const classes = new Set()
  const root = {
    dataset: {},
    classList: {
      toggle: (name, enabled) => {
        if (enabled) classes.add(name)
        else classes.delete(name)
      },
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    style: {},
  }
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  }
  globalThis.window = {
    matchMedia: () => ({
      matches: matchDark,
      addEventListener: () => {},
    }),
  }
  globalThis.document = { documentElement: root }
  vi.resetModules()
  const theme = await import('../src/composables/useStoredTheme.js')
  return { ...theme.useStoredTheme(), classes, root, storage }
}

test('resolves the system theme and allows pure-black dark surfaces', async () => {
  const theme = await setup()
  assert.equal(theme.resolvedMode.value, 'dark')
  assert.equal(theme.root.dataset.theme, 'dark')
  assert.equal(theme.classes.has('theme-dark'), true)
  assert.equal(theme.classes.has('theme-black'), false)

  theme.setPureBlack(true)
  await nextTick()
  assert.equal(theme.classes.has('theme-black'), true)
  assert.equal(theme.storage.get('pureBlack'), 'true')
})

test('restores light mode while retaining the pure-black preference for later', async () => {
  const theme = await setup({
    matchDark: true,
    saved: { themeMode: 'light', pureBlack: true },
  })
  assert.equal(theme.resolvedMode.value, 'light')
  assert.equal(theme.classes.has('theme-dark'), false)
  assert.equal(theme.classes.has('theme-black'), true)
})
