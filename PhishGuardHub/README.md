# PhishGuardHub
PhishGuard Hub + PhishShield extension — demo anti-phishing suite configured for Netlify.

## Structure
- `extension/` - Browser extension (PhishShield)
- `website/` - PhishGuard Hub (deploy this folder to Netlify)
- `docs/` - optional notes

## Quick start
1. Unzip.
2. Load extension: Chrome -> chrome://extensions -> Developer mode -> Load unpacked -> select `extension/`.
3. Deploy `website/` to Netlify.

Replace API placeholders in `extension/scripts/background.js` with your proxy endpoints or API keys.
