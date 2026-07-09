# Beat Machine

A native sampler pad for [Möbius](https://github.com/mobius-os/mobius). Beat
Machine gives you eight synthesized drum pads, eight custom sample slots, pad
volume controls, and simple echo/reverb effects in an offline-capable mini-app.

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

Beat Machine stores its state in `state.json` through `window.mobius.storage`:
pad volumes, global effects, and recorded custom samples. Writes queue while
offline, and the app code is cached for offline launch.

## License

MIT
