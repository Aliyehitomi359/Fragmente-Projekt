# Fragmente-Projekt

## 在线体验

**[打开中文 Demo](https://aliyehitomi359.github.io/Fragmente-Projekt/portfolio/zh.html)** · **[English Demo](https://aliyehitomi359.github.io/Fragmente-Projekt/)** · **[体验 App](https://aliyehitomi359.github.io/Fragmente-Projekt/?demo=1&lang=zh)**

[![Fragmente-Projekt 拼贴创作界面](public/portfolio/real-canvas-zh.png)](https://aliyehitomi359.github.io/Fragmente-Projekt/portfolio/zh.html)

包含真实桌面操作录屏、中英文项目介绍，以及独立示例素材库。无需安装或登录；系统级截图仍需桌面版。这是借助 AI 编程工具实现并持续迭代的 MVP。

## 移动素材库

桌面版右上角 Library settings 提供 Open Library Folder、当前路径和 Move Library...。选择桌面等目标父文件夹并确认后，安装版会重启，开发预览版需重新打开一次。软件在退出后复制整个素材库和编辑数据库，逐个文件校验 SHA-256，成功后再切换路径；旧文件夹保留为备份，之后只更新新库。目标同名文件夹已存在，或位置位于当前库内时不会覆盖。不要在 Finder 中直接拖走正在使用的库。

[English](README.md) | [简体中文](README.zh-CN.md)

本地优先的文字碎片收集与拼贴诗创作工具。使用 React、TypeScript、Vite、IndexedDB 和 Electron，无需账号或后端。目前软件界面为英文，中文版将在英文版稳定后制作。

## 功能

- 上传截图、扫描页和书页，框选文字保存为 Fragment，原图保持完整并显示裁剪痕迹。
- 自动识别简体中文、繁体中文、英文和德语，直接编辑 Fragment 的 OCR 文字。
- 使用 Boxes 和收藏整理素材；搜索文字、书名和作者等来源备注，支持简繁交叉搜索。
- Inspiration Table 随机散落纸片，可拖入临时 Session，再保存为正式 Box。
- 多画布拼贴，移动、缩放、二次裁剪纸片，自定义纯色或图片背景，导出 PNG、JPG、WebP。
- 桌面版监测本地文件夹：根目录图片通过带悬停预览的对话框分类；Sources / Fragments 图片自动导入。
- 在左右栏之间拖动图片转换分类，并移动对应本地文件。
- OCR 或手动修改文字后同步命名图片，末尾保留三位标识防止重名；上传图片复制进资料库，保留原文件。
- 菜单提供打开当前 Library、备份和恢复。

## 启动网页版

安装当前 Node.js LTS 和 npm，在项目目录执行：

```sh
npm ci
npm run dev
```

打开 http://localhost:5175/。端口被占用时会报错，不自动换端口。不要直接打开 index.html。

## 桌面开发预览

```sh
npm run desktop:dev
```

窗口标题为 Fragmente-Projekt · Development。界面代码修改自动刷新，Electron 代码修改自动重启。若 5175 上已有本项目的 Vite 服务，会复用它。

测试图片保存在桌面的 `Fragmente-Projekt Preview Library`；编辑数据保存在独立的 `Fragmente-Projekt-Development` 应用配置目录。与正式安装版资料隔离。可通过菜单 Open Library Folder 打开当前图片目录。退出使用 Command+Q 或停止终端命令。

`npm run desktop` 则构建并打开非热更新桌面版本，首次要求选择资料库位置。网页版旧资料需先导出，再导入桌面版。

## 安装包

```sh
npm run package:mac
npm run package:win
```

分别在 macOS / Windows 上生成安装包，输出到 `release/`。当前为未签名开发预览，Windows 安装包和交互仍需对应平台测试。GitHub Actions 提供两平台打包流程。生成本地安装包不会自动发布 GitHub Release。

## 保存方式和当前限制

正式版 Library 包含 `Sources`、`Fragments`、`Canvases`、`.app-data` 和 `browser-data`。编辑数据库仍在 browser-data 中，请完整保留资料库。开发预览的编辑数据库使用上述独立应用配置目录。

- Sources / Fragments 保存图片，启动时同步已有素材。
- 根目录未分类图片留在原处，分类后移动到对应子文件夹；约每三秒扫描一次。
- Canvases 当前是预留目录，尚未自动保存完成作品的渲染图片。
- Inspiration Session 与桌面摆放尚不能在关闭后恢复。
- OCR 首次下载模型，尚未完整打包离线资源。
- Restore 读取导出备份中的 manifest.json，更新同 ID 项目并保留其他项目，并非完整回滚。

安装包、个人图片和资料库数据不进入 Git。

## 检查

### 免账号的局域网素材传输（开发版）

两台电脑都打开桌面版并连接同一个可互通的私有局域网，进入 **Library settings > Transfer over Wi-Fi**。

1. 发送端选择 **Send > Create connection code**，确认分享。
2. 在另一台设备的 **Receive** 输入发送端显示的六个大写字母，小写会自动转大写。
3. 点 **Receive materials** 后会自动查找局域网内的发送端。在发送端确认 **Allow transfer**，接收后核对素材数量，再点 **Import materials**。
4. 完成后点 **Stop sharing** 或关闭对话框；连接码十分钟后自动失效。反方向传输时交换两台设备的角色。

无需账号、云服务或 Supabase 配置。用户确认后才启动临时的局域网 IPv4 接收端口。六位字母是每次新生成的本地证书的短标识，不是加密密码；接收方会先固定并核对发现到的完整证书，再通过 TLS 1.3 传输。短标识约 28 位，不能单独提供强设备身份认证，局域网发现本身也未认证，所以每次请求都必须在发送端确认，并显示请求设备的 IP。只批准你刚在另一台设备上主动发起的传输，建议在可信的私人网络使用，不保存长期账号或设备信任。局域网 IP、证书指纹和传输大小不隐藏。设备发现使用 UDP 组播 239.255.83.71:48371；素材经临时 HTTPS 端口传输，不通过组播发送。

传输 Sources、Fragments、OCR、收藏、来源备注、Boxes 和裁剪痕迹，不传 Canvas 或 Inspiration Session。这是手动素材快照传输，不是持续双向同步，不传播删除。内容相同的记录跳过；同 ID 内容不同时，会先确认，再把传入快照作为独立副本导入并重新关联裁剪等引用，不覆盖原素材。同一快照重复接收不会反复新增；导入中断后可重试。

第一版仅限桌面端互传，每次上限为编码后 64 MB，原始图片总量最多 45 MB，另需留出元数据空间。暂不支持 IPv6-only 网络、手机/浏览器接收、图片增量传输和网络断点续传。自动发现需要网络允许组播，否则需换一个私人网络。传输代码可跨平台，但仍需真实 Mac/Windows 两机验证。系统询问时允许本地网络访问，不要关闭防火墙。访客 Wi-Fi 的设备隔离、VPN 或防火墙可能阻止连接，即使 Wi-Fi 名称相同。不要开放 Vite 的 5175 端口、设置路由器端口转发，或共享 browser-data 数据库文件夹。

测试命令：`node --test electron/lan-transfer.test.cjs` 和 `node scripts/test-material-transfer.mjs`。网络测试只绑定本机回环地址，使用虚构数据。

```sh
npm run build
node --test electron/library.test.cjs
```

后续截图和悬浮人物计划见[桌面版路线图](DESKTOP-ROADMAP.zh-CN.md)。
