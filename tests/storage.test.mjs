import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import test from 'node:test'
import { buildEnv, esbuildPath } from './test-deps.mjs'

const execFileAsync = promisify(execFile)
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
    assert.deepEqual(writes.map((write) => write.options), [
      { ifMatch: 'v1' },
      { ifMatch: 'v2' },
    ])
    const landed = writes[1].value
    assert.equal(landed.grid[0][0], true)
    assert.equal(landed.grid[1][2], true)
    assert.deepEqual(landed.customPads.map((pad) => pad.idx), [8, 9])
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
  await execFileAsync(esbuildPath, [
    join(root, '..', 'storage.js'),
    '--bundle',
    '--format=esm',
    '--platform=node',
    `--alias:react=${join(root, 'fixtures', 'react-stub.mjs')}`,
    `--outfile=${bundled}`,
  ], { env: buildEnv() })
  return import(pathToFileURL(bundled))
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
