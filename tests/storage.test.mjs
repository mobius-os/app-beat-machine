import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { bundleModule } from './test-deps.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const buildDir = join(root, '.build')
const bundled = join(buildDir, 'storage.mjs')

test('manifest and storage bridge agree on the offline contract', async () => {
  const manifest = JSON.parse(readFileSync(join(root, '..', 'mobius.json'), 'utf8'))
  assert.equal(manifest.offline_capable, true)
  assert.ok(manifest.source_files.includes('gestures.js'))
  assert.deepEqual(
    { reads: manifest.offline.reads, writes: manifest.offline.writes, execution: manifest.offline.execution },
    { reads: true, writes: 'queued', execution: 'none' },
  )

  const calls = []
  const oldFetch = globalThis.fetch
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      storage: {
        get: async (path) => {
          calls.push(['get', path])
          return path === 'settings.json' ? { bpm: 108 } : { bpm: 96 }
        },
        set: async (path, value) => {
          calls.push(['set', path, value])
          return { queued: true }
        },
      },
    },
  }
  globalThis.fetch = async () => {
    throw new Error('offline-capable storage must not bypass the Mobius runtime')
  }
  try {
    const { loadBeatState, saveBeatState } = await bundle()
    assert.equal((await loadBeatState('beat-machine', 'tok')).bpm, 108)
    await saveBeatState('beat-machine', 'tok', { bpm: 96 })
    assert.deepEqual(calls.map(([method, path]) => [method, path]), [
      ['get', 'state.json'],
      ['get', 'settings.json'],
      ['set', 'state.json'],
    ])
    assert.equal(calls[2][2].version, 2)
  } finally {
    globalThis.fetch = oldFetch
    delete globalThis.window
  }
})

test('initial load installs conflict recovery before reading cached state', async () => {
  const calls = []
  let listener = null
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      storage: {
        onConflict(cb) { calls.push('onConflict'); listener = cb; return () => {} },
        getWithVersion: async () => ({ value: null, version: null }),
        durableWrite: async () => ({ durability: 'synced' }),
        get: async (path) => { calls.push(`get:${path}`); return null },
      },
    },
  }
  try {
    const { loadBeatState } = await bundle()
    await loadBeatState('beat-machine', 'tok')
    assert.equal(typeof listener, 'function')
    assert.equal(calls[0], 'onConflict')
    assert.deepEqual(calls.slice(1), ['get:state.json', 'get:settings.json'])
  } finally {
    delete globalThis.window
  }
})

test('older runtimes keep Beat Machine on the non-CAS compatibility path', async () => {
  const calls = []
  globalThis.window = {
    mobius: {
      storage: {
        onConflict() { throw new Error('legacy runtime must not install recovery') },
        async get() { calls.push('get'); return null },
        async set() { calls.push('set'); return { queued: true } },
        async getWithVersion() { throw new Error('legacy runtime must not use versioned reads') },
        async durableWrite() { throw new Error('legacy runtime must not use conditional writes') },
      },
    },
  }
  try {
    const { updateBeatState } = await bundle()
    await updateBeatState('beat-machine', 'tok', {})
    assert.deepEqual(calls, ['get', 'set'])
  } finally {
    delete globalThis.window
  }
})

test('state updates preserve unrelated changes loaded from another device', async () => {
  const { mergeBeatStateUpdate } = await bundle()
  const latest = {
    grid: Array.from({ length: 16 }, () => new Array(32).fill(false)),
    customPads: [{ idx: 8, audio: { channels: ['remote'] } }],
  }
  latest.grid[0][0] = true
  const merged = mergeBeatStateUpdate(latest, {
    grid: (grid) => grid.map((row, idx) => {
      const next = [...row]
      if (idx === 1) next[2] = true
      return next
    }),
    customPads: (pads) => [
      ...pads,
      { idx: 9, audio: { channels: ['local'] } },
    ],
  })
  assert.equal(merged.grid[0][0], true)
  assert.equal(merged.grid[1][2], true)
  assert.deepEqual(merged.customPads.map((pad) => pad.idx), [8, 9])
})

