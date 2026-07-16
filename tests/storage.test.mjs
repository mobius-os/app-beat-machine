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
          return { bpm: 96 }
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
    assert.equal((await loadBeatState('beat-machine', 'tok')).bpm, 96)
    await saveBeatState('beat-machine', 'tok', { bpm: 96 })
    assert.deepEqual(calls.map(([method, path]) => [method, path]), [
      ['get', 'state.json'],
      ['set', 'state.json'],
    ])
    assert.equal(calls[1][2].version, 2)
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
