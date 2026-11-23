# Field Text

**Field Text** is an offline-first amateur-radio messaging web-app prototype.

## Current prototype (v0.3)

- Responsive mobile-friendly interface
- Passwordless callsign login, remembered locally
- Log out / change callsign
- Callsign setting saved locally
- Local demo inbox and conversations
- Delete individual messages or entire conversations with confirmation
- Compose/send simulated messages
- Quick message presets and custom presets
- Frequency Guide for HF, VHF, UHF, and SHF
- Frequency search and copy-to-clipboard
- Local browser storage
- Installable web-app manifest

## Important limitation

**No radio transmission or reception is implemented.** Message sending is currently a local simulation. The frequency guide is a quick reference only, not an endorsement or allocation of Field Text operating frequencies. Always check current rules, local band plans, license privileges, emission restrictions, and listen before transmitting.

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
