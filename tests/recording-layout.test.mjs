import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const index = readFileSync(new URL('../index.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../styles.js', import.meta.url), 'utf8')
const controls = readFileSync(new URL('../ui/ControlPanel.jsx', import.meta.url), 'utf8')

test('recording uses the trusted Möbius microphone bridge', () => {
  // The runtime exposes microphone capture through the capability broker
  // (window.mobius.capabilities.open('media.microphone.capture')); the older
  // window.mobius.microphone.start bridge no longer exists on the shell.
  assert.match(index, /capabilities\.open\('media\.microphone\.capture'/)
  assert.match(index, /await session\.ready/)
  assert.match(index, /session\.result[\s\S]*saveRecording/)
  assert.doesNotMatch(index, /navigator\.mediaDevices|getUserMedia/)
})

test('recorded sample rate is preserved when building the audio buffer', async () => {
  const { createRecordingBuffer } = await import('../audio.js')
  const created = []
  const ctx = {
    sampleRate: 48_000,
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length)
      const buffer = {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: () => data,
      }
      created.push(buffer)
      return buffer
    },
  }

  const buffer = createRecordingBuffer(
    ctx,
    [new Float32Array([0.1, 0.2, 0.3, 0.4])],
    8,
    16_000,
  )

  assert.equal(created.length, 1)
  assert.equal(buffer.sampleRate, 16_000)
  assert.equal(buffer.length, 4)
})

test('responsive layout keeps every loaded row compact above bottom controls', () => {
  assert.match(styles, /\.bm-root\s*\{[\s\S]*overflow-y:\s*hidden\s*!important/)
  assert.match(styles, /\.bm-root \.bm-bottom\s*\{[\s\S]*margin-top:\s*auto/)
  assert.match(styles, /\.bm-root \.bm-seq-row-label,[\s\S]*min-height:\s*18px;[\s\S]*max-height:\s*32px/)
  assert.match(controls, /className="bm-sample-waveform"/)
  assert.doesNotMatch(styles, /\.bm-root \.bm-sample-waveform\s*\{[\s\S]*display:\s*none/)
})

test('compact sound profile omits edit, delete, and saved-recording chrome', () => {
  assert.doesNotMatch(controls, /Rename sample|Delete sample/)
  assert.doesNotMatch(index, /Recording saved/)
})
