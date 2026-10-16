# Whereabouts kiosk, Ontario Tourism Summit

A self-contained, offline kiosk site for the Whereabouts booth. Portrait touchscreen, 1080 x 1920, tap-through chapters with an attract loop.

## Run it

The whole `kiosk` folder is the deliverable. Copy it to the kiosk PC (or a USB stick) and open `index.html` in Chrome or Edge in kiosk mode:

```bash
chrome --kiosk --autoplay-policy=no-user-gesture-required "file:///C:/path/to/kiosk/index.html?kiosk"
```

Edge: replace `chrome` with `msedge`. The `?kiosk` flag hides the mouse pointer on the booth screen; leave it off when previewing on a laptop. The page scales itself to any screen and letterboxes on the brand green, so it also previews fine on a laptop. For a quick local preview without kiosk mode:

```bash
python -m http.server 8787 --directory kiosk
```

Then open http://localhost:8787.

## Flow

1. Attract screen: the eleven tools a DMO runs today, drifting on the green. Tap anywhere.
2. Directory, Events, People, Broadcasts, Tripper: each chapter pulls its tools off the desk and shows the real interface.
3. The rest: Widgets, Lists & analytics, Member portal, Storefront.
4. Watch it work: the Supademo walkthrough (muted, tap to play or pause).
5. TIAO: the Summit host already runs on Whereabouts; the Ontario Tourism Database connection.
6. Demo: QR code, contact, award, results, client logos.

Controls: Next and Back buttons, the chapter rail at the foot, swipe left or right, keyboard arrows (Home or Esc returns to the start). After 60 seconds without a touch the kiosk asks "Still there?" and returns to the attract screen 15 seconds later. The timer pauses while the video is playing.

## Change things

- **QR destination.** The QR currently points to https://whereabouts.tech/. To point it at a booking page:

  ```bash
  pip install segno
  python kiosk/tools/make-qr.py https://whereabouts.tech/your-booking-link
  ```

  Then update the URL text in `index.html` (search for `qr-url`).

- **Idle timing.** `IDLE_WARN_MS` and `IDLE_RESET_MS` at the top of `app.js`.
- **Copy.** All chapter copy lives in `index.html`. Claims are taken from the June 2026 brochure and the September 2026 Attractions Ontario proposal; keep "coming soon" features out unless they ship.
- **Images.** `tools/prepare-assets.py` copies and resizes everything from `__TTC Assets` into `assets/`, recolours the grey client logos white, and embeds each file's source path as provenance. Re-run it after replacing a source file.
- **Tools on the desk.** The `TOOLS` list at the top of `app.js`: label, short tray label, the chapter that removes it, and its position on the attract screen.

## Files

- `index.html`, `styles.css`, `app.js`: the kiosk.
- `assets/brand`: wordmark, icon, the swept-curve shape (SVG). `assets/fonts`: Outfit (OFL).
- `assets/shots`, `assets/proof`, `assets/logos`: product screenshots, TIAO and award proof, client logos.
- `assets/video/whereabouts-demo.mp4`: the 3:04 Supademo walkthrough (26 MB).
- `assets/qr-demo.svg`: the QR code.
- `tools/`: asset preparation and QR scripts.
