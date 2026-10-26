# Floating Capture / 悬浮截图

## Current implementation

- Desktop only. The browser app does not create a desktop floating window.
- A small wine-red `f.` button stays above other windows, including when the main app is hidden or minimized.
- Click, or hover for 550 ms, to open Capture fragment / Capture full screen.
- Drag the button to reposition it. Open app restores the main window; Quit exits both windows.
- Capture uses a single screenshot of the display containing the pointer. It does not continuously record, capture audio, or span multiple displays.
- Fragment mode lets the user draw or redraw a rectangle on the frozen screen image. Full-screen mode previews the entire selected display.
- Save confirms the selection, Retake captures again, and Cancel / Escape discards it. Nothing is added before Save.
- Full-screen captures become Sources; rectangular captures become Fragments in the default box.
- The app acknowledges success only after the IndexedDB record and local Library image write have both completed. OCR runs afterward.
- If writing fails, the preview stays open and the user can retry. A stable capture ID prevents duplicate records on retry.
- Closing the main window hides it, rather than quitting. Use Quit on the floating button or the application menu to exit.

## Permissions and validation

On macOS, Screen Recording permission is required. If denied, the floating button shows instructions and takes no screenshot. Allow the development app or its responsible launching application under System Settings > Privacy & Security > Screen Recording, then restart the preview. The app never changes this permission itself.

Verified: real macOS floating window, menu expansion, and denied-permission feedback. Actual screen selection/save cannot be fully validated on this machine until permission is granted. Mocked controller tests cover confirmation-before-save, successful acknowledgment, failure/retry, cancellation and sender validation. Geometry tests cover Retina, fractional scaling, bounds and invalid selections. Windows native behavior has not been manually verified.

Run tests: `node --test electron/capture.test.cjs electron/capture-geometry.test.cjs electron/library.test.cjs`.

## 中文

桌面开发版新增酒红色 `f.` 悬浮球。可拖动，点击或悬停展开截纸条/截全屏；支持确认、重截与取消。全屏进入 Sources，纸条进入默认 Box，完成本地数据库和图片文件保存后才提示成功，再运行 OCR。

当前截取鼠标所在的一块显示器，不是所有显示器拼接，也不是持续录屏。关闭主窗口后仍可通过悬浮球使用或重新打开；要完全退出请点 Quit。

Mac 实机已确认悬浮窗口和菜单正常，但当前屏幕录制权限被拒绝，因此真实截图到保存的全流程仍待用户授权后验收。未更新安装包；本次功能在开发预览中。
