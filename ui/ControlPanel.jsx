import { CUSTOM_START } from '../audio.js'
import { S } from '../styles.js'
import { SoundIcon } from './PadBanks.jsx'

function EffectIcon({ kind, color }) {
  const style = { ...S.fxIconSvg, color }
  if (kind === 'echo') {
    return (
      <svg style={style} viewBox="0 0 28 28" aria-hidden="true">
        <path d="M6 16c2.6-5.5 7.4-5.5 10 0s7.4 5.5 10 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 21c3-3 6-3 9 0s6 3 9 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" />
        <path d="M5 11c3-3 6-3 9 0s6 3 9 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.35" />
      </svg>
    )
  }
  if (kind === 'reverb') {
    return (
      <svg style={style} viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="4" fill="currentColor" opacity="0.28" />
        <circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.7" />
        <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      </svg>
    )
  }
  return null
}

function ActionIcon({ kind }) {
  if (kind === 'rename') {
    return (
      <svg style={S.tinyBtnIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19h4.2L18.7 9.5a2.2 2.2 0 0 0-3.1-3.1L6.1 15.9 5 19z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.4 7.6l2 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'delete') {
    return (
      <svg style={S.tinyBtnIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 8h10M10 8V6h4v2M9 11v6M15 11v6M8 8l.7 11h6.6L16 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return null
}

function SliderRow({ label, value, onChange, accentColor, kind = null }) {
  const pct = Math.round((value ?? 0) * 100)
  const isFx = kind === 'echo' || kind === 'reverb'
  const sliderStyle = isFx ? S.fxSlider : S.slider
  const valueStyle = isFx ? S.fxSliderVal : S.sliderVal
  return (
    <label style={isFx ? S.fxSliderRow : S.sliderRow}>
      {isFx ? (
        <span
          style={{ ...S.fxIconBadge, borderColor: `${accentColor}44`, background: `${accentColor}12` }}
          title={label}
          aria-hidden="true"
        >
          <EffectIcon kind={kind} color={accentColor} />
        </span>
      ) : (
        <span style={S.sliderLabel}>{label}</span>
      )}
      <input
        className="bm-slider"
        type="range"
        min={0}
        max={100}
        value={pct}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        style={{
          ...sliderStyle,
          '--bm-slider-color': accentColor,
          '--bm-slider-pct': `${pct}%`,
        }}
      />
      {!isFx && <span style={valueStyle}>{pct}%</span>}
    </label>
  )
}

export function ControlPanel({
  pads,
  selectedPad,
  volumes,
  echo,
  reverb,
  isRecording,
  recordTarget,
  renamingPad,
  renameVal,
  liveCanvasRef,
  waveCanvasRef,
  onRenameValChange,
  onRenameFinish,
  onRenameCancel,
  onStartRename,
  onClearPad,
  onVolumeChange,
  onEchoChange,
  onReverbChange,
}) {
  const selected = selectedPad !== null ? pads[selectedPad] : null
  return (
    <aside style={S.rightPanel} aria-label="Sample controls and effects">
      {isRecording ? (
        <div style={S.waveArea}>
          <div style={S.recLabel}>
            <span aria-hidden="true">●</span>
            Rec {recordTarget - CUSTOM_START + 1}
          </div>
          <canvas ref={liveCanvasRef} width={300} height={40} style={S.waveCanvas} />
        </div>
      ) : renamingPad !== null ? (
        <div style={S.waveArea}>
          <input
            autoFocus
            value={renameVal}
            onChange={(event) => onRenameValChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onRenameFinish()
              if (event.key === 'Escape') onRenameCancel()
            }}
            style={S.renameInput}
            maxLength={12}
            aria-label="Sample name"
          />
          <button type="button" style={S.renameBtn} onClick={onRenameFinish}>OK</button>
        </div>
      ) : selected?.buffer ? (
        <div style={S.waveArea}>
          <div style={S.selRow}>
            <span style={S.selectedIconSlot} aria-hidden="true">
              <SoundIcon
                name={selected.name}
                color={selected.color}
                custom={selectedPad >= CUSTOM_START}
                size={18}
              />
            </span>
            <span style={S.selName}>{selected.name}</span>
            {selected.isPreset && <span style={S.presetTag}>KIT</span>}
            {selectedPad >= CUSTOM_START && (
              <>
                <button
                  type="button"
                  style={S.tinyBtn}
                  onClick={() => onStartRename(selectedPad)}
                  title="Rename sample"
                  aria-label="Rename sample"
                >
                  <ActionIcon kind="rename" />
                </button>
                <button
                  type="button"
                  style={{ ...S.tinyBtn, color: '#f87171' }}
                  onClick={() => onClearPad(selectedPad)}
                  title="Delete sample"
                  aria-label="Delete sample"
                >
                  <ActionIcon kind="delete" />
                </button>
              </>
            )}
          </div>
          <canvas ref={waveCanvasRef} style={S.waveCanvasTall} />
          <SliderRow
            label="Vol"
            value={volumes[selectedPad] ?? 0.8}
            accentColor={selected.color}
            onChange={(value) => onVolumeChange(selectedPad, value)}
          />
        </div>
      ) : (
        <div style={S.emptyHint}>Tap a sound to preview{'\n'}Hold an empty custom pad to record</div>
      )}

      <div style={S.fxArea}>
        <SliderRow label="Echo" value={echo} accentColor="#60a5fa" kind="echo" onChange={onEchoChange} />
        <SliderRow label="Reverb" value={reverb} accentColor="#c084fc" kind="reverb" onChange={onReverbChange} />
      </div>
    </aside>
  )
}
