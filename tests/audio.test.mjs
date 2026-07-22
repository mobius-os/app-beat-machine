import assert from 'node:assert/strict'
import test from 'node:test'

import { createRecordingBuffer, findRecordingStart } from '../audio.js'

const SAMPLE_RATE = 1000

function fakeContext() {
  return {
    sampleRate: SAMPLE_RATE,
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length)
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: () => data,
      }
    },
  }
}

test('findRecordingStart removes dead air and preserves a short pre-roll', () => {
  const data = new Float32Array(240)
  data.fill(0.5, 120)
  assert.equal(findRecordingStart(data, SAMPLE_RATE), 100)
})

test('findRecordingStart does not trim a soft recording it cannot classify safely', () => {
  const data = new Float32Array(120)
  data.fill(0.015, 60)
  assert.equal(findRecordingStart(data, SAMPLE_RATE), 0)
})

test('findRecordingStart keeps an immediate attack at the beginning', () => {
  const data = new Float32Array(120)
  data.fill(0.6, 0, 24)
  assert.equal(findRecordingStart(data, SAMPLE_RATE), 0)
})

test('createRecordingBuffer trims before allocating and normalizes the result', () => {
  const source = new Float32Array(220)
  source.fill(0.3, 100)
  const buffer = createRecordingBuffer(fakeContext(), [source], 8, SAMPLE_RATE)
  assert.equal(buffer.length, 136)
  assert.equal(buffer.sampleRate, SAMPLE_RATE)
  assert.ok(Math.abs(buffer.getChannelData(0)[16] - 0.9) < 1e-6)
})
