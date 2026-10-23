import assert from 'node:assert/strict'
import { afterEach, beforeEach, test, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getStatus: vi.fn(),
  getLog: vi.fn(),
  runBackground: vi.fn(),
}))
vi.mock('../src/api/module', () => api)
vi.mock('../src/composables/useToast', () => ({ showToast: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  api.getLog.mockResolvedValue('service output')
  api.runBackground.mockResolvedValue({ ok: true })
})
afterEach(() => vi.useRealTimers())

async function setup() {
  const { useServiceControl } =
    await import('../src/composables/useServiceControl.js')
  const { useModuleState } =
    await import('../src/composables/useModuleState.js')
  const state = useModuleState()
  api.getStatus.mockResolvedValue({ serviceRunning: true })
  await state.refreshStatus()
  return { ...useServiceControl(), state }
}

test('restart confirms the stopped and running phases using fresh snapshots', async () => {
  const service = await setup()
  api.getStatus
    .mockResolvedValueOnce({ serviceRunning: false })
    .mockResolvedValue({ serviceRunning: true })
  assert.equal(await service.run('restart'), true)
  assert.equal(service.state.error.value, '')
  assert.equal(service.state.busy.value, false)
  assert.equal(service.pending.value, false)
  assert.equal(service.content.value, 'service output')
})

test('a cached running snapshot cannot confirm start when refreshes fail', async () => {
  vi.useFakeTimers()
  const service = await setup()
  api.getStatus.mockRejectedValue(new Error('disconnected'))
  const done = service.run('start')
  await vi.advanceTimersByTimeAsync(15500)
  assert.equal(await done, false)
  assert.equal(service.state.stale.value, true)
  assert.match(service.state.error.value, /未能确认/)
  assert.equal(service.state.busy.value, false)
})

test('stale state and another active operation both block service dispatch', async () => {
  const service = await setup()
  service.state.statusError.value = 'unavailable'
  assert.equal(await service.run('stop'), false)
  service.state.statusError.value = ''
  const token = service.state.acquireOperation('update-all')
  assert.equal(await service.run('stop'), false)
  assert.equal(api.runBackground.mock.calls.length, 0)
  service.state.releaseOperation(token)
})

test('dispatch failure preserves the error while releasing the controls', async () => {
  const service = await setup()
  api.runBackground.mockResolvedValue({ ok: false, stderr: 'cannot dispatch' })
  assert.equal(await service.run('stop'), false)
  assert.equal(service.state.error.value, 'cannot dispatch')
  assert.equal(service.content.value, 'cannot dispatch')
  assert.equal(service.state.busy.value, false)
})
