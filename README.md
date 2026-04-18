# Daily Quiz
Hyper-casual quiz game for Facebook Instant Games, Telegram Mini App, and web.

## Stack
Vite + vanilla JavaScript, DOM-based (no canvas engine), multi-platform adapter pattern, Tone.js sounds, i18n EN/UA/NO.

## Structure
- /src/game — core quiz logic
- /src/platform — FB / TG / web adapters
- /src/i18n — translations
- /src/ui — UI components

## Development
npm install
npm run dev

## Build
npm run build

## Status
Stage 4 complete. Next: Facebook Instant Games SDK (Stage 5).
