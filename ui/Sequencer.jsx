import { useEffect, useRef, useState } from 'react'
import { CUSTOM_START, TOTAL_BEATS } from '../audio.js'
import { S } from '../styles.js'
import { SoundIcon } from './PadBanks.jsx'

export function Sequencer({
  pads,
  grid,
  playing,
  bpm,
  currentBeat,
  seqScrollRef,
  onBpmChange,
  onTogglePlay,
  onClear,
  onToggleCell,
}) {
  const [confirmClear, setConfirmClear] = useState(false)
  const clearButtonRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const dangerButtonRef = useRef(null)
  const visibleRows = pads
    .map((pad, padIdx) => ({ pad, padIdx }))
    .filter(({ pad, padIdx }) => padIdx < CUSTOM_START || pad.buffer || pad.isPreset)
  const firstCustomPadIdx = visibleRows.find(({ padIdx }) => padIdx >= CUSTOM_START)?.padIdx

  useEffect(() => {
    if (!confirmClear) return undefined
    cancelButtonRef.current?.focus()
    return undefined
  }, [confirmClear])

  const closeClearDialog = () => {
    setConfirmClear(false)
    window.requestAnimationFrame(() => clearButtonRef.current?.focus())
  }

  const handleDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeClearDialog()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [cancelButtonRef.current, dangerButtonRef.current].filter(Boolean)
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const confirmAndClear = () => {
    onClear()
    closeClearDialog()
  }

  return (
    <section style={S.seqSection} aria-label="Step sequencer">
      <div style={S.transport}>
        <button
          type="button"
          style={{ ...S.transportBtn, background: playing ? '#f87171' : 'var(--accent)' }}
          onClick={onTogglePlay}
          aria-pressed={playing}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
        <div style={S.bpmControl}>
          <label style={S.bpmLabel} htmlFor="bm-bpm">BPM</label>
          <input
            id="bm-bpm"
            type="range"
            min={60}
            max={200}
            value={bpm}
            onChange={(event) => onBpmChange(Number(event.target.value))}
            style={S.bpmSlider}
          />
          <span style={S.bpmValue}>{bpm}</span>
        </div>
        <button
          ref={clearButtonRef}
          type="button"
          style={S.clearBtn}
          onClick={() => setConfirmClear(true)}
          title="Clear pattern"
          aria-label="Clear pattern"
        >
          Clear
        </button>
      </div>

      {confirmClear && (
        <div
          style={S.dialogBackdrop}
          role="presentation"
          onClick={closeClearDialog}
        >
          <div
            style={S.clearDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bm-clear-title"
            aria-describedby="bm-clear-copy"
            onKeyDown={handleDialogKeyDown}
            onClick={(event) => event.stopPropagation()}
          >
            <div id="bm-clear-title" style={S.clearDialogTitle}>Clear pattern?</div>
            <div id="bm-clear-copy" style={S.clearDialogText}>
              This removes every active step from the sequencer. Your sounds stay loaded.
            </div>
            <div style={S.clearDialogActions}>
              <button
                ref={cancelButtonRef}
                type="button"
                style={S.dialogCancelBtn}
                onClick={closeClearDialog}
              >
                Cancel
              </button>
              <button
                ref={dangerButtonRef}
                type="button"
                style={S.dialogDangerBtn}
                onClick={confirmAndClear}
              >
                Clear pattern
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bm-scroll-skin" style={S.seqScrollWrapper}>
        <div style={S.seqLabelsCol} aria-hidden="true">
          <div style={S.seqHeaderSpacer} />
          {visibleRows.map(({ pad, padIdx }) => {
            const hasSound = pad.buffer || pad.isPreset
            const startsCustomRows = padIdx === firstCustomPadIdx
            return (
              <div
                key={padIdx}
                style={{
                  ...S.seqRowLabel,
                  borderTop: startsCustomRows ? '1px solid var(--border)' : 'none',
                  marginTop: startsCustomRows ? 3 : 0,
                  opacity: hasSound ? 1 : 0.25,
                }}
                title={pad.name || `Pad ${padIdx + 1}`}
              >
                <SoundIcon
                  name={pad.name}
                  color={pad.color}
                  custom={padIdx >= CUSTOM_START}
                  empty={!hasSound}
                  size={15}
                />
              </div>
            )
          })}
        </div>

        <div className="bm-scroll-skin" style={S.seqScrollArea} ref={seqScrollRef}>
          <div style={S.seqGridInner}>
            <div style={S.beatNumbers} aria-hidden="true">
              {Array.from({ length: TOTAL_BEATS }, (_, beatIdx) => (
                <div
                  key={beatIdx}
                  style={{
                    ...S.beatNum,
                    color: currentBeat === beatIdx ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: currentBeat === beatIdx ? 700 : 400,
                  }}
                >
                  {beatIdx + 1}
                </div>
              ))}
            </div>
            {visibleRows.map(({ pad, padIdx }) => {
              const hasSound = pad.buffer || pad.isPreset
              const startsCustomRows = padIdx === firstCustomPadIdx
              return (
                <div
                  key={padIdx}
                  style={{
                    ...S.seqCells,
                    borderTop: startsCustomRows ? '1px solid var(--border)' : 'none',
                    marginTop: startsCustomRows ? 3 : 0,
                  }}
                  role="row"
                  aria-label={pad.name || `Pad ${padIdx + 1}`}
                >
                  {Array.from({ length: TOTAL_BEATS }, (_, beatIdx) => {
                    const on = grid[padIdx]?.[beatIdx] === true
                    const cur = currentBeat === beatIdx
                    return (
                      <button
                        key={beatIdx}
                        type="button"
                        disabled={!hasSound}
                        onClick={() => onToggleCell(padIdx, beatIdx)}
                        aria-label={`${pad.name || `Pad ${padIdx + 1}`} beat ${beatIdx + 1}`}
                        aria-pressed={on}
                        style={{
                          ...S.cell,
                          background: on
                            ? pad.color
                            : cur
                              ? 'rgba(255,255,255,0.06)'
                              : beatIdx % 8 < 4
                                ? 'var(--surface)'
                                : 'rgba(255,255,255,0.015)',
                          borderColor: cur ? 'var(--accent)' : on ? `${pad.color}66` : 'var(--border)',
                          opacity: hasSound ? 1 : 0.12,
                          cursor: hasSound ? 'pointer' : 'default',
                          boxShadow: on && cur ? `0 0 6px ${pad.color}55` : 'none',
                        }}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
