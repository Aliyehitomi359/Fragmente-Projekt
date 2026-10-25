# Fragmente-Projekt：项目全貌、功能细节与进度

更新日期：2026-10-25，Europe/London。

本文结合当前代码和已确定的产品讨论整理，供继续开发、交接和设计决策使用。区分“代码已实现”“已做局部验证”“只有预览”“尚未实现”；不把构建成功等同于所有用户流程已验收。

## 1. 产品目标

把截图、扫描页、电子书和日常文字收集成可以整理、搜索、重新组合的纸片，最终创作拼贴诗。

主要流程：

```text
收集原图 Sources
  → Workbench 框选保存 Fragments
  → 自动 OCR / 手动修正 / 搜索 / Boxes
  → Inspiration Table 寻找组合
  → Collage Canvas 创作
  → 自动保存编辑记录 / 归档 / 导出图片 / 备份
```

也支持把已经裁好的图片直接作为 Fragments 导入。

产品约束：本地优先、不设登录、不建后端、不使用云端保存个人素材。最终通过 GitHub 下载桌面安装包。英文软件界面稳定后再做中文界面；仓库文档已经有中英双语。

## 2. 当前交付形态

| 形态 | 位置/入口 | 状态 |
| --- | --- | --- |
| Vite 网页 | http://localhost:5175/ | 已实现，使用浏览器自己的 IndexedDB |
| Electron 开发预览 | `npm run desktop:dev` | 已实现，UI 热更新、Electron 文件变化重启 |
| Mac 安装版预览 | `release/Fragmente-Projekt-0.0.0-arm64.dmg` | 已生成，Apple Silicon、未签名 |
| Mac ZIP | `release/Fragmente-Projekt-0.0.0-arm64-mac.zip` | 已生成 |
| Windows 安装包 | `npm run package:win` / Actions | 已配置，尚未完成对应平台验收 |
| UI 风格研究 | http://localhost:5175/design-preview.html | 独立示例页，不连接真实资料库 |

项目目录：`/Users/aliye/Documents/Fragmente-Projekt`。

桌面开发启动入口：`/Users/aliye/Desktop/Fragmente-Projekt Dev.command`。它是启动脚本，不是独立安装包，依赖项目目录和本机 Node/npm。双击会打开 Terminal。

桌面预览窗口标题：`Fragmente-Projekt · Development`。

注意：本地安装包不会自动包含后续源码更新。当前 DMG 不能视为最新开发预览的完整副本，也尚未确认发布到了 GitHub Releases。

## 3. 技术组成和文件职责

- React、TypeScript、Vite：界面、组件与开发热更新。
- `idb` / IndexedDB：Source、Fragment、Box、Canvas 数据与 Blob。
- `tesseract.js`：浏览器/桌面渲染进程内 OCR。
- `html-to-image`：画布导出。
- Electron：窗口、首次资料库选择、本地文件访问与 IPC。
- electron-builder：Mac DMG/ZIP 和 Windows NSIS 打包。

| 文件 | 职责 |
| --- | --- |
| `src/App.tsx` | 主要产品界面、裁剪、OCR、Boxes、灵感桌、Canvas、备份 |
| `src/App.css` | 当前应用界面样式 |
| `src/db.ts` | IndexedDB、默认数据、保存与删除、分类转换 |
| `src/types.ts` | 主要数据类型 |
| `src/imageUtils.ts` | Blob、裁剪、下载等工具 |
| `src/FolderImports.tsx` | 桌面文件夹扫描、导入、待分类对话框与预览 |
| `src/vite-env.d.ts` | 桌面桥接接口类型 |
| `electron/main.cjs` | 窗口、用户资料库、开发模式、IPC 授权 |
| `electron/preload.cjs` | 向界面暴露有限的桌面接口 |
| `electron/library.cjs` | 图片扫描、分类移动、文件命名、导入记录 |
| `electron/library.test.cjs` | 本地文件导入、转换、命名等测试 |
| `scripts/desktop-dev.mjs` | 启动/复用 Vite，监测 Electron 文件并重启 |
| `public/design-preview.html` | 四套隔离的 UI 风格 Demo |
| `public/font-preview.html` | 早期字体选择预览 |
| `.github/workflows/desktop.yml` | Mac/Windows 打包及上传 Actions 构建产物 |

