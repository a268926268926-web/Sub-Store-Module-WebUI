const layers = []
const closingTokens = new Set()
let nextToken = 0
let installed = false
let ignoredPopCount = 0

function canUseHistory() {
  return typeof window !== 'undefined' && typeof window.history?.pushState === 'function'
}

function removeLayer(token) {
  const index = layers.findIndex((layer) => layer.token === token)
  if (index < 0) return null
  return layers.splice(index, 1)[0]
}

function onPopState() {
  if (ignoredPopCount > 0) {
    ignoredPopCount--
    drainStaleHistory()
    return
  }
  const layer = layers.pop()
  if (layer) closingTokens.delete(layer.token)
  layer?.close?.()
}

function drainStaleHistory() {
  const stateToken = window.history.state?.__substoreLayer
  if (!stateToken || layers.some((layer) => layer.token === stateToken)) return
  ignoredPopCount++
  window.history.back()
}

function install() {
  if (installed || !canUseHistory()) return
  window.addEventListener('popstate', onPopState)
  installed = true
}

export function pushHistoryLayer(close) {
  if (!canUseHistory()) return null
  install()
  const token = ++nextToken
  const state = window.history.state && typeof window.history.state === 'object'
    ? window.history.state
    : {}
  window.history.pushState({ ...state, __substoreLayer: token }, '')
  layers.push({ token, close })
  return token
}

export function closeHistoryLayer(token) {
  if (!token) return false
  if (closingTokens.has(token)) return false
  const top = layers.at(-1)
  if (top?.token === token && window.history.state?.__substoreLayer === token) {
    closingTokens.add(token)
    window.history.back()
    return true
  }

  const removed = removeLayer(token)
  closingTokens.delete(token)
  removed?.close?.()
  return Boolean(removed)
}

// Used when the owning page is hidden and its browser history entry must not
// remain ahead of a later navigation.
export function cancelHistoryLayer(token) {
  if (!token) return
  removeLayer(token)
  closingTokens.delete(token)
  if (!canUseHistory() || window.history.state?.__substoreLayer !== token) return
  // history.back() consumes the extra entry. The matching popstate event is
  // ignored here, then any remaining canceled entries are drained as well.
  ignoredPopCount++
  window.history.back()
}

