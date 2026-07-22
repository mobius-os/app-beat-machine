import { TOTAL_BEATS } from './audio.js'

export const CSS = `
.bm-root :where(button, input):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.bm-root button {
  touch-action: manipulation;
}
.bm-root button:disabled {
  cursor: default !important;
}
@media (hover: hover) {
  .bm-root button:not(:disabled):hover {
    filter: brightness(1.08);
  }
}
.bm-root {
  overflow-y: hidden !important;
}
.bm-root .bm-sequencer {
  flex: 1 1 auto !important;
  overflow: hidden !important;
}
.bm-root .bm-seq-viewport {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  overscroll-behavior: contain;
}
.bm-root .bm-bottom {
  flex: 0 0 auto !important;
  margin-top: auto;
}
.bm-root .bm-seq-labels,
.bm-root .bm-seq-grid {
  height: 100%;
  min-height: 0;
}
.bm-root .bm-seq-row-label,
.bm-root .bm-seq-cells {
  flex: 1 1 0;
  min-height: 18px;
  max-height: 32px;
}
.bm-root .bm-seq-row-label {
  height: auto !important;
}
.bm-root .bm-seq-cells > button {
  height: 100% !important;
}
@media (max-width: 700px) {
  .bm-root .bm-sample-panel {
    gap: 4px !important;
    padding: 6px 8px !important;
  }
}
.bm-root button:not(:disabled):active {
  filter: brightness(0.96);
}
.bm-root .bm-scroll-skin {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.bm-root .bm-scroll-skin::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.bm-root .bm-slider {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  height: 44px;
  cursor: pointer;
}
.bm-root .bm-bpm-range {
  min-height: 44px;
  touch-action: manipulation;
}
.bm-root .bm-slider::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: linear-gradient(90deg, var(--bm-slider-color) 0 var(--bm-slider-pct), var(--surface2) var(--bm-slider-pct) 100%);
}
.bm-root .bm-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -6px;
  border-radius: 999px;
  border: 3px solid var(--bm-slider-color);
  background: var(--text);
  box-shadow: 0 1px 5px rgba(0,0,0,0.34);
}
.bm-root .bm-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: linear-gradient(90deg, var(--bm-slider-color) 0 var(--bm-slider-pct), var(--surface2) var(--bm-slider-pct) 100%);
}
.bm-root .bm-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 3px solid var(--bm-slider-color);
  background: var(--text);
  box-shadow: 0 1px 5px rgba(0,0,0,0.34);
}
@media (prefers-reduced-motion: reduce) {
  .bm-root *, .bm-root *::before, .bm-root *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`