主要逻辑目前集中在 App.tsx；未来可以按 Source、Fragment、Canvas、OCR、备份拆分，但避免在设计确认前进行无关大重构。

## 4. 三栏布局和工作模式

- 左栏：Upload sources、Local Library、Sources、Archived canvases、来源搜索与分页。
- 中间：Fragment Workbench、Inspiration Table、Collage Canvas，以及最近打开作品的快捷标签。
- 右栏：Upload fragments、Boxes、搜索、Fragment 列表，或灵感 Session。
- 左右侧栏独立滚动，避免素材列表带动整个工作区域。
- 右上角汉堡菜单用于资料库操作，与单个素材的三点菜单区分。

## 5. Sources：收集、来源和管理

已实现：

- 点击或拖放上传图片；同名上传提供确认提醒。
- Source 列表预览、选择、双击进入工作台。
- 自动 OCR，识别结果生成简短显示名；用户手动命名后，不应由自动命名覆盖。
- 收藏，以及 All sources / Favorite sources 筛选。
- 三点菜单常驻，收藏按钮按交互状态出现。
- 修改名称，填写 book、author、chapter/page、context/感想等信息。
- 查看精确到秒的上传时间。
- 删除放在三点菜单的来源信息下面。
- 删除 Source 保留已裁出的 Fragment，但移除它们对已删除 Source 的链接。
- 来源搜索覆盖名称、OCR、作者、书名及备注。
- Sources 每页 8 项，支持上一页、下一页和输入页码。

同名检查是名称层面的提醒，并非对所有软件内上传都进行统一内容去重。

## 6. Fragment Workbench：框选与缩放

已实现：

- 鼠标十字光标、拖出矩形选区、移动已有选区。
- 选区附近的 `Save to box` / `Cancel`，不在右上角重复放保存按钮。
- 保存后生成独立 Fragment Blob，进入 Default Box。
- 原图不破坏，已裁区域用独立 CutRegion 遮罩标识。
- 选区高度重叠时提醒，避免重复收集。
- 删除 Fragment 会清除对应原图上的裁剪标记。
- Mac 触控板捏合通过 Ctrl+wheel 缩放 Viewer，范围 25%–600%，相对默认适配尺寸。
- 普通双指滑动保留滚动行为；选区按原图坐标计算。
- 顶部百分比按钮可重置；首次缩放显示 8 秒重置提示，localStorage 记录已看过。

缩放已通过编译检查；真实触控板手感、连续缩放与边缘框选还需持续验证。

## 7. Fragments 和 Boxes

- 支持直接上传裁好的图片，以及从 Sources 裁剪得到图片。
- 自动 OCR；结果错误或失败后允许直接修改输入文字。
- 输入框单行、紧凑，失焦保存，兼顾中文输入法 composition。
- 不再提供顶层手动重跑 OCR 菜单。
- 收藏位于 OCR 文字同一行；三点菜单管理 box 归属和删除。
- All、Favorites、Default、New box；创建表单按需展开。
- 每个 Fragment 只属于一个普通 Box；Favorites 是额外标记，可与普通 Box 同时存在。
- Fragments 每页 8 项；较多结果时提供底部翻页。
- 搜索不仅匹配 Fragment OCR，也匹配关联 Source 的名称、OCR、作者、书名、备注及 Box 名。
- 左右搜索都标准化大小写、空白和一部分简繁字形。

简繁转换目前使用项目内手工映射，并非完整 OpenCC，不能保证所有生僻字、异体字、上下文转换都覆盖。读音相同的不同汉字不是默认搜索等价字。

## 8. OCR 细节

当前配置：`chi_sim + chi_tra + eng + deu`，LSTM 模式。

