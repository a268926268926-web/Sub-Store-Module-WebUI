import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

const kernelSu = vi.hoisted(() => ({
  exec: vi.fn().mockResolvedValue({ errno: 0, stdout: '', stderr: '' }),
  spawn: vi.fn(),
  moduleInfo: vi.fn(() => JSON.stringify({
    moduleDir: '/data/adb/modules/sub_store',
    version: 'test',
  })),
  enableEdgeToEdge: vi.fn(),
}))

vi.mock('kernelsu', () => kernelSu)

test('background HTTP-META updates keep the mode as a separate argv', async () => {
  globalThis.window = { ksu: {} }
  const { runBackground } = await import('../src/api/module.js')

  await runBackground('update-http-meta', ['kernel-alpha'])

  assert.deepEqual(kernelSu.exec.mock.calls[0], [
    'sh /data/adb/modules/sub_store/scripts/webui.sh log-reset',
    {},
  ])
  assert.deepEqual(kernelSu.spawn.mock.calls[0], [
    'sh',
    [
      '/data/adb/modules/sub_store/scripts/webui.sh',
      'update-http-meta',
      'kernel-alpha',
    ],
  ])
})

test('a failed log reset prevents dispatching a new command', async () => {
  const { runBackground } = await import('../src/api/module.js')
  kernelSu.exec.mockResolvedValueOnce({ errno: 1, stderr: 'cannot reset logs' })
  const previousCalls = kernelSu.spawn.mock.calls.length
  const result = await runBackground('restart')
  assert.equal(result.ok, false)
  assert.equal(kernelSu.spawn.mock.calls.length, previousCalls)
})

test('reading an update status rejects bridge failures and keeps empty output unknown', async () => {
  const { getUpdateStatus } = await import('../src/api/module.js')
  kernelSu.exec.mockResolvedValueOnce({ errno: 1, stderr: 'bridge error' })
  await assert.rejects(getUpdateStatus(), /bridge error/)
  kernelSu.exec.mockResolvedValueOnce({ errno: 0, stdout: '' })
  assert.equal(await getUpdateStatus(), '')
})
