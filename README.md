# Fragmente-Projekt

Local-first image fragments, OCR, inspiration table and poem collage workspace.

## Development
`npm install` then `npm run dev`. Open http://localhost:5175/ (strict port).

## Desktop preview
`npm run desktop` builds the React app and opens Electron. First launch asks where to create the local library. Keep that directory intact. Import an exported web library to migrate existing browser work.

## Installers
`npm run package:mac` produces Mac DMG/ZIP in `release/` on macOS.
`npm run package:win` produces an NSIS installer on Windows.
Builds currently have no distribution signing identity. These are development previews, not signed public releases.

See DESKTOP-ROADMAP.md for implemented storage boundaries and planned screenshot/companion interactions.