- Source 使用 AUTO 分段，Fragment 使用 SINGLE_LINE。
- 简繁中文、英文、德语共用识别配置；未提供用户语言选择框。
- OCR 状态：idle、processing、done、error。
- 规范化识别文字中的空白与部分繁简映射。
- Source 显示名取识别文字前约 20 个字符；Fragment 文字可编辑。
- 文件名同步使用识别或纠正后的文字，并进行文件名安全处理。
- 首次使用依赖下载模型；尚未完全打包离线模型、字体和所有 OCR 运行资源。

不承诺通用最高准确率。中文生僻字、多行 Fragment、复杂底图、中英德混排仍可能识别错误。现有 worker 按次创建，还没有全局队列/并发资源上限。

## 9. Source / Fragment 跨栏转换

- 拖 Source 到右栏：转成直接上传类 Fragment，进入 Default Box，提示 `Moved to Fragments.`。
- 拖 Fragment 到左栏：转成 Source，提示 `Moved to Sources.`。
- 分类成功提示在中间工作区顶部，绿色，可关闭。
- 保存图片 Blob、OCR、收藏等基础属性；Source 专有书籍备注并未设计为完整的双向无损转换字段。
- Fragment 已用于画布时，转换前提示会移除这些画布摆放。
- Source 已裁出碎片时，提示原有 Fragment 保留，但原 Source 链接和裁剪痕迹移除。
- 数据库转换使用多表事务；本地文件移动也有同步调用。

文件系统与 IndexedDB 是两套存储，目前还没有跨两者的统一事务或完整失败恢复机制。

## 10. Inspiration Table

- 第三个独立工作模式，所有 Fragment 轻微旋转、随机散落，允许遮盖。
- 可拨动纸片，也可重新 Scatter。
- 右侧为 Inspiration session 1 临时集合。
- 拖入右侧后，桌面隐藏对应 Fragment；移除后回到桌面。
- 右侧整个 Session 面板接受拖入，而非只有虚线框。
- 拖动纸片临时提升层级，越过桌面边界显示。
- 全局 pointermove / pointerup / pointercancel 收尾，修正触控板松手后黏住的问题。
- 首次引导：Get some random ideas，解释右侧临时集合可保存成新 Box。
- 临时集合不改变普通 Box 归属；保存成 Box 才会移动归属。
- 可以切换 Canvas 后再返回继续收集。

限制：Session 成员、纸片手动位置及工作模式仍主要在 React 内存中，关闭/刷新不能保证恢复；只有保存为正式 Box 的集合进入数据库。

## 11. Collage Canvas

- 多个独立画布，支持新建和打开已有作品。
- 预设：4:3、3:4、正方形、横/竖 A4 比例、9:16、16:9；采用明确像素尺寸。
- A4 预设是页面比例和像素尺寸，不代表已提供 300 DPI 实体印刷设置。
- 拖入 Fragment 创建 placement 引用，资料库原素材保留。
- 移动、缩放、删除；选中后可用 Backspace/Delete 删除摆放。
- 二次 Crop，提供 OK / Revert；操作按钮放在纸片外下方，减少误触。
- 裁剪后按裁后尺寸展示，不把小区域撑回原尺寸。
- 背景纯色、图片上传、按比例铺满或原尺寸居中。
- 背景可移动、四角调整；编辑背景时不移动前景 Fragment，也不显示不可用的 Crop/Delete。
- 背景编辑状态有绿色文字，Done 后将自定义与移除选项收回 Background 菜单。
- PNG、JPG、WebP 导出菜单，使用画布设定像素和 pixelRatio 1。
- 归档与取消归档，取消前提示；导出图片与归档是两个独立行为。
- 左侧只列已归档作品；中间入口列所有草稿和已归档作品。
- 名称可直接编辑，失焦保存；输入框随名称长度变化并限制最大宽度。
- 当前打开作品在顶部有快捷 Tab，名字和关闭叉号在同一框内。
- 关闭 Tab 不删除作品；正在编辑时返回 Canvas 入口。

