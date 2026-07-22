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
  liveCanvasRef,
  waveCanvasRef,
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
      ) : selected?.buffer ? (
        <div className="bm-sample-panel" style={S.waveArea}>
          <div style={S.sampleHeader}>
            <div style={S.sampleIdentity}>
              <span style={S.selectedIconSlot} aria-hidden="true">
                <SoundIcon
                  name={selected.name}
                  color={selected.color}
                  custom={selectedPad >= CUSTOM_START}
                  size={18}
                />
              </span>
              <span style={S.selName} title={selected.name}>{selected.name}</span>
              {selected.isPreset && <span style={S.presetTag}>KIT</span>}
            </div>
          </div>
          <canvas className="bm-sample-waveform" ref={waveCanvasRef} style={S.waveCanvasTall} />
          <SliderRow
            label="Vol"
            value={volumes[selectedPad] ?? 0.8}
            accentColor={selected.color}
            onChange={(value) => onVolumeChange(selectedPad, value)}
          />
        </div>
      ) : (
        <div style={S.emptyHint}>
          Tap a sound to play in full{'\n'}
          Hold an empty pad to record{'\n'}
          Hold a recording to delete
        </div>
      )}

      <div style={S.fxArea}>
        <SliderRow label="Echo" value={echo} accentColor="#60a5fa" kind="echo" onChange={onEchoChange} />
        <SliderRow label="Reverb" value={reverb} accentColor="#c084fc" kind="reverb" onChange={onReverbChange} />
      </div>
    </aside>
  )
}
