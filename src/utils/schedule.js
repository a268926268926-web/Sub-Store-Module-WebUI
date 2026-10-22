export const MAX_INTERVAL_DAYS = 365

export function normalizeIntervalDays(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 7
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, parsed))
}

export function intervalLabel(value) {
  const days = normalizeIntervalDays(value)
  return days === 1 ? '每天' : `每 ${days} 天`
}

export function formatMoment(value) {
  if (!value || value === 'never') return '尚未安排'
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
