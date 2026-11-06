# FocusGuard

A Chrome extension (Manifest V3) that blocks or time-limits distracting websites, with a visual countdown.

## What it does
- Add a site from the popup — either **block it entirely** or **limit it to 5 minutes/day**
- Auto-detects the domain of your current tab for quick adding
- Tracks time spent per domain via a background service worker
- Once the daily limit is hit, the tab is redirected to a block page with a countdown
- Options page for managing rules beyond the popup's quick-add list

## Permissions used
- `tabs` — detect and track the active tab's domain
- `storage` — persist blocked/limited site rules and usage stats locally
- `alarms` — trigger the block once a site's time limit is reached
- `activeTab` — read the current tab's URL for auto-fill

## How to load it (development)
1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder

## Files
- `manifest.json` — extension manifest (Manifest V3)
- `background.js` — service worker: tracks active tab time, triggers blocking
- `popup.html` / `popup.js` — toolbar popup UI for adding sites
- `options.html` / `options.js` — full options page
- `blocked.html` / `blocked.js` — the page shown when a site is blocked

## Status
Functional, Manifest V3 compliant. Not yet published to the Chrome Web Store.

## Versioning
This project follows [Semantic Versioning](https://semver.org/), matching the version declared in `manifest.json`. See `CHANGELOG.md` for release history.
`v2.1.0` is the preserved baseline captured before any further improvements.