限制：只维护一个当前工作作品的快捷入口，未实现完整的多作品 Tab 管理/重启恢复；Canvases 文件夹尚未自动生成归档图片。

## 12. 本地 Library 的行为

### 正式桌面版

首次选择父目录后创建：

```text
Fragmente-Projekt Library/
├── Sources/
├── Fragments/
├── Canvases/
├── .app-data/imports.json
├── .fragmente-library.json
└── browser-data/
```

- Sources / Fragments 是图片文件。
- Canvases 目前预留，不能根据文件夹为空推断作品丢失。
- imports.json 保存文件导入的内容哈希记录。
- browser-data 中有 IndexedDB、Blob、缓存等，编辑数据库仍依赖它；不能删除，也不能只复制图片就认为完成完整备份。
- 资料库位置记录在 Electron userData 下的 library-location.json。
- 已绑定路径不可用时提示，不默默创建替代空资料库。

### 开发预览版

- 图片：桌面的 `Fragmente-Projekt Preview Library`。
- 编辑数据：独立 `Fragmente-Projekt-Development` 应用配置目录中的 browser-data，macOS 通常位于 `~/Library/Application Support/` 下。
- 正式版、开发版、网页浏览器是不同的数据环境，不会自动共享素材。
- 开发版完整迁移不能只复制桌面测试图片目录；仍需完整备份/导入或同时处理对应应用配置。

### 外部放图与自动同步

1. 图片放进 Library 根目录，留在原处等待分类，不创建 Inbox。
2. 软件显示 “You have N unclassified images. Is this a source or fragment?”。
3. 文件名悬停、聚焦或点击可以查看预览；可以关闭后重新 Review。
4. 选择类型后移入对应子文件夹并写数据库。
5. 放入 Sources / Fragments 的图片自动按该目录类型导入。
6. 约每三秒扫描；连续扫描大小/修改时间稳定后才开始处理。
7. 软件未打开时新增的图片，下一次启动扫描。
8. 内容哈希记录降低重复导入；尚未使用系统 fs.watch 递归监视，目录也不是任意层级递归导入。
9. 软件内上传复制图片进 Library，保留用户原位置文件。
10. 裁剪图片也写入 Fragments。
11. OCR / 手动纠正后的文件名最多截取约 60 字符，去掉不允许字符，追加稳定三位字母数字标识；碰撞时尝试其他标识。
12. 启动同步已有数据库素材的本地文件名。

外部删除图片不会自动删除数据库作品；未实现完整“文件缺失”修复界面。外部重命名文件不会自动修改软件显示名称。

## 13. Backup / Restore

桌面菜单当前为：

- Open Library Folder：打开当前运行环境的图片 Library。
- Back Up Library：选择写入备份的位置。
- Restore Library：选择已有备份读取。

后两个按钮的解释使用 hover title，不占据菜单布局。

备份包含 manifest.json，以及小写 sources、fragments、canvases 子目录；这和运行资料库的大写目录是不同协议。编辑数据在 manifest 中，canvases 目录主要保存背景图。

Restore 按 ID 更新记录并保留其他记录，是合并导入，不是删除当前资料再回滚。备份只在显式执行时更新，不是每次编辑都写入上次导出的备份目录。

目前尚无自动历史备份、保存完成统一状态或一键恢复点。目录选择使用 File System Access API；Electron 具体环境中的支持、授权、成功和取消流程仍需实际验收，不能把“菜单存在”视为全流程已验证。

网页保留导出/导入；beforeunload 仍有提醒逻辑，Electron 对关闭事件另行处理。退出前没有保证等待所有异步写入完成的完整机制。

## 14. 桌面开发预览与安装更新

```sh
cd /Users/aliye/Documents/Fragmente-Projekt
npm ci
npm run desktop:dev
```

预览启动器复用已有的 5175 Vite，或创建新服务；检查已有端口的页面标记，不能保证绝对识别所有其他项目。不会自动换端口。

React/CSS 变更热更新，electron 目录文件变更触发重启。重启可能清掉尚未持久化的临时 Session。

