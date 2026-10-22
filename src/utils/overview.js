export function compactAddress(value) {
  try {
    const url = new URL(value)
    const path = url.pathname === '/' ? '' : url.pathname
    return `${url.host}${path}`
  } catch {
    return value
  }
}

export function buildServiceAddresses(status) {
  if (!status) return []
  if (status.mergeMode) {
    return [{
      label: '直达地址',
      value: status.directUrl,
      displayValue: compactAddress(status.directUrl),
      openValue: status.openUrl || status.directUrl,
    }]
  }
  return [
    {
      label: '前端地址',
      value: status.frontUrl,
      displayValue: compactAddress(status.frontUrl),
      openValue: status.frontUrl,
    },
    {
      label: '后端地址',
      value: status.backUrl,
      displayValue: compactAddress(status.backUrl),
      openValue: null,
    },
  ]
}

export function serviceStateText({ status, loading, pendingAction, currentAction }) {
  if (pendingAction) {
    return {
      restart: '正在重启',
      start: '正在启动',
      stop: '正在停止',
    }[currentAction] || '处理中'
  }
  if (!status) return loading ? '正在读取' : '状态不可用'
  return status.serviceRunning ? '运行中' : '已停止'
}

export function serviceModeText(status, loading) {
  if (!status) return loading ? '读取中' : '状态未知'
  return status.mergeMode ? '合并端口' : '前后端分离'
}
