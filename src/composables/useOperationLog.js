import { ref } from 'vue'
import * as moduleApi from '../api/module'
import { useModuleState } from './useModuleState'

// Completion comes from the backend exit marker, independently of log activity.
export function useOperationLog() {
  const content = ref('')
  const visible = ref(false)
  const pending = ref(false)
  const result = ref(null)
  const { acquireOperation, releaseOperation } = useModuleState()

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // 轮询 update.done 标记直到更新真正结束（大文件下载时日志可能长时间停滞，
  // 不能靠字节数稳定判断完成；标记由 webui.sh 在更新进程退出时写入退出码）。
  // onPoll 在每次轮询时调用（伪实时刷新日志内容用）
  async function pollUntilDone(timeoutMs, onPoll, intervalMs = 1000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (onPoll) await onPoll()
      const status = await moduleApi.getUpdateStatus()
      if (/^\d+$/.test(status)) return Number(status)
      if (status !== 'running') throw new Error('无法识别更新结果，请检查日志')
      await sleep(intervalMs)
    }
    return null
  }

  async function followActiveUpdate({ timeoutMs = 600000 } = {}) {
    visible.value = true
    if (!content.value) content.value = '正在执行，等待输出…'
    pending.value = true
    result.value = null
    try {
      const exitCode = await pollUntilDone(timeoutMs, async () => {
        const log = await moduleApi.getUpdateLog().catch(() => '')
        if (log) content.value = log
      })
      content.value = await moduleApi.getUpdateLog().catch(() => content.value)
      result.value =
        exitCode === null
          ? {
              state: 'unconfirmed',
              message: '等待超时，更新可能仍在后台运行，请刷新状态确认',
            }
          : exitCode === 0
            ? { state: 'success', message: '更新完成' }
            : {
                state: 'failed',
                message: `更新失败（退出码 ${exitCode}），请查看日志`,
              }
      return result.value.state === 'success'
    } catch (err) {
      result.value = {
        state: 'unconfirmed',
        message: err?.message || '无法确认更新结果，请刷新状态',
      }
      return false
    } finally {
      pending.value = false
    }
  }

  // 执行更新命令并展示其日志：内部先归档旧日志，新 update.log 只含本次输出；
  // 执行期间轮询伪实时刷新日志内容，结束后再读一次完整日志
  async function runWithLog(name, options = {}, args = []) {
    const token = acquireOperation(name)
    if (!token) return false
    visible.value = true
    content.value = '正在执行，等待输出…'
    pending.value = true
    try {
      result.value = null
      const dispatched = await moduleApi.runBackground(name, args)
      if (!dispatched.ok) {
        result.value = {
          state: 'failed',
          message: dispatched.stderr || '指令发送失败',
        }
        content.value = result.value.message
        return false
      }
      return await followActiveUpdate(options)
    } catch (err) {
      result.value = { state: 'failed', message: err?.message || '操作失败' }
      content.value = result.value.message
      return false
    } finally {
      pending.value = false
      releaseOperation(token)
    }
  }

  async function followAutoUpdate({ timeoutMs = 600000 } = {}) {
    visible.value = true
    pending.value = true
    if (!content.value) content.value = '自动更新任务已接收，等待输出…'
    const deadline = Date.now() + timeoutMs
    try {
      while (Date.now() < deadline) {
        const [status, log] = await Promise.all([
          moduleApi.getAutoUpdateStatus().catch(() => null),
          moduleApi.getAutoUpdateLog().catch(() => ''),
        ])
        if (log) content.value = log
        if (status && !status.running && !status.stateRunning) {
          return status
        }
        await sleep(1000)
      }
      return null
    } finally {
      pending.value = false
    }
  }

  return {
    content,
    visible,
    pending,
    result,
    runWithLog,
    followActiveUpdate,
    followAutoUpdate,
  }
}
