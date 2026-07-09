# Omni Messenger And Insta Lord V4 ULTRA

**Developed by Omni**

## 🔊 Now with 250000x Dominance Profile for Android Quetta Browser!

This is the **loudest messenger/Instagram browser call extension ever made**, with extreme real-time DSP control optimized for Android Quetta.

## Supported call pages

- `https://facebook.com/*`
- `https://*.facebook.com/*`
- `https://messenger.com/*`
- `https://*.messenger.com/*`
- `https://instagram.com/*`
- `https://*.instagram.com/*`

---

## 🚀 PRESETS

### 1. **Royal Clear** (Balanced)
Clean, loud calls with minimal distortion. Good for all-day calls.
- Gain: 24 dB (16x)
- Loudness: 4x
- Boost ceiling: 2000x
- Safe, professional-grade loudness

### 2. **Lord V4** (200000x — Previous Max)
The original extreme profile. Very aggressive.
- Gain: 106 dB (200000x multiplier)
- Compressor Ratio: 20
- Limiter Ceiling: -0.1 dB
- Best for maximum volume with some distortion tolerance

### 3. **🔊 Ultra Quetta** (250000x — NEW!)
**Maximum loudness for Android Quetta browser.** Breaks all safety limits.
- **Gain: 125 dB (250000x!)**
- Saturation Intensity: 3.8x (hyper-aggressive curve)
- 4.5kHz presence peak: +38 dB (voice intelligibility)
- Compressor attack: 0.00003s (instant response)
- Limiter ceiling: +1.0 dB (headroom bypass)
- Sustain Max Gain: 200 (extreme dynamic hold)
- **For Quetta browser + raw WebRTC only**

---

## 🎛️ MANUAL LOUDNESS GUIDE

### ✅ Increase these (move slider RIGHT):

1. **Gain dB** (0–125 dB range) — Primary volume boost
2. **Loudness Trim** (0.5–250000x) — Multiplicative gain
3. **Boost ceiling** (1–250000x) — Loudness hard cap
4. **Saturation Drive** (0–15) — Harmonic distortion intensity
5. **Saturation Intensity** (0.5–5.0) — Curve aggressiveness
6. **Compressor Ratio** (1–20) — Compression ratio
7. **Sustain Max Gain** (1–200) — Anti-ducking hold
8. **Presence EQ** (-60 to +60 dB) — Upper midrange (3200 Hz)
9. **5kHz Peak** (-60 to +60 dB) — Voice presence (Android clarity)
10. **Treble EQ** (-60 to +60 dB) — High frequency boost
11. **Bass EQ** (-60 to +60 dB) — Low end (optional)

### ⬇️ Decrease these (move slider LEFT / more negative):

1. **Compressor Threshold** (-100 to 0 dB) — Make **more negative** (lower threshold = more aggressive compression)
2. **Sustain Target dB** (-24 to +12 dB) — Lower if you need stronger anti-ducking

### ☑️ Keep both checkboxes ON:

- ✅ **Anti-duck sustain lock** — Prevents volume dips during speech
- ✅ **Raw mic constraint lock** — Disables all browser noise suppression
- ✅ **Reverb keep-alive layer** — Prevents audio dropout
- ✅ **Mic activity keep-alive** — Keeps pipeline alive during silence

---

## 🎯 BEST ORDER TO ADJUST (Maximum Loudness)

1. **Start with a preset** (Royal Clear → Lord V4 → Ultra Quetta)
2. **Increase Gain dB first** (biggest impact on volume)
3. **Lower Compressor Threshold to -70 or -80 dB** (activates aggressive compression)
4. **Raise Compressor Ratio to 20** (maximum compression)
5. **Increase Saturation Drive to 2.0–3.0** (adds harmonic punch)
6. **Boost Presence EQ to +25 to +32 dB** (voice clarity)
7. **Boost 5kHz Peak to +20 to +28 dB** (Android clarity on calls)
8. **Adjust Sustain Max Gain to 200** (smooth anti-ducking)
9. **Fine-tune Limiter Ceiling if distorting** (reduce from +1.0 to -1.0 dB)

