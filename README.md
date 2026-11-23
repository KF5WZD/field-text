# Field Text

**Field Text** is an offline-first amateur-radio messaging web-app prototype.

## Current prototype (v0.3)

- Responsive mobile-friendly interface
- Passwordless callsign login, remembered locally
- Log out / change callsign
- Callsign setting saved locally
- Local demo inbox and conversations
- Delete individual messages or entire conversations with confirmation
- Compose/send messages with a real browser-generated audio waveform (experimental TX)
- Quick message presets and custom presets
- Frequency Guide for HF, VHF, UHF, and SHF
- Frequency search and copy-to-clipboard
- Local browser storage
- Experimental 2-FSK audio transmitter: 1200/1800 Hz, 100 baud, preamble/sync, framed UTF-8 JSON payload, CRC-16
- Audio-level control and tone/test-packet buttons
- Installable web-app manifest

## Important limitation

**Audio transmission is experimental; receive decoding is not implemented.** The app generates and plays a 2-FSK audio packet through the device audio output. It does not yet decode received packets, confirm delivery, or control radio PTT. Message history is stored locally, not remotely delivered. The frequency guide is a quick reference only, not an endorsement or allocation of Field Text operating frequencies. Always check current rules, local band plans, license privileges, emission restrictions, and listen before transmitting.

## Run locally

You can open `index.html` directly in a modern browser. For best results (and clipboard/PWA features), serve it over localhost or HTTPS.

### Quick local server

If Python is installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a new GitHub repository, e.g. `field-text`.
2. Upload all files in this project (keep them at the repository root).
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. Wait for the Pages deployment. The site URL will be shown on the Pages settings screen.

## Files

- `index.html` — app shell
- `styles.css` — UI styling
- `app.js` — app logic and reference data
- `manifest.webmanifest` — installable app metadata
- `icon.svg` — app icon


## Experimental audio TX test

1. Deploy on HTTPS (GitHub Pages is suitable) and open Field Text in a modern browser.
2. Go to **Radio → Radio Console**.
3. Set the audio level low and test the 1200 Hz and 1800 Hz tones with headphones or a disconnected radio audio input.
4. Try **Transmit Test Packet** and listen for the data burst.
5. For radio testing, use a dummy load or shielded/local setup first. Verify the radio mode, frequency, band privileges and emission rules; listen first and use manual PTT. Do not enable VOX until audio levels and TX timing are verified.

The prototype modem is Field Text-specific and is **not Rattlegram-compatible**. Its bit framing and modulation parameters may change as we develop the receiver and improve robustness.
