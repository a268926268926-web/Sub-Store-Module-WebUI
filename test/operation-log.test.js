import assert from 'node:assert/strict'
import { afterEach, beforeEach, test, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getUpdateStatus: vi.fn(),
  getUpdateLog: vi.fn(),
  runBackground: vi.fn(),
}))
vi.mock('../src/api/module', () => api)
vi.mock('../src/composables/useToast', () => ({ showToast: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  api.getUpdateLog.mockResolvedValue('[Info] component output')
  api.runBackground.mockResolvedValue({ ok: true })
})
afterEach(() => vi.useRealTimers())

async function setup() {
  const { useOperationLog } =
    await import('../src/composables/useOperationLog.js')
  return useOperationLog()
}

test('only exit code zero confirms a successful manual update', async () => {
  const log = await setup()
  api.getUpdateStatus.mockResolvedValue('0')
  assert.equal(await log.runWithLog('update-all'), true)
  assert.equal(log.result.value.state, 'success')
  api.getUpdateStatus.mockResolvedValue('1')
  assert.equal(await log.runWithLog('update-all'), false)
  assert.equal(log.result.value.state, 'failed')
  assert.match(log.result.value.message, /1/)
  assert.match(log.content.value, /component output/)
})

test('timeout is unconfirmed and preserves the last log output', async () => {
  const log = await setup()
  log.content.value = 'download in progress'
  assert.equal(await log.followActiveUpdate({ timeoutMs: 0 }), false)
  assert.equal(log.result.value.state, 'unconfirmed')
  assert.match(log.result.value.message, /后台/)
  assert.equal(api.getUpdateStatus.mock.calls.length, 0)
})

test('a broken or malformed completion response is never reported as success', async () => {
  const log = await setup()
  api.getUpdateStatus.mockRejectedValueOnce(new Error('bridge disconnected'))
  assert.equal(await log.runWithLog('update-all'), false)
  assert.equal(log.result.value.state, 'unconfirmed')
  assert.match(log.result.value.message, /bridge disconnected/)
  api.getUpdateStatus.mockResolvedValue('garbled response')
  assert.equal(await log.runWithLog('update-all'), false)
  assert.equal(log.result.value.state, 'unconfirmed')
})

test('a running download stays pending and blocks another module mutation', async () => {
  vi.useFakeTimers()
  const log = await setup()
  const { useModuleState } =
    await import('../src/composables/useModuleState.js')
  const state = useModuleState()
  api.getUpdateStatus.mockResolvedValueOnce('running').mockResolvedValue('0')
  const done = log.runWithLog('update-all')
  await vi.advanceTimersByTimeAsync(0)
  assert.equal(log.pending.value, true)
  assert.equal(state.busy.value, true)
  assert.equal(state.acquireOperation('stop'), null)
  await vi.advanceTimersByTimeAsync(1000)
  assert.equal(await done, true)
  assert.equal(state.busy.value, false)
  assert.equal(log.pending.value, false)
})

test('dispatch failure releases the shared operation and does not start polling', async () => {
  const log = await setup()
  api.runBackground.mockResolvedValue({ ok: false, stderr: 'log reset failed' })
  assert.equal(await log.runWithLog('update-all'), false)
  assert.equal(log.result.value.state, 'failed')
  assert.equal(log.content.value, 'log reset failed')
  assert.equal(api.getUpdateStatus.mock.calls.length, 0)
  const { useModuleState } =
    await import('../src/composables/useModuleState.js')
  assert.equal(useModuleState().busy.value, false)
})
