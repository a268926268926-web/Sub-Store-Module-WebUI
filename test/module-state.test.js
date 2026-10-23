import assert from 'node:assert/strict'
import { beforeEach, test, vi } from 'vitest'

const api = vi.hoisted(() => ({ getStatus: vi.fn() }))
vi.mock('../src/api/module', () => api)
vi.mock('../src/composables/useToast', () => ({ showToast: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
})

async function setup() {
  const { useModuleState } =
    await import('../src/composables/useModuleState.js')
  return useModuleState()
}

test('keeps the last snapshot but marks it stale until a successful retry', async () => {
  const state = await setup()
  api.getStatus.mockResolvedValue({ serviceRunning: true })
  assert.equal(await state.refreshStatus(), true)
  const firstTime = state.refreshedAt.value
  api.getStatus.mockRejectedValueOnce(new Error('bridge disconnected'))
  assert.equal(await state.refreshStatus(), false)
  assert.equal(state.stale.value, true)
  assert.equal(state.status.value.serviceRunning, true)
  assert.equal(state.refreshedAt.value, firstTime)
  assert.equal(state.loading.value, false)
  assert.equal(state.refreshing.value, false)
  api.getStatus.mockResolvedValue({ serviceRunning: false })
  assert.equal(await state.refreshStatus(), true)
  assert.equal(state.stale.value, false)
  assert.equal(state.statusError.value, '')
})

test('a first-load failure remains unknown rather than fabricating a service state', async () => {
  const state = await setup()
  api.getStatus.mockRejectedValue(new Error('not available'))
  await state.refreshStatus()
  assert.equal(state.status.value, null)
  assert.equal(state.statusError.value, 'not available')
})

test('overlapping page refreshes share one request and retain operation errors', async () => {
  const state = await setup()
  let resolveStatus
  api.getStatus.mockReturnValue(
    new Promise((resolve) => {
      resolveStatus = resolve
    }),
  )
  state.error.value = 'previous operation failed'
  const first = state.refreshStatus()
  const second = state.refreshStatus()
  assert.equal(api.getStatus.mock.calls.length, 1)
  assert.equal(state.refreshing.value, true)
  resolveStatus({ serviceRunning: true })
  assert.deepEqual(await Promise.all([first, second]), [true, true])
  assert.equal(state.error.value, 'previous operation failed')
})

test('only the owner can release a module operation', async () => {
  const state = await setup()
  const token = state.acquireOperation('update')
  assert.ok(token)
  assert.equal(state.acquireOperation('restart'), null)
  state.releaseOperation(Symbol('other'))
  assert.equal(state.busy.value, true)
  state.releaseOperation(token)
  assert.equal(state.busy.value, false)
})
