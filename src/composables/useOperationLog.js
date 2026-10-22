import { ref } from 'vue'
import * as moduleApi from '../api/module'

// 操作日志状态与执行：后台执行命令（nohup & 立即返回），轮询 run.log 停止增长判定完成，
// 再读取日志内容。日志展示（标题/卡片/行着色）见 components/OperationLogPanel.vue。
export function useOperationLog() {
  const content = ref('')
  const visible = ref(false)
  const pending = ref(false)

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // 轮询 update.done 标记直到更新真正结束（大文件下载时日志可能长时间停滞，
  // 不能靠字节数稳定判断完成；标记由 webui.sh 在更新进程退出时写入退出码）。
  // onPoll 在每次轮询时调用（伪实时刷新日志内容用）
  async function pollUntilDone(timeoutMs, onPoll, intervalMs = 1000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (onPoll) await onPoll()
      const status = await moduleApi.getUpdateStatus().catch(() => 'running')
      if (status !== 'running') return true
      await sleep(intervalMs)
    }
    return false
  }

  async function followActiveUpdate({ timeoutMs = 600000 } = {}) {
    visible.value = true
    if (!content.value) content.value = '正在执行，等待输出…'
    pending.value = true
    try {
      if (!moduleApi.isBrowserDev) {
        await pollUntilDone(timeoutMs, async () => {
          const log = await moduleApi.getUpdateLog().catch(() => '')
          if (log) content.value = log
        })
      }
      content.value = await moduleApi.getUpdateLog().catch(() => content.value)
      return true
    } catch (err) {
      content.value = err?.message || '操作失败'
      return false
    } finally {
      pending.value = false
    }
  }

  // 执行更新命令并展示其日志：内部先归档旧日志，新 update.log 只含本次输出；
  // 执行期间轮询伪实时刷新日志内容，结束后再读一次完整日志
  async function runWithLog(name, options = {}) {
    visible.value = true
    content.value = '正在执行，等待输出…'
    pending.value = true
    try {
      const result = await moduleApi.runBackground(name)
      if (!result.ok) {
        content.value = result.stderr || '指令发送失败'
        return false
      }
      pending.value = false
      return followActiveUpdate(options)
    } catch (err) {
      content.value = err?.message || '操作失败'
      pending.value = false
      return false
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

  return { content, visible, pending, runWithLog, followActiveUpdate, followAutoUpdate }
}