test('state writes retry a CAS conflict and merge against the winning device', async () => {
  const emptyGrid = () => Array.from({ length: 16 }, () => new Array(32).fill(false))
  const initial = { grid: emptyGrid(), customPads: [] }
  const remoteWinner = {
    grid: emptyGrid(),
    customPads: [{ idx: 8, audio: { channels: ['remote'] } }],
  }
  remoteWinner.grid[0][0] = true
  const reads = [
    { value: initial, version: 'v1' },
    { value: remoteWinner, version: 'v2' },
  ]
  const writes = []
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      online: true,
      storage: {
        getWithVersion: async () => reads.shift(),
        durableWrite: async (path, value, options) => {
          writes.push({ path, value, options })
          if (writes.length === 1) {
            const error = new Error('stale')
            error.code = 'conflict'
            throw error
          }
          return { durability: 'synced', version: 'v3' }
        },
      },
    },
  }
  try {
    const { updateBeatState } = await bundle()
    await updateBeatState('beat-machine', 'tok', {
      grid: (grid) => grid.map((row, idx) => {
        const next = [...row]
        if (idx === 1) next[2] = true
        return next
      }),
      customPads: (pads) => [
        ...pads,
        { idx: 9, audio: { channels: ['local'] } },
      ],
    })
    assert.equal(writes.length, 2)
    assert.deepEqual(writes.map((write) => ({ ifMatch: write.options.ifMatch })), [
      { ifMatch: 'v1' },
      { ifMatch: 'v2' },
    ])
    assert.deepEqual(writes[1].options.conflictContext, {
      kind: 'beat-state-intent',
      gridChanges: [[1, 2]],
      customPadIndices: [9],
    })
    const landed = writes[1].value
    assert.equal(landed.grid[0][0], true)
    assert.equal(landed.grid[1][2], true)
    assert.deepEqual(landed.customPads.map((pad) => pad.idx), [8, 9])
  } finally {
    delete globalThis.window
  }
})

test('an offline pattern intent replays over a disjoint remote pattern edit', async () => {
  const emptyGrid = () => Array.from({ length: 16 }, () => new Array(32).fill(false))
  const baseline = { grid: emptyGrid(), customPads: [] }
  const remote = { grid: emptyGrid(), customPads: [] }
  remote.grid[0][0] = true
  let listener
  const writes = []
  let readCount = 0
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      online: false,
      storage: {
        onConflict(cb) { listener = cb; return () => { listener = null } },
        async getWithVersion() {
          readCount += 1
          return readCount === 1
            ? { value: baseline, version: 'baseline-v1' }
            : { value: remote, version: 'remote-v2' }
        },
        async durableWrite(path, value, options) {
          writes.push({ path, value, options })
          return { durability: writes.length === 1 ? 'queued' : 'synced' }
        },
      },
    },
  }
  try {
    const { updateBeatState } = await bundle()
    await updateBeatState('beat-machine', 'tok', {
      grid: (grid) => grid.map((row, rowIndex) => {
        const next = [...row]
        if (rowIndex === 1) next[2] = true
        return next
      }),
    })
    const queued = writes[0]
    assert.deepEqual(queued.options.conflictContext.gridChanges, [[1, 2]])

    assert.equal(await listener({
      path: 'state.json',
      conflictContext: queued.options.conflictContext,
      refusedValue: queued.value,
    }), true)
    const recovered = writes[1].value
    assert.equal(recovered.grid[0][0], true)
    assert.equal(recovered.grid[1][2], true)
    assert.equal(writes[1].options.ifMatch, 'remote-v2')
  } finally {
    delete globalThis.window
  }
})

test('queued conflict recovery stays pending until its replacement is synced', async () => {
  const emptyGrid = () => Array.from({ length: 16 }, () => new Array(32).fill(false))
  const remote = { grid: emptyGrid(), customPads: [] }
  const refused = { grid: emptyGrid(), customPads: [] }
  refused.grid[1][2] = true
  let listener
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      storage: {
        onConflict(cb) { listener = cb; return () => {} },
        async getWithVersion() { return { value: remote, version: 'remote-v2' } },
        async durableWrite() { return { durability: 'queued' } },
      },
    },
  }
  try {
    const { updateBeatState } = await bundle()
    await updateBeatState('beat-machine', 'tok', {})
    assert.equal(await listener({
      path: 'state.json',
      conflictContext: { kind: 'beat-state-intent', gridChanges: [[1, 2]], customPadIndices: [] },
      refusedValue: refused,
    }), false)
  } finally {
    delete globalThis.window
  }
})

test('replayed Beat recovery merges from the authoritative server while a replacement is queued', async () => {
  const emptyGrid = () => Array.from({ length: 16 }, () => new Array(32).fill(false))
  const firstRemote = { grid: emptyGrid(), customPads: [] }
  firstRemote.grid[0][0] = true
  const secondRemote = { grid: emptyGrid(), customPads: [] }
  secondRemote.grid[0][0] = true
  secondRemote.grid[3][4] = true
  const refused = { grid: emptyGrid(), customPads: [] }
  refused.grid[1][2] = true
  const reads = [
    { value: firstRemote, version: 'remote-v2' },
    { value: secondRemote, version: 'remote-v3' },
  ]
  let listener
  const writes = []
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      storage: {
        onConflict(cb) { listener = cb; return () => {} },
        async get(path) { return path === 'state.json' ? firstRemote : null },
        async getWithVersion() { return reads.shift() },
        async durableWrite(path, value, options) {
          writes.push({ path, value, options })
          return { durability: writes.length === 1 ? 'queued' : 'synced' }
        },
      },
    },
  }
  try {
    const { loadBeatState } = await bundle()
    await loadBeatState('beat-machine', 'tok')
    const conflict = {
      path: 'state.json',
      conflictContext: { kind: 'beat-state-intent', gridChanges: [[1, 2]], customPadIndices: [] },
      refusedValue: refused,
    }
    assert.equal(await listener(conflict), false)
    assert.equal(await listener(conflict), true)
    assert.equal(writes[1].value.grid[0][0], true)
    assert.equal(writes[1].value.grid[1][2], true)
    assert.equal(writes[1].value.grid[3][4], true, 'the disjoint remote edit survives replay')
    assert.equal(writes[1].options.ifMatch, 'remote-v3')
  } finally {
    delete globalThis.window
  }
})

