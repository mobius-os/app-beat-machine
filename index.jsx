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
import {
  createEmptyGrid,
  loadBeatState,
  saveBeatSettings,
  updateBeatState,
  useOnline,
} from './storage.js'
import { padHoldAction, padReleaseAction } from './gestures.js'
import { CSS, S } from './styles.js'
import { ControlPanel } from './ui/ControlPanel.jsx'
import { Header } from './ui/Header.jsx'
import { PadBanks } from './ui/PadBanks.jsx'
import { Sequencer } from './ui/Sequencer.jsx'

const SAVE_DEBOUNCE_MS = 800
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SECONDS = 0.1
const PAD_HOLD_MS = 520

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
  const persistChainRef = useRef(Promise.resolve())
  const pendingStateWritesRef = useRef(0)
  const settingsRevisionRef = useRef(0)
  const settingsDirtyRef = useRef(false)
  const readySignalRef = useRef(false)
  const firstStepRef = useRef(false)
  const recordingSessionRef = useRef(null)
  const recLevelsRef = useRef([])
  const padGestureRef = useRef(null)
  const currentStateUpdatedAtRef = useRef(null)
  const currentSettingsUpdatedAtRef = useRef(null)
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

  const applySavedState = useCallback((saved) => {
    currentStateUpdatedAtRef.current = saved.stateUpdatedAt || null
    currentSettingsUpdatedAtRef.current = saved.settingsUpdatedAt || null
    setGrid(saved.grid)
    setBpm(saved.bpm)
    setVolumes(saved.volumes)
    setEcho(saved.echo)
    setReverb(saved.reverb)
    setPads((prev) => {
      const next = prev.map((pad, idx) => (
        idx < CUSTOM_START
          ? pad
          : { ...pad, buffer: null, savedAudio: null, name: '', isPreset: false }
      ))
      if (!saved.customPads.length) return next
      const engine = getEngine()
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
  }, [getEngine, setGrid, setPads])

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
        applySavedState(saved)
        setStateLoaded(true)
      } catch (err) {
        if (!alive) return
        showToast("Couldn't load saved beat")
        signal('error', { operation: 'load_state', message: String(err?.message || err) })
      }
    })()
    return () => { alive = false }
  }, [appId, token, applySavedState, showToast])

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

  const persistState = useCallback((overrides = {}) => {
    pendingStateWritesRef.current += 1
    const run = async () => {
      const updatedAt = await updateBeatState(appId, token, overrides)
      currentStateUpdatedAtRef.current = updatedAt
    }
    const next = persistChainRef.current.then(run, run)
    persistChainRef.current = next.then(() => {}, () => {})
    return next
      .catch((err) => {
        showToast("Couldn't save changes")
        signal('error', { operation: 'save_state', message: String(err?.message || err) })
      })
      .finally(() => { pendingStateWritesRef.current -= 1 })
  }, [appId, token, showToast])

  const persistSettings = useCallback(async () => {
    const revision = settingsRevisionRef.current
    const updatedAt = new Date().toISOString()
    try {
      await saveBeatSettings(appId, token, {
        bpm: bpmRef.current,
        volumes: volumesRef.current,
        echo: echoRef.current,
        reverb: reverbRef.current,
        updated_at: updatedAt,
      })
      currentSettingsUpdatedAtRef.current = updatedAt
      if (settingsRevisionRef.current === revision) settingsDirtyRef.current = false
    } catch (err) {
      showToast("Couldn't save changes")
      signal('error', { operation: 'save_settings', message: String(err?.message || err) })
    }
  }, [appId, token, showToast])

  useEffect(() => {
    if (!stateLoaded) return undefined
    let alive = true
    let refreshing = false
    const refreshFromServer = async () => {
      if (
        refreshing ||
        isRecordingRef.current ||
        recordingSessionRef.current !== null ||
        recordIntentRef.current !== null ||
        padGestureRef.current !== null ||
        pendingStateWritesRef.current > 0 ||
        settingsDirtyRef.current
      ) return
      refreshing = true
      try {
        const saved = await loadBeatState(appId, token)
        if (
          alive &&
          (
            saved.stateUpdatedAt !== currentStateUpdatedAtRef.current ||
            saved.settingsUpdatedAt !== currentSettingsUpdatedAtRef.current
          )
        ) {
          applySavedState(saved)
        }
      } catch (err) {
        signal('error', { operation: 'refresh_state', message: String(err?.message || err) })
      } finally {
        refreshing = false
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFromServer()
    }
    window.addEventListener('focus', refreshFromServer)
    window.addEventListener('pageshow', refreshFromServer)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.removeEventListener('focus', refreshFromServer)
      window.removeEventListener('pageshow', refreshFromServer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [appId, token, applySavedState, stateLoaded])

  useEffect(() => {
    if (!stateLoaded) return undefined
    const flush = () => {
      if (!settingsDirtyRef.current) return
      window.clearTimeout(saveTimerRef.current)
      persistSettings()
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('blur', flush)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('blur', flush)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [persistSettings, stateLoaded])

  useEffect(() => {
    if (!stateLoaded) return undefined
    window.clearTimeout(saveTimerRef.current)
    if (!settingsDirtyRef.current) return undefined
    saveTimerRef.current = window.setTimeout(() => persistSettings(), SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(saveTimerRef.current)
  }, [bpm, volumes, echo, reverb, stateLoaded, persistSettings])

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
    const next = [...padsRef.current]
    next[target] = {
      ...next[target],
      buffer,
      savedAudio: null,
      name: next[target].name || `Rec ${target - CUSTOM_START + 1}`,
      isPreset: false,
    }
    setPads(next)
    const recorded = serializeCustomPads(next).find((item) => item.idx === target)
    persistState({
      customPads: (latest) => [
        ...latest.filter((item) => item.idx !== target),
        ...(recorded ? [recorded] : []),
      ].sort((a, b) => a.idx - b.idx),
    })
    setSelectedPad(target)
    signal('item_created', { type: 'sample' })
  }, [cleanupRecording, persistState, resetRecordingState, setPads])

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
      recordingSessionRef.current !== null ||
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
        // A pointer can be released while browser permission is still opening.
        // handlePadUp asks the host to finish that pending session; wait for its
        // result so a second press cannot race the still-exclusive microphone.
        try { await session.result } catch {}
        if (recordingSessionRef.current === session) {
          cleanupRecording(false)
          resetRecordingState()
        }
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
  }, [cleanupRecording, failRecording, initPresets, resetRecordingState, saveRecording, showToast])

  const playPad = useCallback((padIdx) => {
    const engine = initPresets()
    const pad = padsRef.current[padIdx]
    if (!pad?.buffer) return null
    engine.setEcho(echoRef.current)
    engine.setReverb(reverbRef.current)
    signal('pad_played', { kind: padIdx < CUSTOM_START ? 'kit' : 'sample' })
    engine.play(padIdx, pad.buffer)
    return true
  }, [initPresets])

  const clearPad = useCallback((padIdx) => {
    if (padIdx < CUSTOM_START) return
    const nextPads = [...padsRef.current]
    const deletedName = nextPads[padIdx]?.name || `Rec ${padIdx - CUSTOM_START + 1}`
    nextPads[padIdx] = {
      ...nextPads[padIdx], buffer: null, savedAudio: null, name: '', isPreset: false,
    }
    const nextGrid = gridRef.current.map((row) => [...row])
    nextGrid[padIdx] = new Array(TOTAL_BEATS).fill(false)
    setPads(nextPads)
    setGrid(nextGrid)
    persistState({
      grid: (latest) => latest.map((row, idx) => (
        idx === padIdx ? new Array(TOTAL_BEATS).fill(false) : [...row]
      )),
      customPads: (latest) => latest.filter((item) => item.idx !== padIdx),
    })
    if (selectedPad === padIdx) setSelectedPad(null)
    showToast(`${deletedName} deleted`)
    signal('item_deleted', { type: 'sample' })
  }, [persistState, selectedPad, setGrid, setPads, showToast])

  const handlePadDown = useCallback((padIdx) => {
    if (
      isRecordingRef.current ||
      recordingSessionRef.current !== null ||
      recordIntentRef.current !== null
    ) return
    initPresets()
    setActivePadIdx(padIdx)
    const gesture = { padIdx, held: false, timer: null }
    gesture.timer = window.setTimeout(() => {
      if (padGestureRef.current !== gesture) return
      gesture.held = true
      const action = padHoldAction(padIdx, Boolean(padsRef.current[padIdx]?.buffer))
      if (action === 'delete') clearPad(padIdx)
      else if (action === 'record') startRecording(padIdx)
    }, PAD_HOLD_MS)
    padGestureRef.current = gesture
  }, [clearPad, initPresets, startRecording])

  const handlePadUp = useCallback((cancelled = false) => {
    const gesture = padGestureRef.current
    padGestureRef.current = null
    if (gesture) {
      window.clearTimeout(gesture.timer)
      const action = padReleaseAction({
        held: gesture.held,
        cancelled,
        hasAudio: Boolean(padsRef.current[gesture.padIdx]?.buffer),
      })
      if (action === 'play') {
        setSelectedPad(gesture.padIdx)
        playPad(gesture.padIdx)
      }
    }
    if (!isRecordingRef.current && recordIntentRef.current !== null) {
      recordIntentRef.current = null
      // Finish rather than locally cancelling: the finish result is the host's
      // acknowledgement that the exclusive microphone has actually released.
      recordingSessionRef.current?.finish?.()
    }
    if (isRecordingRef.current) stopRecording()
    setActivePadIdx(null)
  }, [playPad, stopRecording])

  useEffect(() => {
    const up = () => handlePadUp(false)
    const cancel = () => handlePadUp(true)
    const stopIfHidden = () => {
      if (document.visibilityState === 'hidden') handlePadUp(true)
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', stopIfHidden)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', stopIfHidden)
    }
  }, [handlePadUp])

  const toggleCell = useCallback((padIdx, beatIdx) => {
    initPresets()
    const turningOn = !gridRef.current[padIdx]?.[beatIdx]
    const next = gridRef.current.map((row) => [...row])
    next[padIdx][beatIdx] = turningOn
    setGrid(next)
    persistState({
      grid: (latest) => latest.map((row, idx) => {
        const updated = [...row]
        if (idx === padIdx) updated[beatIdx] = turningOn
        return updated
      }),
    })
    if (turningOn && !firstStepRef.current) {
      firstStepRef.current = true
      signal('first_step_placed', { kind: padIdx < CUSTOM_START ? 'kit' : 'sample' })
    }
  }, [initPresets, persistState, setGrid])

  const clearGrid = useCallback(() => {
    const next = createEmptyGrid()
    setGrid(next)
    persistState({ grid: next })
  }, [persistState, setGrid])

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
      volumesRef.current = next
      settingsRevisionRef.current += 1
      settingsDirtyRef.current = true
      return next
    })
  }, [])

  const setBpmValue = useCallback((value) => {
    bpmRef.current = value
    settingsRevisionRef.current += 1
    settingsDirtyRef.current = true
    setBpm(value)
  }, [])

  const setEchoValue = useCallback((value) => {
    echoRef.current = value
    settingsRevisionRef.current += 1
    settingsDirtyRef.current = true
    setEcho(value)
  }, [])

  const setReverbValue = useCallback((value) => {
    reverbRef.current = value
    settingsRevisionRef.current += 1
    settingsDirtyRef.current = true
    setReverb(value)
  }, [])

  useEffect(() => () => {
    window.clearTimeout(schedulerRef.current)
    window.clearTimeout(saveTimerRef.current)
    window.clearTimeout(showToast.timer)
    window.clearTimeout(padGestureRef.current?.timer)
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
        onBpmChange={setBpmValue}
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
          onEchoChange={setEchoValue}
          onReverbChange={setReverbValue}
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
