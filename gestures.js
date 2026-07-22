import { CUSTOM_START } from './audio.js'

export function padHoldAction(padIdx, hasAudio) {
  if (padIdx < CUSTOM_START) return null
  return hasAudio ? 'delete' : 'record'
}

export function padReleaseAction({ held, cancelled, hasAudio }) {
  if (cancelled || held || !hasAudio) return null
  return 'play'
}