正式应用运行的是已打包 dist，不会因为修改项目自动变更；需要重新安装生成的 DMG。旧应用 Command+Q 退出，再拖入 Applications 替换。资料库保留。

目前版本号仍为 0.0.0。已识别需要正式版本号/About、版本与构建标识，避免同名图标造成混淆；尚未实现在线自动更新。

## 15. UI 设计探索及用户偏好

设计预览是独立 public/design-preview.html，支持直接打开 HTML 或通过 Vite 访问。使用示例生成的书页/文字图片；有部分模式、收藏、搜索、拖放演示，不代表真实产品完整功能。

四个方向：

1. Print Workshop：Special Elite 字标、等宽控件字、红色裁剪、纸张和工作垫。
2. Reading Room：书刊式衬线、单列素材、墨绿莓红。
3. Desktop Lab：旧式桌面工具、紧凑窗口、细立体边、蓝色与绿灰。
4. Tactile Workshop：工坊字体与红黑纸色，加实验室的薄立体按钮。

用户目前确认或倾向：

- 喜欢印刷工坊字体，字标为 Special Elite。
- 喜欢米白、红色和黑色。
- 希望按钮有实验室式立体感，但厚度要薄；已改成 1px 阴影/细高光。
- 不满意大面积偏黄豆绿，试过雾灰绿仍认为整体有“AI 感”。
- 希望研究该打字机字体的实际用色，而非继续仅靠降低绿色饱和度。
- 所有新风格尚未应用到真实 App.css 的完整设计；真实应用仍是功能优先界面。

当前第四套试验的代表色：墨黑 #252B28，红 #CF402E，纸底 #F3F1E7，侧栏 #E6E8E1，标题/Tab #CCD3CC，工作垫 #BAC5BD。这组尚未获得最终认可。

下一轮建议先比较以纸白、墨黑和少量红为基础、无大面积绿色的版本。该建议是设计判断，不是已确定方案。

## 16. 标题字体用色研究（本次）

已确认：标题字体为 Special Elite，官方说明以 Smith Corona Special Elite NR6 和 Remington Noiseless 打字机为原型。没有字体规定的官方配色。

本次未找到足够可信的 Special Elite 使用案例统计，不能声称“大家通常配绿色”或给出使用频率。搜到的字体聚合页还存在作者/授权/单词宽度分类互相矛盾的描述，因此不据此作风格结论。

可核实的同类参考：Melanie Porras 的 FF Trixie 字体样本项目，设计师明确解释红、黑、白的选择。FF Trixie 与 Special Elite 是不同字体，只能作为相近打字机视觉语言的参照。

基于资料与本项目的建议用色（不是历史标准色）：

| 方向 | 底色 | 文字 | 点色 |
| --- | --- | --- | --- |
| 打字稿/黑红刊物 | #F5F2E9 | #282724 | #B83C30 |
| 清晰编辑工作台 | #F4F3EF | #252525 | #C44436 |
| 旧档案/藏书 | #EEE8DC | #342F29 | #8C3935 |

避免把打字机字体、等宽字、编号、标章、纸纹、大面积彩色分区同时铺满。标题已经有油墨质感，周围可以更朴素。把字体留给字标或少量标题，功能文字优先清晰易读。

研究来源：

