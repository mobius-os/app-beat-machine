import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const styles = readFileSync(new URL('../styles.js', import.meta.url), 'utf8')
const sequencer = readFileSync(new URL('../ui/Sequencer.jsx', import.meta.url), 'utf8')

test('dense sequencer and range controls keep practical touch targets', () => {
  assert.match(styles, /cell:\s*\{[\s\S]*height:\s*32[\s\S]*minWidth:\s*32/)
  assert.match(styles, /seqCells:\s*\{[\s\S]*gap:\s*2/)
  assert.match(styles, /seqLabelsCol:\s*\{[\s\S]*gap:\s*2/)
  assert.match(styles, /\.bm-root \.bm-slider\s*\{[\s\S]*height:\s*44px/)
  assert.match(styles, /\.bm-root \.bm-bpm-range\s*\{[\s\S]*min-height:\s*44px/)
  assert.match(sequencer, /className="bm-bpm-range"/)
})
