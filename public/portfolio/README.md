# Fragmente-Projekt: From Practice to Product

Admission/recruiter-facing project story rebuilt around real product evidence.

- English: http://localhost:5175/portfolio/index.html
- Chinese: http://localhost:5175/portfolio/zh.html
- English sample library: http://localhost:5175/?demo=1&lang=en
- Chinese sample library: http://localhost:5175/?demo=1&lang=zh

`story.js` contains corresponding bilingual copy and a keyboard-accessible screenshot gallery. Active screenshots are `real-*-en.png` and `real-*-zh.png`, showing the full React app with the two user-supplied Dubliners / The Dead screenshots. Fragment images are actual crops of those source PNGs, not newly typeset text. `capture-menu.png` is a real desktop development screenshot. No video is included. The previous simulator (`demo.js`) and unsuffixed screenshots are no longer loaded.

Each language uses its own `fragmente-dubliners-demo-v4-{en|zh}` database, separate from the regular `poem-collage-db` and the previous demo. Each seeds one source, six fragments, boxes and one archived composition once. Previous databases are not erased. Example OCR/search text is prefilled, not a claim that OCR ran during the demonstration. Edits persist across refresh. Actual OCR can require a language-model download. Desktop-only capture and file synchronization are not exposed in the browser demo.

Source attribution: James Joyce, Dubliners, The Dead. The Chinese screenshot's translator/edition is not identified. Confirm translation permissions before public publication. No public deployment was performed.

Both desktop sections embed user-supplied recordings: `desktop-capture-zh.mp4` in Chinese and `desktop-capture-en.mp4` in English. Native playback, seeking and fullscreen controls and a download fallback are provided. Videos do not autoplay. They are stored with the site without an external video host. The simulated animation is no longer loaded. Review visible browser tabs and other personal details before public deployment.

Run `npm run dev` at the project root (strict port 5175). To publish the working demo, deploy the full Vite build, not only this folder: app links point to `/?demo=1`. This has not been publicly deployed. Direct file opening is not the recommended workflow.

Claims are intentionally bounded: personal/peer creative experience, product and visual direction, AI-assisted implementation, working MVP. No unverified adoption numbers, hours or production-readiness claims.
