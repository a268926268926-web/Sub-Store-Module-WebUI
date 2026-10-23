import { computed, ref } from 'vue'
import * as moduleApi from '../api/module'
import { showToast } from './useToast'

// 单例状态：所有页面共享同一份 status / busy / error
const status = ref(null)
const loading = ref(false)
const refreshing = ref(false)
const busy = ref(false)
const error = ref('')
const statusError = ref('')
const stale = computed(() => Boolean(status.value && statusError.value))
const lastOutput = ref('')
const refreshedAt = ref('')
let refreshPromise
let operationToken

function refreshStatus(notify = false) {
  if (!refreshPromise) {
    loading.value = status.value == null
    refreshing.value = true
    refreshPromise = (async () => {
      try {
        status.value = await moduleApi.getStatus()
        statusError.value = ''
        refreshedAt.value = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        return true
      } catch (err) {
        statusError.value = err?.message || '状态读取失败'
        return false
      } finally {
        loading.value = false
        refreshing.value = false
        refreshPromise = undefined
      }
    })()
  }
  return refreshPromise.then((ok) => {
    if (notify)
      showToast(ok ? '状态已刷新' : statusError.value, {
        tone: ok ? 'neutral' : 'error',
      })
    return ok
  })
}

function acquireOperation(name) {
  if (busy.value) return null
  operationToken = Symbol(name)
  busy.value = true
  error.value = ''
  return operationToken
}

function releaseOperation(token) {
  if (token !== operationToken) return
  operationToken = undefined
  busy.value = false
}

// 可选超时：防止 exec 底层异常挂起时 busy 状态无法恢复。
// 默认不限时（更新类操作耗时可达数分钟），由调用方按需传入。
async function runAction(name, fn, { timeout = 0 } = {}) {
  const token = acquireOperation(name)
  if (!token) return false
  let timer = null
  try {
    const run = timeout
      ? Promise.race([
          fn(),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('操作超时, 请稍后重试')),
              timeout,
            )
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
    releaseOperation(token)
  }
}

export function useModuleState() {
  return {
    status,
    loading,
    refreshing,
    busy,
    error,
    statusError,
    stale,
    lastOutput,
    refreshedAt,
    refreshStatus,
    runAction,
    acquireOperation,
    releaseOperation,
  }
}
