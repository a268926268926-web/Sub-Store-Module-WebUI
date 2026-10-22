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
