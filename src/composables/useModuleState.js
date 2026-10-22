import { ref } from 'vue'
import * as moduleApi from '../api/module'
import { showToast } from './useToast'

// 单例状态：所有页面共享同一份 status / busy / error
const status = ref(null)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const lastOutput = ref('')
const refreshedAt = ref('')

async function refreshStatus(notify = false) {
  loading.value = true
  error.value = ''
  try {
    status.value = await moduleApi.getStatus()
    refreshedAt.value = new Date().toLocaleTimeString()
    if (notify) showToast('状态已刷新')
  } catch (err) {
    console.error(err)
    error.value = err?.message || '状态读取失败'
    if (notify) showToast(error.value, { tone: 'error' })
  } finally {
    loading.value = false
  }
}

// 可选超时：防止 exec 底层异常挂起时 busy 状态无法恢复。
// 默认不限时（更新类操作耗时可达数分钟），由调用方按需传入。
async function runAction(name, fn, { timeout = 0 } = {}) {
  busy.value = true
  error.value = ''
  let timer = null
  try {
    const run = timeout
      ? Promise.race([
          fn(),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('操作超时, 请稍后重试')), timeout)
          }),
        ])
      : fn()
    const result = await run
    lastOutput.value = result.stdout
    if (!result.ok) {
      error.value = result.stderr || result.stdout || '命令执行失败'
      showToast(error.value, { tone: 'error' })
      return false
    }
    showToast('操作完成')
    await refreshStatus(false)
    return true
  } catch (err) {
    console.error(err)
    error.value = err?.message || '操作失败'
    showToast(error.value, { tone: 'error' })
    return false
  } finally {
    clearTimeout(timer)
    busy.value = false
  }
}

export function useModuleState() {
  return {
    status,
    loading,
    busy,
    error,
    lastOutput,
    refreshedAt,
    refreshStatus,
    runAction,
  }
}