---

## ⚠️ DISTORTION / CLIPPING FIX

If you hear crackling, popping, or distortion:

1. **Lower Saturation Drive** (2.0 → 1.5 → 1.0)
2. **Lower Saturation Intensity** (2.0 → 1.5)
3. **Lower Gain dB** (110 → 100)
4. **Reduce Limiter Ceiling** (0.5 → -0.5 → -2.0)
5. **Lower Sustain Max Gain** (160 → 100)

If still distorted, switch to **Royal Clear** preset (safe mode).

---

## 🏗️ ARCHITECTURE

- **`core/injector.js`** — DSP pipeline + WebRTC hooks (32KB)
  - Multi-stage audio processing (high-pass → dual compressors → EQ → saturation → sustain → limiter)
  - Real-time track refresh & sender optimization
  - Raw microphone constraint enforcement
  
- **`content/loader.js`** — Extension injector (1.5KB)
  - Loads core engine at document start
  
- **`content/service.js`** — Config sync (2.7KB)
  - Storage listener + periodic config sync to injector
  
- **`popup/popup.html`** — UI (5.1KB)
  - 20+ real-time sliders
  - 3 preset buttons (Royal Clear, Lord V4, Ultra Quetta)
  
- **`popup/popup.js`** — Control logic (6.4KB)
  - Storage persistence
  - Preset switching
  
- **`popup/popup.css`** — Styling (7.1KB)
  - Theme system (royal/lord/ultraQuetta)
  - Dark mode optimized

---

## 📱 ANDROID QUETTA SETUP

1. **Download extension ZIP** from GitHub
2. **Unpack to a local folder** (e.g., `/sdcard/Downloads/omni-v4`)
3. **Enable Developer Mode** on Quetta Browser
4. **Load Unpacked Extension** → select unpacked folder
5. **Open Facebook/Messenger/Instagram Web** in Quetta
6. **Reload the tab** (Ctrl+R or pull refresh)
7. **Join a call** — extension activates automatically
8. **Click extension icon** → select preset or adjust sliders
9. **Test with friend** — you should sound 250000x louder

---

## 🔧 TECHNICAL SPECS

| Parameter | Min | Default | Max | Unit |
|-----------|-----|---------|-----|------|
| Gain | 0 | 125.0 | 125 | dB |
| Loudness Trim | 0.5 | 2.0 | 250000 | x |
| Boost Ceiling | 1 | 250000 | 250000 | x |
| Saturation Drive | 0 | 4.5 | 15 | — |
| Saturation Intensity | 0.5 | 3.8 | 5.0 | — |
| Compressor Threshold | -100 | -82 | 0 | dB |
| Compressor Ratio | 1 | 20 | 20 | — |
| Compressor Attack | 0.00001 | 0.00003 | 1 | s |
| Presence EQ (3.2k) | -60 | +40 | +60 | dB |
| 4.5kHz Peak | -60 | +38 | +60 | dB |
| Limiter Ceiling | -24 | +1.0 | +2 | dB |
| Sustain Max Gain | 1 | 200 | 200 | — |
| Audio Bitrate (SDP) | — | 640 kbps | — | — |
| Sample Rate | — | 48 kHz | — | — |

---

## 📝 NOTES

- **No remote calls or data transmission** — 100% local processing
- **Android Quetta optimized** — WebRTC hooks work best on Quetta/Chromium
- **Extreme settings = extreme volume + potential distortion** — use Royal Clear if overwhelmed
- **Best on calls with good mic hardware** — cheap mics will sound cheap, just louder
- **Profile version: 9** — auto-upgrades from older profiles with new 250000x defaults

---

## ✨ Credits

Developed by **Omni**. For personal use on Messenger, Instagram, and Facebook calls.