export const S = {
  root: {
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    padding: 'max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
    gap: 12,
    overflowX: 'hidden',
    overflowY: 'auto',
    fontFamily: 'var(--font)',
    userSelect: 'none',
    color: 'var(--text)',
    background: 'var(--bg)',
    WebkitFontSmoothing: 'antialiased',
    WebkitTapHighlightColor: 'transparent',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: '0 0 auto',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  appIcon: {
    width: 30,
    height: 30,
    flex: '0 0 auto',
    objectFit: 'contain',
    borderRadius: 7,
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.22))',
  },
  logoFallback: {
    width: 30,
    height: 30,
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--accent)',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    letterSpacing: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  offlinePill: {
    fontSize: 10,
    padding: '4px 8px',
    borderRadius: 999,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    fontWeight: 700,
    flex: '0 0 auto',
  },
  seqSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: '0 0 auto',
    minHeight: 0,
    overflow: 'visible',
  },
  transport: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: '0 0 auto',
  },
  transportBtn: {
    minHeight: 44,
    padding: '6px 15px',
    borderRadius: 8,
    border: 'none',
    color: 'var(--accent-fg)',
    fontWeight: 650,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  bpmControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 130,
  },
  bpmLabel: {
    fontSize: 10,
    fontWeight: 650,
    color: 'var(--muted)',
  },
  bpmSlider: {
    flex: 1,
    minWidth: 0,
    accentColor: 'var(--accent)',
  },
  bpmValue: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text)',
    minWidth: 28,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  clearBtn: {
    minHeight: 44,
    padding: '6px 11px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--muted)',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  dialogBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    background: 'rgba(4,6,10,0.58)',
  },
  clearDialog: {
    width: 'min(310px, 100%)',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    padding: 14,
    boxShadow: '0 8px 18px rgba(0,0,0,0.34)',
  },
  clearDialogTitle: {
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  clearDialogText: {
    fontSize: 11,
    lineHeight: 1.45,
    color: 'var(--muted)',
  },
  clearDialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 7,
    marginTop: 14,
  },
  dialogCancelBtn: {
    minHeight: 44,
    padding: '6px 11px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  dialogDangerBtn: {
    minHeight: 44,
    padding: '6px 11px',
    borderRadius: 6,
    border: '1px solid var(--danger)',
    background: 'var(--danger)',
    color: 'var(--accent-fg)',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    whiteSpace: 'nowrap',
  },
  seqScrollWrapper: {
    display: 'flex',
    flex: '0 0 auto',
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    touchAction: 'pan-x pan-y',
    overscrollBehavior: 'contain',
  },
  seqLabelsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flexShrink: 0,
  },
  seqScrollArea: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
    minWidth: 0,
    touchAction: 'pan-x pan-y',
  },
  seqGridInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: TOTAL_BEATS * 34,
    height: '100%',
    minHeight: 0,
  },
  beatNumbers: {
    display: 'grid',
    gridTemplateColumns: `repeat(${TOTAL_BEATS}, 1fr)`,
    gap: 2,
    height: 12,
  },
  beatNum: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    lineHeight: 1,
    padding: 0,
    minWidth: 32,
    fontVariantNumeric: 'tabular-nums',
  },
  seqHeaderSpacer: {
    height: 12,
    flexShrink: 0,
  },
  seqRowLabel: {
    width: 24,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 5,
    height: 32,
  },
  seqCells: {
    display: 'grid',
    gridTemplateColumns: `repeat(${TOTAL_BEATS}, 1fr)`,
    gap: 2,
  },
  cell: {
    height: 32,
    borderRadius: 3,
    border: '1px solid var(--border)',
    transition: 'background 0.08s, border-color 0.08s, opacity 0.08s',
    minWidth: 32,
    padding: 0,
  },
  bottomSection: {
    display: 'flex',
    gap: 12,
    alignItems: 'stretch',
    flexShrink: 0,
  },
  padArea: {
    width: 'min(56%, 248px)',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: 'var(--muted)',
    textTransform: 'uppercase',
  },
  padGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(42px, 58px))',
    justifyContent: 'start',
    gap: 5,
  },
  pad: {
    aspectRatio: '1',
    minHeight: 0,
    border: '1px solid var(--border)',
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.1s, border-color 0.1s, transform 0.1s, box-shadow 0.1s',
    fontFamily: 'var(--font)',
    color: 'var(--text)',
    background: 'var(--surface)',
    padding: 0,
    touchAction: 'none',
  },
  padInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    pointerEvents: 'none',
    minWidth: 0,
    maxWidth: '100%',
  },
  padIcon: {
    width: 26,
    height: 26,
    flex: '0 0 auto',
    display: 'block',
  },
  padName: {
    fontSize: 7.6,
    fontWeight: 700,
    lineHeight: 1.05,
    opacity: 0.72,
    width: '100%',
    maxWidth: '100%',
    overflow: 'visible',
    textOverflow: 'clip',
    whiteSpace: 'normal',
    textAlign: 'center',
    textWrap: 'balance',
  },
  recDot: {
    width: 13,
    height: 13,
    borderRadius: 999,
    background: '#f87171',
    boxShadow: '0 0 0 4px rgba(248,113,113,0.14)',
  },
  rightPanel: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  waveArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: '8px 10px',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    overflow: 'hidden',
  },
  sampleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    width: '100%',
    minWidth: 0,
  },
  sampleIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  selectedIconSlot: {
    width: 18,
    height: 18,
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selName: {
    fontWeight: 650,
    fontSize: 11,
    color: 'var(--text)',
    flex: '1 1 48px',
    minWidth: 0,
    maxWidth: 98,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  waveCanvas: {
    borderRadius: 4,
    width: '100%',
    height: 32,
    display: 'block',
    flexShrink: 0,
  },
  waveCanvasTall: {
    borderRadius: 5,
    width: '100%',
    height: 48,
    display: 'block',
    flexShrink: 0,
  },
  emptyHint: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: 'var(--muted)',
    textAlign: 'center',
    whiteSpace: 'pre-line',
    lineHeight: 1.5,
    opacity: 1,
    padding: '8px 10px',
  },
  fxArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 10px 10px',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface2)',
    flexShrink: 0,
  },
  sliderRow: {
    display: 'grid',
    gridTemplateColumns: '34px minmax(0, 1fr) 30px',
    alignItems: 'center',
    gap: 6,
  },
  fxSliderRow: {
    display: 'grid',
    gridTemplateColumns: '24px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
  },
  fxIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxIconSvg: {
    width: 19,
    height: 19,
    display: 'block',
  },
  sliderLabel: {
    fontSize: 9,
    color: 'var(--muted)',
    fontWeight: 650,
    flexShrink: 0,
    width: 34,
  },
  fxSliderLabel: {
    fontSize: 9,
    fontWeight: 800,
    textAlign: 'center',
    lineHeight: 1,
  },
  slider: {
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
  fxSlider: {
    minWidth: 0,
    width: '100%',
  },
  sliderVal: {
    fontSize: 9,
    color: 'var(--muted)',
    flexShrink: 0,
    width: 28,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
  recLabel: {
    fontSize: 10,
    color: '#f87171',
    fontWeight: 650,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  presetTag: {
    fontSize: 6,
    padding: '1px 4px',
    borderRadius: 3,
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    fontWeight: 700,
  },
}
