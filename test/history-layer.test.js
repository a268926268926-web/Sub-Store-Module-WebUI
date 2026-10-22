import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

async function setupHistory() {
  const states = [{ page: 'base' }]
  let popListener
  const windowMock = {
    addEventListener: (name, listener) => {
      if (name === 'popstate') popListener = listener
    },
    history: {
      get state() {
        return states.at(-1)
      },
      pushState: (state) => states.push(state),
      replaceState: (state) => {
        states[states.length - 1] = state
      },
      back: () => {
        states.pop()
        queueMicrotask(() => popListener?.({ state: states.at(-1) }))
      },
    },
  }
  globalThis.window = windowMock
  vi.resetModules()
  const history = await import('../src/composables/useHistoryLayer.js')
  return { history, states }
}

test('browser back closes only the most recent logical layer', async () => {
  const { history, states } = await setupHistory()
  const closeFirst = vi.fn()
  const closeSecond = vi.fn()
  history.pushHistoryLayer(closeFirst)
  history.pushHistoryLayer(closeSecond)

  assert.equal(states.length, 3)
  window.history.back()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(closeSecond.mock.calls.length, 1)
  assert.equal(closeFirst.mock.calls.length, 0)

  window.history.back()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(closeFirst.mock.calls.length, 1)
})

test('cancelling a hidden page layer consumes its history entry', async () => {
  const { history, states } = await setupHistory()
  const close = vi.fn()
  const token = history.pushHistoryLayer(close)
  assert.ok(states.at(-1).__substoreLayer)

  history.cancelHistoryLayer(token)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(states.length, 1)
  assert.equal(states[0].page, 'base')
  assert.equal(close.mock.calls.length, 0)
})

test('double-tapping close does not consume two history entries', async () => {
  const { history, states } = await setupHistory()
  const close = vi.fn()
  const token = history.pushHistoryLayer(close)

  assert.equal(history.closeHistoryLayer(token), true)
  assert.equal(history.closeHistoryLayer(token), false)
  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(states.length, 1)
  assert.equal(close.mock.calls.length, 1)
})
