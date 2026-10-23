import { ref } from 'vue'
import * as moduleApi from '../api/module'
import { useModuleState } from './useModuleState'
import { showToast } from './useToast'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function useServiceControl() {
  const {
    status,
    stale,
    error,
    refreshStatus,
    acquireOperation,
    releaseOperation,
  } = useModuleState()
  const pending = ref(false)
  const action = ref('')
  const content = ref('')
  const visible = ref(false)

  async function waitForState(running, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const fresh = await refreshStatus()
      const log = await moduleApi.getLog().catch(() => '')
      if (log) content.value = log
      if (fresh && status.value?.serviceRunning === running) return true
      await sleep(600)
    }
    return false
  }

  async function run(name) {
    if (
      !['start', 'stop', 'restart'].includes(name) ||
      !status.value ||
      stale.value
    )
      return false
    const token = acquireOperation(name)
    if (!token) return false
    action.value = name
    pending.value = true
    visible.value = true
    content.value = '正在执行，等待输出…'
    try {
      const dispatched = await moduleApi.runBackground(name)
      if (!dispatched.ok) throw new Error(dispatched.stderr || '指令发送失败')
      if (name === 'restart' && !(await waitForState(false, 6000))) {
        throw new Error('操作已发出，但未能确认重启过程，请刷新状态并检查日志')
      }
      if (!(await waitForState(name !== 'stop', 15000))) {
        throw new Error('操作已发出，但未能确认服务状态，请刷新后重试')
      }
      showToast(
        { start: '服务已启动', stop: '服务已停止', restart: '服务已重启' }[
          name
        ],
      )
      return true
    } catch (err) {
      error.value = err?.message || '操作失败'
      if (content.value === '正在执行，等待输出…') content.value = error.value
      showToast(error.value, { tone: 'error' })
      return false
    } finally {
      pending.value = false
      action.value = ''
      releaseOperation(token)
    }
  }

  return { pending, action, content, visible, run }
}
