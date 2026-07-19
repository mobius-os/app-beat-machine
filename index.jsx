import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioEngine,
  CUSTOM_START,
  MAX_RECORD_SECONDS,
  PADS,
  TOTAL_BEATS,
  createInitialPads,
  createRecordingBuffer,
  drawLiveWaveform,
  drawWaveform,
  installKitBuffers,
  restoreSavedAudio,
  serializeCustomPads,
} from './audio.js'
import { createEmptyGrid, loadBeatState, saveBeatState, useOnline } from './storage.js'
import { CSS, S } from './styles.js'
import { ControlPanel } from './ui/ControlPanel.jsx'
import { Header } from './ui/Header.jsx'
import { PadBanks } from './ui/PadBanks.jsx'
import { Sequencer } from './ui/Sequencer.jsx'

const SAVE_DEBOUNCE_MS = 800
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SECONDS = 0.1

function signal(name, payload) {
  try { window.mobius?.signal?.(name, payload) } catch {}
}

export default function BeatMachine({ appId, token }) {
  const online = useOnline()

  const engineRef = useRef(null)
  const presetsLoadedRef = useRef(false)
  const schedulerRef = useRef(null)
  const nextBeatTimeRef = useRef(0)
  const currentBeatRef = useRef(0)
  const playRef = useRef(false)
  const activeSrcRef = useRef(null)

  const [pads, setPadsState] = useState(createInitialPads)
  const padsRef = useRef(pads)
  const setPads = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(padsRef.current) : updater
    padsRef.current = next
    setPadsState(next)
  }, [])

  const [grid, setGridState] = useState(createEmptyGrid)
  const gridRef = useRef(grid)
  const setGrid = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(gridRef.current) : updater
    gridRef.current = next
    setGridState(next)
  }, [])

  const [volumes, setVolumes] = useState(() => new Array(PADS).fill(0.8))
  const volumesRef = useRef(volumes)
  const [echo, setEcho] = useState(0)
  const echoRef = useRef(echo)
  const [reverb, setReverb] = useState(0)
  const reverbRef = useRef(reverb)
  const [bpm, setBpm] = useState(120)
  const bpmRef = useRef(bpm)

  const [playing, setPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [selectedPad, setSelectedPad] = useState(null)
  const [activePadIdx, setActivePadIdx] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const isRecordingRef = useRef(false)
  const [recordTarget, setRecordTarget] = useState(null)
  const recordIntentRef = useRef(null)
  const [stateLoaded, setStateLoaded] = useState(false)
  const [toast, setToast] = useState('')

  const saveTimerRef = useRef(null)
  const readySignalRef = useRef(false)
  const firstStepRef = useRef(false)
  const recordingSessionRef = useRef(null)
  const recLevelsRef = useRef([])
  const liveCanvasRef = useRef(null)
  const waveCanvasRef = useRef(null)
  const seqScrollRef = useRef(null)

  useEffect(() => { padsRef.current = pads }, [pads])
  useEffect(() => { gridRef.current = grid }, [grid])
  useEffect(() => { volumesRef.current = volumes }, [volumes])
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { echoRef.current = echo }, [echo])
  useEffect(() => { reverbRef.current = reverb }, [reverb])

  const showToast = useCallback((message) => {
    setToast(message)
    window.clearTimeout(showToast.timer)
    showToast.timer = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine()
    engineRef.current.init()
    return engineRef.current
  }, [])

  const initPresets = useCallback(() => {
    const engine = getEngine()
    if (!presetsLoadedRef.current) {
      presetsLoadedRef.current = true
      setPads((prev) => installKitBuffers(prev, engine.ctx))
    }
    volumesRef.current.forEach((value, idx) => engine.setVolume(idx, value))
    engine.setEcho(echoRef.current)
    engine.setReverb(reverbRef.current)
    return engine
  }, [getEngine, setPads])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const saved = await loadBeatState(appId, token)
        if (!alive) return
        setGrid(saved.grid)
        setBpm(saved.bpm)
        setVolumes(saved.volumes)
        setEcho(saved.echo)
        setReverb(saved.reverb)
        if (saved.customPads.length) {
          const engine = getEngine()
          setPads((prev) => {
            const next = [...prev]
            for (const item of saved.customPads) {
              const buffer = restoreSavedAudio(engine.ctx, item.audio)
              if (!buffer) continue
              next[item.idx] = {
                ...next[item.idx],
                name: item.name || `Rec ${item.idx - CUSTOM_START + 1}`,
                color: item.color || next[item.idx].color,
                buffer,
                savedAudio: item.audio,
                isPreset: false,
              }
            }
            return next
          })
        }
        setStateLoaded(true)
      } catch (err) {
        if (!alive) return
        showToast("Couldn't load saved beat")
        signal('error', { operation: 'load_state', message: String(err?.message || err) })
      }
    })()
    return () => { alive = false }
  }, [appId, token, getEngine, setGrid, setPads, showToast])

  useEffect(() => {
    if (engineRef.current) {
      volumes.forEach((value, idx) => engineRef.current.setVolume(idx, value))
    }
  }, [volumes])

  useEffect(() => {
    if (engineRef.current) engineRef.current.setEcho(echo)
  }, [echo])

  useEffect(() => {
    if (engineRef.current) engineRef.current.setReverb(reverb)
  }, [reverb])

  useEffect(() => {
    if (!stateLoaded) return undefined
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveBeatState(appId, token, {
          grid,
          bpm,
          volumes,
          echo,
          reverb,
          customPads: serializeCustomPads(padsRef.current),
        })
      } catch (err) {
        showToast("Couldn't save changes")
        signal('error', { operation: 'save_state', message: String(err?.message || err) })
      }
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(saveTimerRef.current)
  }, [appId, token, grid, bpm, volumes, echo, reverb, pads, stateLoaded, showToast])

  const activePads = useMemo(
    () => pads.filter((pad) => pad.buffer || pad.isPreset).length,
    [pads],
  )

  useEffect(() => {
    if (!stateLoaded || readySignalRef.current) return
    readySignalRef.current = true
    signal('app_ready', { ready_pads: activePads })
  }, [activePads, stateLoaded])

  const scheduler = useCallback(() => {
    const engine = engineRef.current
    if (!engine?.ctx) return
    while (nextBeatTimeRef.current < engine.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const beat = currentBeatRef.current
      const rows = gridRef.current
      const currentPads = padsRef.current
      for (let idx = 0; idx < PADS; idx += 1) {
        if (rows[idx]?.[beat] && currentPads[idx]?.buffer) {
          engine.play(idx, currentPads[idx].buffer, nextBeatTimeRef.current)
        }
      }
      setCurrentBeat(beat)
      nextBeatTimeRef.current += 60 / bpmRef.current / 4
      currentBeatRef.current = (currentBeatRef.current + 1) % TOTAL_BEATS
    }
  }, [])

  const stopPlayback = useCallback(() => {
    playRef.current = false
    setPlaying(false)
    setCurrentBeat(-1)
    currentBeatRef.current = 0
    if (seqScrollRef.current) seqScrollRef.current.scrollLeft = 0
    window.clearTimeout(schedulerRef.current)
  }, [])

  const startPlayback = useCallback(() => {
    const engine = initPresets()
    playRef.current = true
    setPlaying(true)
    currentBeatRef.current = 0
    nextBeatTimeRef.current = engine.currentTime + 0.05
    const loop = () => {
      if (!playRef.current) return
      scheduler()
      schedulerRef.current = window.setTimeout(loop, LOOKAHEAD_MS)
    }
    loop()
    signal('playback_started')
    const activeSteps = gridRef.current.reduce(
      (sum, row) => sum + row.filter(Boolean).length,
      0,
    )
    if (activeSteps > 0) {
      signal('pattern_played', { active_steps: activeSteps, bpm: bpmRef.current })
    }
  }, [initPresets, scheduler])

  const cleanupRecording = useCallback((cancelSession = true) => {
    recordIntentRef.current = null
    const session = recordingSessionRef.current
    recordingSessionRef.current = null
    if (cancelSession) session?.cancel?.()
    recLevelsRef.current = []
  }, [])

  const resetRecordingState = useCallback(() => {
    setIsRecording(false)
    isRecordingRef.current = false
    setRecordTarget(null)
    setActivePadIdx(null)
  }, [])

  const saveRecording = useCallback((session, target, result) => {
    if (recordingSessionRef.current !== session) return
    const engine = engineRef.current
    cleanupRecording(false)
    resetRecordingState()
    if (!engine || target === null || !result?.samples?.length) return
    const buffer = createRecordingBuffer(
      engine.ctx,
      [result.samples],
      MAX_RECORD_SECONDS,
      result.sampleRate,
    )
    if (!buffer) return
    setPads((prev) => {
      const next = [...prev]
      next[target] = {
        ...next[target],
        buffer,
        savedAudio: null,
        name: next[target].name || `Rec ${target - CUSTOM_START + 1}`,
        isPreset: false,
      }
      return next
    })
    setSelectedPad(target)
    signal('item_created', { type: 'sample' })
  }, [cleanupRecording, resetRecordingState, setPads])

  const failRecording = useCallback((session, error) => {
    if (recordingSessionRef.current !== session) return
    cleanupRecording(false)
    resetRecordingState()
    if (error?.name === 'AbortError') return
    const message = error?.name === 'NotAllowedError'
      ? 'Microphone access was denied. Enable it in your browser settings and try again.'
      : String(error?.message || 'Microphone recording failed.')
    showToast(message)
    signal('record_failed', { message })
  }, [cleanupRecording, resetRecordingState, showToast])

  const stopRecording = useCallback(() => {
    recordingSessionRef.current?.finish?.()
  }, [])

  const startRecording = useCallback(async (padIdx) => {
    if (
      padIdx < CUSTOM_START ||
      isRecordingRef.current ||
      recordIntentRef.current !== null
    ) return
    recordIntentRef.current = padIdx
    let session = null
    try {
      initPresets()
      const capabilities = window.mobius?.capabilities
      if (!capabilities?.available?.('media.microphone.capture', 1)) {
        throw new Error('Microphone recording is unavailable in this browser.')
      }
      session = capabilities.open('media.microphone.capture', {
        maxDurationMs: MAX_RECORD_SECONDS * 1000,
      })
      session.on('level', (level) => {
        const levels = recLevelsRef.current
        levels.push(level)
        if (levels.length > 96) levels.splice(0, levels.length - 96)
        drawLiveWaveform(liveCanvasRef.current, levels)
      })
      recordingSessionRef.current = session
      await session.ready
      if (recordIntentRef.current !== padIdx) {
        session.cancel()
        return
      }
      setRecordTarget(padIdx)
      setIsRecording(true)
      isRecordingRef.current = true
      recordIntentRef.current = null
      setSelectedPad(padIdx)
      signal('record_started')
      session.result
        .then((result) => saveRecording(session, padIdx, result))
        .catch((error) => failRecording(session, error))
    } catch (err) {
      if (session) failRecording(session, err)
      else {
        recordIntentRef.current = null
        resetRecordingState()
        showToast(String(err?.message || 'Microphone recording failed.'))
        signal('record_failed', { message: String(err?.message || err) })
      }
    }
  }, [failRecording, initPresets, resetRecordingState, saveRecording, showToast])

  const playPad = useCallback((padIdx) => {
    const engine = initPresets()
    const pad = padsRef.current[padIdx]
    if (!pad?.buffer) return null
    engine.setEcho(echoRef.current)
    engine.setReverb(reverbRef.current)
    signal('pad_played', { kind: padIdx < CUSTOM_START ? 'kit' : 'sample' })
    return engine.play(padIdx, pad.buffer)
  }, [initPresets])

  const handlePadDown = useCallback((padIdx) => {
    if (isRecordingRef.current || recordIntentRef.current !== null) return
    initPresets()
    setActivePadIdx(padIdx)
    const pad = padsRef.current[padIdx]
    if (padIdx >= CUSTOM_START && !pad?.buffer) {
      startRecording(padIdx)
    } else if (pad?.buffer) {
      setSelectedPad(padIdx)
      activeSrcRef.current = playPad(padIdx)
    }
  }, [initPresets, playPad, startRecording])

  const handlePadUp = useCallback(() => {
    if (!isRecordingRef.current && recordIntentRef.current !== null) {
      recordIntentRef.current = null
      recordingSessionRef.current?.cancel?.()
    }
    if (isRecordingRef.current) stopRecording()
    if (activeSrcRef.current) {
      try { activeSrcRef.current.stop() } catch {}
      activeSrcRef.current = null
    }
    setActivePadIdx(null)
  }, [stopRecording])

  useEffect(() => {
    const up = () => handlePadUp()
    const stopIfHidden = () => {
      if (document.visibilityState === 'hidden') handlePadUp()
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
    document.addEventListener('visibilitychange', stopIfHidden)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', up)
      document.removeEventListener('visibilitychange', stopIfHidden)
    }
  }, [handlePadUp])

  const toggleCell = useCallback((padIdx, beatIdx) => {
    initPresets()
    const turningOn = !gridRef.current[padIdx]?.[beatIdx]
    setGrid((prev) => {
      const next = prev.map((row) => [...row])
      next[padIdx][beatIdx] = !next[padIdx][beatIdx]
      return next
    })
    if (turningOn && !firstStepRef.current) {
      firstStepRef.current = true
      signal('first_step_placed', { kind: padIdx < CUSTOM_START ? 'kit' : 'sample' })
    }
  }, [initPresets, setGrid])

  const clearGrid = useCallback(() => {
    setGrid(createEmptyGrid())
  }, [setGrid])

  const clearPad = useCallback((padIdx) => {
    if (padIdx < CUSTOM_START) return
    setPads((prev) => {
      const next = [...prev]
      next[padIdx] = { ...next[padIdx], buffer: null, savedAudio: null, name: '', isPreset: false }
      return next
    })
    setGrid((prev) => {
      const next = prev.map((row) => [...row])
      next[padIdx] = new Array(TOTAL_BEATS).fill(false)
      return next
    })
    if (selectedPad === padIdx) setSelectedPad(null)
    signal('item_deleted', { type: 'sample' })
  }, [selectedPad, setGrid, setPads])

  useEffect(() => {
    if (selectedPad !== null && pads[selectedPad]?.buffer) {
      window.requestAnimationFrame(() => {
        drawWaveform(waveCanvasRef.current, pads[selectedPad].buffer, pads[selectedPad].color)
      })
    }
  }, [selectedPad, pads])

  useEffect(() => {
    if (currentBeat >= 0 && seqScrollRef.current) {
      const cellWidth = 30
      const el = seqScrollRef.current
      el.scrollLeft = Math.max(0, currentBeat * cellWidth - el.clientWidth / 2 + cellWidth / 2)
    }
  }, [currentBeat])

  const setPadVolume = useCallback((padIdx, value) => {
    setVolumes((prev) => {
      const next = [...prev]
      next[padIdx] = value
      return next
    })
  }, [])

  useEffect(() => () => {
    window.clearTimeout(schedulerRef.current)
    window.clearTimeout(saveTimerRef.current)
    window.clearTimeout(showToast.timer)
    cleanupRecording()
    if (engineRef.current) engineRef.current.dispose()
  }, [cleanupRecording])

  return (
    <div className="bm-root" style={S.root}>
      <style>{CSS}</style>
      <Header appId={appId} online={online} />

      <Sequencer
        pads={pads}
        grid={grid}
        playing={playing}
        bpm={bpm}
        currentBeat={currentBeat}
        seqScrollRef={seqScrollRef}
        onBpmChange={setBpm}
        onTogglePlay={playing ? stopPlayback : startPlayback}
        onClear={clearGrid}
        onToggleCell={toggleCell}
      />

      <div className="bm-bottom" style={S.bottomSection}>
        <PadBanks
          pads={pads}
          selectedPad={selectedPad}
          activePadIdx={activePadIdx}
          isRecording={isRecording}
          recordTarget={recordTarget}
          onPadDown={handlePadDown}
          onPadUp={handlePadUp}
          onClearPad={clearPad}
        />
        <ControlPanel
          pads={pads}
          selectedPad={selectedPad}
          volumes={volumes}
          echo={echo}
          reverb={reverb}
          isRecording={isRecording}
          recordTarget={recordTarget}
          liveCanvasRef={liveCanvasRef}
          waveCanvasRef={waveCanvasRef}
          onVolumeChange={setPadVolume}
          onEchoChange={setEcho}
          onReverbChange={setReverb}
        />
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 16,
            minHeight: 38,
            padding: '9px 12px',
            borderRadius: 10,
            background: 'var(--surface)',
            border: '1px solid #f87171',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 650,
            textAlign: 'center',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
