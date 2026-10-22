import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function dismissToast(id) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function showToast(message, options = {}) {
  if (!message) return

  const id = nextId++
  const duration = options.duration ?? 3200
  toasts.value = [...toasts.value, { id, message, tone: options.tone || 'neutral' }]

  if (duration > 0) {
    window.setTimeout(() => dismissToast(id), duration)
  }
}

export function useToast() {
  return { toasts, showToast, dismissToast }
}
