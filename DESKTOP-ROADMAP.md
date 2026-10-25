# Desktop roadmap

[English](DESKTOP-ROADMAP.md) | [简体中文](DESKTOP-ROADMAP.zh-CN.md)

## Initial desktop build
- Electron hosts the existing English React app using packaged local assets.
- First launch asks for a parent directory and creates `Fragmente-Projekt Library`.
- Chromium session data, including IndexedDB image blobs and metadata, lives in its `browser-data` directory.
- Keep this folder intact. Browser data is not an interchangeable image-folder backup; use Export library for portable backups.
- Existing web data must be exported in the browser and imported into the desktop app.
- Sources and Fragments folders accept external images. Root images stay in place until classified in the app. A scan every three seconds waits for a stable file before importing; confirmed content hashes persist across restarts.
- App uploads and crops write images to Sources/Fragments. Desktop startup synchronizes existing records. OCR/corrected text supplies filenames with three-character identifiers, with collision handling.
- Cross-panel dragging changes classification and moves image files; affected canvas/source references require confirmation.
- Live desktop development preview uses an independent Desktop library and application profile; UI edits hot-reload and Electron edits restart.
- `.app-data/imports.json` tracks folder imports. Keep existing `browser-data` intact; it still holds OCR, boxes and editing records.
- Canvases is reserved for finished artwork; automatic rendered archive output, explicit save status, and inspiration-session persistence remain future work.

## Capture interaction (agreed)
1. Hover over the floating companion for a short delay, or click it.
2. Show two choices: Capture fragment / Capture screen.
3. Hide companion and start capture. Fragment uses a rectangular selection; screen captures a chosen display.
4. Show preview with Confirm, Retake and Cancel.
5. Confirm writes the capture to the library, runs OCR and acknowledges both app and local-folder saving only after successful writes.
6. Main-window minimization leaves the companion available. Respect screen-recording permissions and multiple displays.

## Release stages
- Validate packaged Mac build and restart persistence on real data.
- Add native file persistence, recovery, and complete working-session restore.
- Add capture, confirmation, and floating companion.
- Stabilize English UI, then add Chinese localization.
- Sign/notarize Mac builds and sign Windows builds before public distribution.
- Publish installers through GitHub Releases. No repository or release is published automatically by local packaging.
