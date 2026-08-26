# PR: Fix popup script and constrain popup size (port WhatsApp logic; add reset; accept older profiles)

## Summary
This PR hardens and fixes the extension popup UI so it no longer renders as a tiny black square or a tall/glitched banner in Chromium browsers.

## Problem
- popup.js previously contained brittle code (merge markers / duplicate declarations / fragile element references) that could cause parse or runtime errors and abort UI initialization.
- popup.css allowed the popup to expand or render inconsistently on some Chromium builds (backdrop-filter and missing forced dimensions contributed to flicker / tiny popup rendering).
- Stored configs with older `profileVersion` could be rejected or replaced, causing unexpected behavior.

## Changes in this branch
- popup/popup.js
  - Replaced fragile logic with a proven "WhatsApp-style" load/save flow:
    - derives input IDs from DEFAULTS so missing IDs won't crash the script
    - merges stored config into DEFAULTS (accepts older profile versions)
    - debounced storage writes and immediate-save on change
    - added a `Reset settings` handler and safe init fallback that shows a user-visible fallback when JS fails
- popup/popup.css
  - Force a fixed popup width (380px) and min-height (420px) to avoid tiny/blank popups
  - Ensure the `.panel` is scrollable (max-height + overflow) so the popup remains compact
  - Avoid heavy `backdrop-filter` in the popup context to reduce repaint/flicker on Chromium builds
- popup/popup.html
  - (Optional) Recommended: add the small fallback block and Reset button that the new JS hooks into (a snippet is available in the branch notes).

## Test steps
1. Load the branch as an unpacked extension in Chrome/Edge (chrome://extensions → Developer mode → Load unpacked → select repo folder).
2. Click the extension icon to open the popup.
3. Open popup DevTools (right-click inside popup → Inspect) and confirm the Console shows no SyntaxError or runtime exceptions.
4. Confirm the popup displays at a usable size (~380px width) and the inner controls scroll (not a vertical banner or tiny square).
5. Interact with the presets, sliders, and checkboxes; verify that values persist in storage under `micMaximizerConfig`.
6. (Optional) Use the `Reset settings` button to restore defaults for testing.

## Notes
- The change is conservative and targets only popup UI behavior; background/content/injector code is unchanged.
- If you see a console error after loading this branch, paste the exact error text and I will patch it immediately.

---

If you want me to create and merge the PR for you, click the compare link below, review, and merge. If you'd like, I can also add reviewers or a changelog entry before merging.

Compare & create PR:
https://github.com/SonGokuKakarrot/Omni-Messenger-Lord-V5/compare/main...fix/popup-merge-and-popup-size?expand=1

