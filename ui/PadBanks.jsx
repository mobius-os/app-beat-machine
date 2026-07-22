import { CUSTOM_START } from '../audio.js'
import { S } from '../styles.js'

const ACTIVATION_KEYS = new Set([' ', 'Enter'])

export function SoundIcon({ name, color, custom = false, empty = false, size = 26 }) {
  const style = { ...S.padIcon, width: size, height: size, color: color || 'var(--muted)' }
  if (empty) {
    return (
      <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 8v16M8 16h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (custom) {
    return (
      <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 19c2.5 0 2.5-6 5-6s2.5 10 5 10 2.5-14 5-14 2.5 8 5 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M5 25h22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
      </svg>
    )
  }

  switch (name) {
    case 'Kick':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="16" r="3.5" fill="currentColor" opacity="0.9" />
        </svg>
      )
    case 'Snare':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="7" y="10" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10 16h12M11 20l10-8M11 12l10 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    case 'Closed Hat':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M7 14h18l-3.5-5h-11zM7 18h18l-3.5 5h-11z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16 8v16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
        </svg>
      )
    case 'Open Hat':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M6 13h20l-4.5-6h-11zM8 22h16l-3.5 4h-9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16 14v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
        </svg>
      )
    case 'Clap':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M13 23 7.5 14.5a3 3 0 0 1 5-3.3l2.2 3.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 23l5.5-8.5a3 3 0 0 0-5-3.3l-2.2 3.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 7l-2-3M21 7l2-3M16 6V2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        </svg>
      )
    case 'Rim':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M10 24 22 8M20 24 8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        </svg>
      )
    case 'Low Tom':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <ellipse cx="16" cy="12" rx="9.5" ry="5.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M6.5 12v7.5c0 3 4.3 5.5 9.5 5.5s9.5-2.5 9.5-5.5V12" fill="none" stroke="currentColor" strokeWidth="1.9" />
        </svg>
      )
    case 'High Tom':
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <ellipse cx="16" cy="11" rx="8" ry="4.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path d="M8 11v6c0 2.6 3.6 4.7 8 4.7s8-2.1 8-4.7v-6M11 25h10" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg style={style} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M9 20c3 0 3-8 6-8s3 8 6 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
        </svg>
      )
  }
}

function PadFace({ pad, idx, active, recording }) {
  if (recording) {
    return (
      <div style={S.padInner}>
        <span style={S.recDot} aria-hidden="true" />
        <span style={{ fontSize: 7, color: '#f87171' }}>REC</span>
      </div>
    )
  }
  if (pad.buffer || pad.isPreset) {
    return (
      <div style={S.padInner}>
        <SoundIcon name={pad.name} color={pad.color} custom={idx >= CUSTOM_START} />
        <span style={S.padName}>{pad.name || `Rec ${idx - CUSTOM_START + 1}`}</span>
      </div>
    )
  }
  return (
    <div style={S.padInner}>
      <SoundIcon name={pad.name} color={pad.color} custom={idx >= CUSTOM_START} empty />
    </div>
  )
}

export function PadBanks({
  pads,
  selectedPad,
  activePadIdx,
  isRecording,
  recordTarget,
  onPadDown,
  onPadUp,
}) {
  const handleKeyDown = (event, idx) => {
    if (!ACTIVATION_KEYS.has(event.key) || event.repeat) return
    event.preventDefault()
    onPadDown(idx)
  }

  const handleKeyUp = (event) => {
    if (!ACTIVATION_KEYS.has(event.key)) return
    event.preventDefault()
    onPadUp()
  }

  return (
    <section style={S.padArea} aria-label="Beat pads">
      <div style={S.sectionLabel}>Kit sounds</div>
      <div style={S.padGrid}>
        {pads.slice(0, CUSTOM_START).map((pad, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`${pad.name} pad ${idx + 1}`}
            aria-pressed={selectedPad === idx}
            title={`${pad.name} · tap to play in full`}
            onPointerDown={(event) => {
              event.preventDefault()
              onPadDown(idx)
            }}
            onKeyDown={(event) => handleKeyDown(event, idx)}
            onKeyUp={handleKeyUp}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              ...S.pad,
              background: activePadIdx === idx ? `${pad.color}44` : `linear-gradient(135deg, ${pad.color}15, ${pad.color}05)`,
              borderColor: activePadIdx === idx ? pad.color : selectedPad === idx ? pad.color : `${pad.color}28`,
              boxShadow: activePadIdx === idx ? `0 0 10px ${pad.color}33` : 'none',
              transform: activePadIdx === idx ? 'scale(0.94)' : 'scale(1)',
            }}
          >
            <PadFace pad={pad} idx={idx} active={activePadIdx === idx} recording={false} />
          </button>
        ))}
      </div>

      <div style={{ ...S.sectionLabel, marginTop: 4 }}>Custom sounds</div>
      <div style={S.padGrid}>
        {pads.slice(CUSTOM_START).map((pad, offset) => {
          const idx = offset + CUSTOM_START
          const active = activePadIdx === idx
          const recording = isRecording && recordTarget === idx
          return (
            <button
              key={idx}
              type="button"
              aria-label={`${pad.name || `Custom pad ${offset + 1}`} pad ${idx + 1}`}
              aria-pressed={selectedPad === idx}
              title={pad.buffer
                ? `${pad.name || `Rec ${offset + 1}`} · tap to play · hold to delete`
                : 'Hold to record'}
              onPointerDown={(event) => {
                event.preventDefault()
                onPadDown(idx)
              }}
              onKeyDown={(event) => handleKeyDown(event, idx)}
              onKeyUp={handleKeyUp}
              onContextMenu={(event) => {
                event.preventDefault()
              }}
              style={{
                ...S.pad,
                background: active
                  ? recording ? 'rgba(248,113,113,0.18)' : `${pad.color}44`
                  : pad.buffer ? `linear-gradient(135deg, ${pad.color}18, ${pad.color}06)` : 'var(--surface)',
                borderColor: active
                  ? recording ? '#f87171' : pad.color
                  : selectedPad === idx ? pad.color : pad.buffer ? `${pad.color}28` : 'var(--border)',
                boxShadow: active ? `0 0 10px ${recording ? '#f8717128' : `${pad.color}33`}` : 'none',
                transform: active ? 'scale(0.94)' : 'scale(1)',
              }}
            >
              <PadFace pad={pad} idx={idx} active={active} recording={recording} />
            </button>
          )
        })}
      </div>
    </section>
  )
}