test('an ordered pattern-intent batch preserves multiple edits and a reversal', async () => {
  const emptyGrid = () => Array.from({ length: 16 }, () => new Array(32).fill(false))
  const remote = { grid: emptyGrid(), customPads: [] }
  remote.grid[1][1] = true
  const refused = { grid: emptyGrid(), customPads: [] }
  refused.grid[2][2] = true
  const context = {
    kind: 'mobius-conflict-context-batch',
    version: 1,
    items: [
      { kind: 'beat-state-intent', gridChanges: [[0, 0]], customPadIndices: [] },
      { kind: 'beat-state-intent', gridChanges: [[2, 2]], customPadIndices: [] },
      { kind: 'beat-state-intent', gridChanges: [[0, 0]], customPadIndices: [] },
    ],
  }
  let listener
  const writes = []
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      online: true,
      storage: {
        onConflict(cb) { listener = cb; return () => {} },
        async getWithVersion() { return { value: remote, version: 'remote-v2' } },
        async durableWrite(path, value, options) {
          writes.push({ path, value, options })
          return { durability: 'synced' }
        },
      },
    },
  }
  try {
    const { updateBeatState } = await bundle()
    await updateBeatState('beat-machine', 'tok', {})
    writes.length = 0
    assert.equal(await listener({
      path: 'state.json',
      conflictContext: context,
      refusedValue: refused,
    }), true)
    assert.equal(writes[0].value.grid[0][0], false)
    assert.equal(writes[0].value.grid[1][1], true)
    assert.equal(writes[0].value.grid[2][2], true)
    assert.deepEqual(writes[0].options.conflictContext, context)
  } finally {
    delete globalThis.window
  }
})

test('state updates without a runtime or credentials are a fetch-free no-op', async () => {
  const oldFetch = globalThis.fetch
  let fetched = false
  globalThis.window = {}
  globalThis.fetch = async () => {
    fetched = true
    throw new Error('must not fetch an undefined app path')
  }
  try {
    const { updateBeatState } = await bundle()
    const updatedAt = await updateBeatState(undefined, undefined, {
      grid: Array.from({ length: 16 }, () => new Array(32).fill(false)),
    })
    assert.equal(fetched, false)
    assert.ok(Number.isFinite(Date.parse(updatedAt)))
  } finally {
    globalThis.fetch = oldFetch
    delete globalThis.window
  }
})

async function bundle() {
  await rm(buildDir, { recursive: true, force: true })
  await mkdir(buildDir, { recursive: true })
  return bundleModule({
    entry: join(root, '..', 'storage.js'),
    outfile: bundled,
    alias: { react: join(root, 'fixtures', 'react-stub.mjs') },
  })
}

test('loadBeatState returns defaults for a real missing state file', async () => {
  const oldFetch = globalThis.fetch
  globalThis.window = {}
  globalThis.fetch = async () => new Response('', { status: 404 })
  try {
    const { loadBeatState } = await bundle()
    const state = await loadBeatState('beat-machine', 'tok')
    assert.equal(state.bpm, 120)
    assert.equal(state.grid.length, 16)
    assert.equal(state.grid[0].length, 32)
  } finally {
    globalThis.fetch = oldFetch
    delete globalThis.window
  }
})

test('loadBeatState rejects transient storage failures instead of returning empty state', async () => {
  const oldFetch = globalThis.fetch
  globalThis.window = {}
  globalThis.fetch = async () => new Response('temporarily unavailable', { status: 503 })
  try {
    const { loadBeatState } = await bundle()
    await assert.rejects(
      () => loadBeatState('beat-machine', 'tok'),
      /GET state\.json failed \(503\)/,
    )
  } finally {
    globalThis.fetch = oldFetch
    delete globalThis.window
  }
})

test('loadBeatState propagates runtime bridge failures', async () => {
  globalThis.window = {
    mobius: {
      runtimeFeatures: { authoritativeVersionedReads: true },
      storage: {
        get: async () => {
          throw new Error('offline mirror unavailable')
        },
      },
    },
  }
  try {
    const { loadBeatState } = await bundle()
    await assert.rejects(
      () => loadBeatState('beat-machine', 'tok'),
      /offline mirror unavailable/,
    )
  } finally {
    delete globalThis.window
  }
})