- [Google Fonts 官方字体说明](https://raw.githubusercontent.com/google/fonts/main/apache/specialelite/DESCRIPTION.en_us.html)
- [Melanie Porras：Una Declaración Sobre FF Trixie](https://www.behance.net/gallery/200103351/Una-Declaracion-Sobre-FF-Trixie-Espcimen-Tipografico)；本次搜索索引可读，直接抓取受限。
- [John August：Introducing Courier Prime](https://johnaugust.com/2013/introducing-courier-prime)，用于理解打字稿/编剧字体语境，不作为 Special Elite 配色统计。
- [MoMA：Dada Word Play](https://www.moma.org/momaorg/shared/flattened_pages/moma_learning/themes/dada/word-play/)
- [V&A：William Morris 的书籍设计](https://www.vam.ac.uk/articles/william-morris-text)
- [Dafi Kühne / babyinktwice](https://www.babyinktwice.ch/)
- [Issue Press](https://issue.press/)
- [Hatch Show Print](https://www.hatchshowprint.com/)

## 17. 已确定但尚未实现的截图与悬浮人物

1. 悬停悬浮球一小段时间，或单击。
2. 展开 Capture fragment / Capture screen 两个选项。
3. 用户选择后隐藏悬浮球，开始局部框选或整屏截图。
4. 截图预览提供 Confirm、Retake、Cancel。
5. 确认后写入软件资料库与本地图片文件，再运行 OCR。
6. 只有写入成功才提示已经保存在软件和本地目录。
7. 主窗口最小化后悬浮入口仍可使用。

需处理：系统屏幕录制权限、多显示器/Retina 坐标、不把悬浮球截进去、受保护窗口、取消与写入失败。当前没有实现截图、全局快捷键、悬浮窗口或互动人物。

## 18. 数据类型

- SourcePage：id、name、imageBlob、createdAt、cutRegions，以及 originalFileName、nameEdited、来源备注、isFavorite、ocrText、ocrStatus。
- CutRegion：id、sourcePageId、x/y/width/height、fragmentId、createdAt。
- Fragment：id、imageBlob、createdAt/updatedAt、sourceType、可选 sourcePageId/cutRegionId、ocrText、ocrStatus、boxId、isFavorite。
- FragmentBox：id、name、createdAt。
- CollageCanvas：id、name、createdAt/updatedAt、可选 archivedAt、width/height、backgroundColor、可选背景 Blob/位置、placements。
- CanvasFragmentPlacement：id、canvasId、fragmentId、x/y/width/height、可选 rotation 和 crop。

数据库名称 poem-collage-db，版本 1；对象仓库 sources、fragments、boxes、canvases。placements 和 cutRegions 当前分别嵌在 Canvas 和 Source 内。

## 19. GitHub、文档与验证状态

- 仓库：https://github.com/Aliyehitomi359/Fragmente-Projekt ，按此前创建操作为私有仓库。
- 分支 main；最近本地提交 85f74e1，主题是开发预览、文件夹同步与双语文档，此前已成功推送。
- 当前源码仍有未提交变更：App.tsx、App.css；design-preview.html 和桌面启动脚本源文件未跟踪。本文件也是新增。不能把这些设计与近期交互改动说成已经推送。
- README.md / README.zh-CN.md、DESKTOP-ROADMAP.md / DESKTOP-ROADMAP.zh-CN.md 已双语。
- Actions 在手动触发或 v* tag 时构建两平台产物，不自动建立 GitHub Release。
- node_modules、dist、release、个人素材和 outputs 均未作为源码提交。

此前已多次完成：npm run build、git diff --check、node --test electron/library.test.cjs。单个测试用例内覆盖扫描、根目录分类、重启去重、文件转换、中文安全文件名、纠正改名、同名不覆盖和路径校验等。

设计页曾在浏览器确认四个方向与画布效果；此验证不能代替真实资料库 UI 回归、完整安装/重启/恢复测试，也没有覆盖所有 Mac/Windows 系统差异。

## 20. 接下来建议的顺序

1. 确定视觉方向，优先用真实素材密度验收，而不只看示例截图。
2. 完善保存状态、错误回报、数据库与文件之间的恢复机制。
3. 测试正式版与开发版的关闭重开、异常退出和备份恢复。
4. 持久化 Inspiration Session、桌面位置、当前工作模式和快捷 Canvas。
5. 归档作品渲染到 Canvases，明确草稿与完成图的更新规则。
6. 将目录选择和备份操作完善为可验证的桌面流程；再考虑收起手动备份入口。
7. 实现截图确认流程，再加入悬浮球与人物。
8. OCR/字体离线资源、版本标识、签名、Windows 测试与 GitHub Release。
9. 英文界面稳定后开发中文界面。

继续开发时优先核对代码与当前运行窗口，不依赖旧安装包或过去对话中的“已完成”口头描述。
