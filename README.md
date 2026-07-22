# Beat Machine

A native 32-step sequencer for [Möbius](https://github.com/mobius-os/mobius).
Beat Machine keeps the original prod app's simple grid-first workflow: choose
sounds, draw a 32-beat pattern, set BPM, and add custom recordings when needed.
Tap a sound to play it in full; hold an empty custom pad to record, or hold a
filled custom pad to delete it.

This catalog version is intentionally modest. It removes the old unused
Pads/Sequence mode switch while preserving the sequencer, drum-kit voices,
custom sample slots, per-pad volume, and echo/reverb controls.

## Install

### Via the App Store

Open the **App Store** mini-app in Möbius, find **Beat Machine**, and tap
**Install**.

### Via paste-a-URL

In the App Store, choose **Install from URL** and paste:

```
https://raw.githubusercontent.com/mobius-os/app-beat-machine/main/mobius.json
```

## What it stores

Beat Machine stores the 32-step grid and recorded custom samples in
`state.json` through `window.mobius.storage`. Mixer settings live separately in
`settings.json`, so an older device cannot replace a newer pattern merely by
changing volume or BPM. Pattern and recording edits merge against the latest
saved document and retry a compare-and-swap conflict before writing. Writes
queue while offline, and the app code is cached for offline launch.

## License

MIT
