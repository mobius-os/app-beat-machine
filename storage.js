import { CUSTOM_START, PADS, PAD_COLORS, TOTAL_BEATS } from './audio.js'
import { useEffect, useState } from 'react'

export const SAVE_PATH = 'state.json'
export const SETTINGS_PATH = 'settings.json'
const SAVE_VERSION = 2
const MAX_STATE_WRITE_ATTEMPTS = 4
const conflictContexts = (context) => (
  context?.kind === 'mobius-conflict-context-batch'
  && context?.version === 1 && Array.isArray(context.items)
    ? context.items.flatMap(conflictContexts)
    : [context]
)

function storageBridge() {
  return (typeof window !== 'undefined' && window.mobius && window.mobius.storage) || null
}

function headers(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function loadBeatState(appId, token) {
  const bridge = storageBridge()
  // Conflict outcomes are durable and can be waiting before this app process
  // mounts. Install recovery during the ordinary load path so a cold reopen
  // can receive/reconcile them without requiring the user to edit first.
  ensureBeatConflictRecovery(bridge)
  if (bridge && typeof bridge.get === 'function') {
    const [rawState, rawSettings] = await Promise.all([
      bridge.get(SAVE_PATH),
      bridge.get(SETTINGS_PATH),
    ])
    return mergeStoredState(rawState, rawSettings)
  }
  if (!appId || !token) return sanitizeState(null)
  const [rawState, rawSettings] = await Promise.all([
    getJsonPath(appId, token, SAVE_PATH),
    getJsonPath(appId, token, SETTINGS_PATH),
  ])
  return mergeStoredState(rawState, rawSettings)
}

async function getJsonPath(appId, token, path) {
  const res = await fetch(`/api/storage/apps/${appId}/${path}`, { headers: headers(token) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`)
  return res.json()
}

export async function saveBeatState(appId, token, data) {
  const updatedAt = typeof data?.updated_at === 'string'
    ? data.updated_at
    : new Date().toISOString()
  const body = { ...data, version: SAVE_VERSION, updated_at: updatedAt }
  const bridge = storageBridge()
  if (bridge && typeof bridge.set === 'function') {
    await bridge.set(SAVE_PATH, body)
    return updatedAt
  }
  if (!appId || !token) return updatedAt
  const res = await fetch(`/api/storage/apps/${appId}/${SAVE_PATH}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${SAVE_PATH} failed (${res.status})`)
  return updatedAt
}

function stateDocument(latest, merged, updatedAt) {
  return {
    grid: merged.grid,
    // Keep legacy settings in state.json for downgrade compatibility. Current
    // releases read the authoritative values from settings.json.
    bpm: latest.bpm,
    volumes: latest.volumes,
    echo: latest.echo,
    reverb: latest.reverb,
    customPads: merged.customPads,
    version: SAVE_VERSION,
    updated_at: updatedAt,
  }
}

export function beatConflictContext(latest, merged) {
  const gridChanges = []
  for (let row = 0; row < merged.grid.length; row += 1) {
    for (let column = 0; column < merged.grid[row].length; column += 1) {
      if (merged.grid[row][column] !== latest.grid[row]?.[column]) gridChanges.push([row, column])
    }
  }
  const beforePads = new Map((latest.customPads || []).map((pad) => [pad.idx, pad]))
  const afterPads = new Map((merged.customPads || []).map((pad) => [pad.idx, pad]))
  const customPadIndices = [...new Set([...beforePads.keys(), ...afterPads.keys()])]
    .filter((idx) => JSON.stringify(beforePads.get(idx)) !== JSON.stringify(afterPads.get(idx)))
  return { kind: 'beat-state-intent', gridChanges, customPadIndices }
}

export function applyBeatConflictIntent(latest, refused, context) {
  const grid = latest.grid.map((row) => [...row])
  for (const [row, column] of context?.gridChanges || []) {
    if (grid[row] && refused.grid?.[row] && column in refused.grid[row]) {
      grid[row][column] = !!refused.grid[row][column]
    }
  }
  const pads = new Map((latest.customPads || []).map((pad) => [pad.idx, pad]))
  const refusedPads = new Map((refused.customPads || []).map((pad) => [pad.idx, pad]))
  for (const idx of context?.customPadIndices || []) {
    if (refusedPads.has(idx)) pads.set(idx, refusedPads.get(idx))
    else pads.delete(idx)
  }
  return { grid, customPads: [...pads.values()].sort((a, b) => a.idx - b.idx) }
}

let recoveryStorage = null
let detachRecovery = null
function ensureBeatConflictRecovery(bridge) {
  if (bridge === recoveryStorage) return
  try { detachRecovery?.() } catch {}
  recoveryStorage = bridge
  detachRecovery = null
  if (!bridge?.onConflict || !bridge?.getWithVersion || !bridge?.durableWrite) return
  detachRecovery = bridge.onConflict(async (conflict) => {
    const context = conflict?.conflictContext
    const intents = conflictContexts(context)
    if (conflict?.path !== SAVE_PATH || !intents.length
        || intents.some((intent) => intent?.kind !== 'beat-state-intent')) return false
    const refused = sanitizeState(conflict.refusedValue)
    for (let attempt = 0; attempt < MAX_STATE_WRITE_ATTEMPTS; attempt += 1) {
      const current = await bridge.getWithVersion(SAVE_PATH)
      const latest = sanitizeState(current?.value)
      const merged = intents.reduce(
        (state, intent) => applyBeatConflictIntent(state, refused, intent),
        latest,
      )
      const updatedAt = new Date().toISOString()
      try {
        const result = await bridge.durableWrite(
          SAVE_PATH,
          stateDocument(latest, merged, updatedAt),
          {
            ...(current?.version ? { ifMatch: current.version } : { ifNoneMatch: true }),
            conflictContext: context,
          },
        )
        // A queued replacement can still be refused later. Leave the original
        // conflict pending until this recovery write is accepted by the server.
        return result?.durability === 'synced'
      } catch (error) {
        if (error?.code !== 'conflict') throw error
      }
    }
    return false
  })
}

// Apply one pattern/recording intent with optimistic concurrency. An ordinary
// get-then-set still loses a simultaneous writer between those two calls; the
// versioned read plus conditional durable write closes that window and retries
// the merge against the winner. Current runtimes retain a compact pattern intent
// with queued offline writes and replay it over a newer remote document on
// reconnect. Only older runtimes fall back to queued last-write-wins.
export async function updateBeatState(appId, token, update = {}) {
  const bridge = storageBridge()
  ensureBeatConflictRecovery(bridge)
  const canCas = bridge &&
    typeof bridge.getWithVersion === 'function' &&
    typeof bridge.durableWrite === 'function'

  if (canCas) {
    for (let attempt = 0; attempt < MAX_STATE_WRITE_ATTEMPTS; attempt += 1) {
      const current = await bridge.getWithVersion(SAVE_PATH)
      const latest = sanitizeState(current?.value)
      const merged = mergeBeatStateUpdate(latest, update)
      const conflictContext = beatConflictContext(latest, merged)
      const updatedAt = new Date().toISOString()
      try {
        const options = current?.version
          ? { ifMatch: current.version }
          : { ifNoneMatch: true }
        await bridge.durableWrite(
          SAVE_PATH,
          stateDocument(latest, merged, updatedAt),
          { ...options, conflictContext },
        )
        return updatedAt
      } catch (err) {
        if (err?.code !== 'conflict') throw err
      }
    }
    const error = new Error('Beat state kept changing on another device. Try again.')
    error.code = 'conflict'
    throw error
  }

  // Offline reads are cache-backed and set() queues through the runtime. This
  // fallback also keeps compatibility with runtimes released before CAS.
  if (bridge && typeof bridge.get === 'function') {
    const latest = sanitizeState(await bridge.get(SAVE_PATH))
    const merged = mergeBeatStateUpdate(latest, update)
    const updatedAt = new Date().toISOString()
    await bridge.set(SAVE_PATH, stateDocument(latest, merged, updatedAt))
    return updatedAt
  }

  // Match saveBeatState/saveBeatSettings in standalone and test surfaces: no
  // scoped runtime and no API credentials means persistence is intentionally a
  // no-op, never a request to an `undefined` app path.
  if (!appId || !token) return new Date().toISOString()

  // Standalone/compatibility surface: use the same conditional protocol
  // directly. This path has no offline queue, matching the existing fallback.
  for (let attempt = 0; attempt < MAX_STATE_WRITE_ATTEMPTS; attempt += 1) {
    const res = await fetch(`/api/storage/apps/${appId}/${SAVE_PATH}`, {
      headers: { ...headers(token), 'X-Mobius-Version': '1' },
    })
    if (res.status !== 404 && !res.ok) {
      throw new Error(`GET ${SAVE_PATH} failed (${res.status})`)
    }
    const latest = sanitizeState(res.status === 404 ? null : await res.json())
    const merged = mergeBeatStateUpdate(latest, update)
    const updatedAt = new Date().toISOString()
    const conditional = res.status === 404
      ? { 'If-None-Match': '*' }
      : { 'If-Match': res.headers.get('ETag') || '' }
    const write = await fetch(`/api/storage/apps/${appId}/${SAVE_PATH}`, {
      method: 'PUT',
      headers: {
        ...headers(token),
        'Content-Type': 'application/json',
        ...conditional,
      },
      body: JSON.stringify(stateDocument(latest, merged, updatedAt)),
    })
    if (write.status === 412) continue
    if (!write.ok) throw new Error(`PUT ${SAVE_PATH} failed (${write.status})`)
    return updatedAt
  }
  const error = new Error('Beat state kept changing on another device. Try again.')
  error.code = 'conflict'
  throw error
}

// State writes may start from a device whose in-memory copy is older than the
// server. Functional fields apply the local intent to the freshly loaded
// document instead of replacing unrelated remote pattern rows or recordings.
export function mergeBeatStateUpdate(latest, update = {}) {
  const resolve = (value, current) => (
    typeof value === 'function' ? value(current) : (value ?? current)
  )
  return {
    grid: resolve(update.grid, latest.grid),
    customPads: resolve(update.customPads, latest.customPads),
  }
}

export async function saveBeatSettings(appId, token, data) {
  const updatedAt = typeof data?.updated_at === 'string'
    ? data.updated_at
    : new Date().toISOString()
  const body = {
    bpm: data.bpm,
    volumes: data.volumes,
    echo: data.echo,
    reverb: data.reverb,
    version: SAVE_VERSION,
    updated_at: updatedAt,
  }
  const bridge = storageBridge()
  if (bridge && typeof bridge.set === 'function') {
    await bridge.set(SETTINGS_PATH, body)
    return updatedAt
  }
  if (!appId || !token) return updatedAt
  const res = await fetch(`/api/storage/apps/${appId}/${SETTINGS_PATH}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${SETTINGS_PATH} failed (${res.status})`)
  return updatedAt
}

function mergeStoredState(rawState, rawSettings) {
  const state = sanitizeState(rawState)
  if (!rawSettings || typeof rawSettings !== 'object') return state
  const settings = unwrapStorageEnvelope(rawSettings)
  const settingsUpdatedAt = typeof settings.updated_at === 'string' ? settings.updated_at : null
  return {
    ...state,
    bpm: sanitizeBpm(settings.bpm),
    volumes: sanitizeVolumes(settings.volumes),
    echo: clamp01(settings.echo),
    reverb: clamp01(settings.reverb),
    stateUpdatedAt: state.updatedAt,
    settingsUpdatedAt,
    updatedAt: [state.updatedAt, settingsUpdatedAt].filter(Boolean).sort().at(-1) || null,
  }
}

export function sanitizeState(raw) {
  const state = unwrapStorageEnvelope(raw)
  const updatedAt = typeof state.updated_at === 'string' ? state.updated_at : null
  return {
    grid: sanitizeGrid(state.grid),
    bpm: sanitizeBpm(state.bpm),
    volumes: sanitizeVolumes(state.volumes),
    echo: clamp01(state.echo),
    reverb: clamp01(state.reverb),
    customPads: sanitizeCustomPads(state.customPads),
    stateUpdatedAt: updatedAt,
    settingsUpdatedAt: null,
    updatedAt,
  }
}

export function createEmptyGrid() {
  return Array.from({ length: PADS }, () => new Array(TOTAL_BEATS).fill(false))
}

function unwrapStorageEnvelope(raw) {
  if (raw && typeof raw === 'object' && typeof raw.content === 'string') {
    try {
      const parsed = JSON.parse(raw.content)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return raw && typeof raw === 'object' ? raw : {}
}

function sanitizeGrid(value) {
  const rows = Array.isArray(value) ? value : []
  return Array.from({ length: PADS }, (_, padIdx) => {
    const row = Array.isArray(rows[padIdx]) ? rows[padIdx] : []
    return Array.from({ length: TOTAL_BEATS }, (_, beatIdx) => row[beatIdx] === true)
  })
}

function sanitizeBpm(value) {
  const bpm = Number(value)
  if (!Number.isFinite(bpm)) return 120
  return Math.max(60, Math.min(200, Math.round(bpm)))
}

function sanitizeVolumes(value) {
  const input = Array.isArray(value) ? value : []
  return Array.from({ length: PADS }, (_, idx) => {
    const raw = Number(input[idx])
    return Number.isFinite(raw) ? clamp01(raw) : 0.8
  })
}

function sanitizeCustomPads(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const idx = Number(item?.idx)
      if (!Number.isInteger(idx) || idx < CUSTOM_START || idx >= PADS) return null
      const audio = item.audio && typeof item.audio === 'object' ? item.audio : null
      if (!audio || !Array.isArray(audio.channels) || audio.channels.length === 0) return null
      return {
        idx,
        name: String(item.name || `Rec ${idx - CUSTOM_START + 1}`).slice(0, 18),
        color: typeof item.color === 'string' ? item.color : PAD_COLORS[idx],
        audio,
      }
    })
    .filter(Boolean)
}

function clamp01(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export function useOnline() {
  const initial = (() => {
    if (typeof window === 'undefined') return true
    if (typeof window.mobius?.online === 'boolean') return window.mobius.online
    return navigator.onLine !== false
  })()
  const [online, setOnline] = useState(initial)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    let unsub = null
    if (window.mobius && typeof window.mobius.onOnlineChange === 'function') {
      unsub = window.mobius.onOnlineChange((next) => {
        setOnline(next !== false)
      })
    } else if (window.mobius && typeof window.mobius.onChange === 'function') {
      unsub = window.mobius.onChange((state) => {
        if (typeof state?.online === 'boolean') setOnline(state.online)
      })
    }
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      if (unsub) unsub()
    }
  }, [])

  return online
}
