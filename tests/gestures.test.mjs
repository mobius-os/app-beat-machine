import assert from 'node:assert/strict'
import test from 'node:test'

import { padHoldAction, padReleaseAction } from '../gestures.js'

test('a tap plays preset and recorded pads, but not an empty pad', () => {
  assert.equal(padReleaseAction({ held: false, cancelled: false, hasAudio: true }), 'play')
  assert.equal(padReleaseAction({ held: false, cancelled: false, hasAudio: false }), null)
})

test('a hold records an empty custom pad and deletes a filled custom pad', () => {
  assert.equal(padHoldAction(8, false), 'record')
  assert.equal(padHoldAction(8, true), 'delete')
})

test('holding a preset or cancelling a gesture does nothing destructive', () => {
  assert.equal(padHoldAction(0, true), null)
  assert.equal(padReleaseAction({ held: false, cancelled: true, hasAudio: true }), null)
  assert.equal(padReleaseAction({ held: true, cancelled: false, hasAudio: true }), null)
})
