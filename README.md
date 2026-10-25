# Fragmente-Projekt

[English](README.md) | [简体中文](README.zh-CN.md)

A local-first workspace for collecting text from images and composing collage poems. Built with React, TypeScript, Vite, IndexedDB and Electron. No account or backend is required. The application interface is currently English; Chinese localization is planned.

## Features

- Upload sources, select rectangular regions and save cropped fragments without altering the original image.
- Automatically recognize simplified/traditional Chinese, English and German with Tesseract.js; edit recognized fragment text directly.
- Organize fragments into boxes and favorites. Search text and source book/author notes with simplified/traditional Chinese matching.
- Scatter fragments on the Inspiration Table and collect a temporary session, optionally saved as a box.
- Create multiple collage canvases, move/resize/crop fragments, customize backgrounds and export PNG/JPG/WebP.
- Monitor desktop library folders. Classify root images in a dialog with hover previews; images in Sources/Fragments import automatically.
- Drag between the source and fragment panels to change classification and move the local image accordingly.
- Name local images after OCR or corrected text, followed by a three-character identifier. Copy uploads into the library while keeping originals.
- Back up/restore portable libraries and open the active library folder from the menu.

## Development

Use a current Node.js LTS version and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:5175/. The port is strict: the server reports an error if occupied. Do not open index.html directly.

## Desktop preview
`npm run desktop:dev` opens the live development preview. React edits refresh automatically; Electron edits restart the app. It uses port 5175 and an independent `Fragmente-Projekt Preview Library` on your Desktop for image files; editing data uses the separate `Fragmente-Projekt-Development` application profile. It never uses your installed application's library. An existing Vite development server on 5175 is reused. Quit the preview with Cmd+Q or stop the terminal command.

`npm run desktop` builds the React app and opens Electron. First launch asks where to create the local library. Keep that directory intact. Import an exported web library to migrate existing browser work.

## Installers
`npm run package:mac` produces Mac DMG/ZIP in `release/` on macOS.
`npm run package:win` produces an NSIS installer on Windows.
Builds currently have no distribution signing identity. These are development previews, not signed public releases.

## Storage and limitations

Installed apps create Sources, Fragments, Canvases and .app-data inside the chosen library; browser-data still contains the editing database. Keep the entire library intact. Development preview uses a separate Desktop library and application profile as described above.

Sources/Fragments hold image files; Canvases is currently reserved, not automatically populated with finished exports. Existing images are synchronized when the desktop interface starts. Inspiration sessions and table layouts are not yet restored after closing. OCR initially downloads language models and is not yet fully bundled for offline use.

The folder scanner checks about every three seconds. Root images stay in place until classified. Restore reads an exported manifest.json backup and updates matching records; it is not a full rollback of the current library.

## Verification

```sh
npm run build
node --test electron/library.test.cjs
```

Mac/Windows installer workflows are available in GitHub Actions. Windows packaging and desktop interaction still need platform testing. Installers, personal images and library data are excluded from Git.

See [Desktop roadmap](DESKTOP-ROADMAP.md) / [桌面版路线图](DESKTOP-ROADMAP.zh-CN.md) for the planned capture and floating companion workflow.
