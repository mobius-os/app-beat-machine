import { TOTAL_BEATS } from './audio.js'

export const CSS = `
.bm-root :where(button, input):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.bm-root button:disabled {
  cursor: default !important;
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
  height: 22px;
  cursor: pointer;
}
.bm-root .bm-slider::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.13);
  background: linear-gradient(90deg, var(--bm-slider-color) 0 var(--bm-slider-pct), rgba(255,255,255,0.22) var(--bm-slider-pct) 100%);
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
  border: 1px solid rgba(255,255,255,0.13);
  background: linear-gradient(90deg, var(--bm-slider-color) 0 var(--bm-slider-pct), rgba(255,255,255,0.22) var(--bm-slider-pct) 100%);
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
    padding: '12px 16px',
    gap: 12,
    overflow: 'hidden',
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
    fontSize: 10,
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
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  transport: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: '0 0 auto',
  },
  transportBtn: {
    minHeight: 32,
    padding: '6px 15px',
    borderRadius: 8,
    border: 'none',
    color: '#fff',
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
    minHeight: 32,
    padding: '6px 11px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--muted)',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  clearGroup: {
    minHeight: 32,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  clearCancelBtn: {
    minHeight: 32,
    padding: '6px 9px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  clearConfirmBtn: {
    minHeight: 32,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(248,113,113,0.56)',
    background: 'rgba(248,113,113,0.13)',
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    whiteSpace: 'nowrap',
  },
  seqScrollWrapper: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  seqLabelsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    flexShrink: 0,
  },
  seqScrollArea: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'auto',
    minWidth: 0,
    touchAction: 'pan-x pan-y',
  },
  seqGridInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: TOTAL_BEATS * 29,
  },
  beatNumbers: {
    display: 'grid',
    gridTemplateColumns: `repeat(${TOTAL_BEATS}, 1fr)`,
    gap: 1,
  },
  beatNum: {
    textAlign: 'center',
    fontSize: 8,
    padding: '1px 0',
    minWidth: 27,
    fontVariantNumeric: 'tabular-nums',
  },
  seqRowLabel: {
    width: 24,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 5,
    height: 21,
  },
  seqCells: {
    display: 'grid',
    gridTemplateColumns: `repeat(${TOTAL_BEATS}, 1fr)`,
    gap: 1,
  },
  cell: {
    height: 21,
    borderRadius: 3,
    border: '1px solid var(--border)',
    transition: 'background 0.08s, border-color 0.08s, opacity 0.08s',
    minWidth: 27,
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
  selRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  selName: {
    fontWeight: 650,
    fontSize: 11,
    color: 'var(--text)',
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
    fontSize: 10,
    color: 'var(--muted)',
    textAlign: 'center',
    whiteSpace: 'pre-line',
    lineHeight: 1.5,
    opacity: 0.62,
    padding: '8px 10px',
  },
  tinyBtn: {
    minHeight: 22,
    padding: '1px 6px',
    borderRadius: 3,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
  fxArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '8px 10px 10px',
    borderTop: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.015)',
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
    minHeight: 28,
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
  renameInput: {
    background: 'var(--bg)',
    border: '1px solid var(--accent)',
    borderRadius: 5,
    color: 'var(--text)',
    padding: '4px 8px',
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
    fontFamily: 'var(--font)',
  },
  renameBtn: {
    minHeight: 28,
    padding: '4px 12px',
    borderRadius: 5,
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 9,
    fontWeight: 650,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  },
}
