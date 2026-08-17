---
type: Module
title: desktop-client(已实现)
description: client 插件 @dsh-desktop/client:会话头部"在文件管理器中打开"按钮,经官方 host.openPath 打开当前工作区目录;dsh.client 声明 + exports["./client"]
resource: ../../../packages/desktop-client/src/client.tsx
tags: [client-plugin, ui, 已实现]
timestamp: 2026-08-16
---

# desktop-client(已实现)

实现目录:`packages/desktop-client/`(包名 `@dsh-desktop/client`,版本 `0.1.0-rc.6`,私有)。

## 包结构

| 文件 | 职责 |
|---|---|
| `package.json` | `exports["./client"]` → `lib/client.js`;`dsh.client` 声明(`platform: web`,注入 connection/locale/runtime/ui-conversation/ui-slots);dsh 依赖精确锁定 0.1.0-rc.6 |
| `tsconfig.json` | ES2022 + bundler resolution + react-jsx,src → lib |
| `src/index.ts` | node 半,空 apply(与官方 ui-directory-picker-browse 同构,使插件出现在 Loader) |
| `src/client.tsx` | 浏览器半:注册 `conversation.session.header.actions` 槽(按钮"在文件管理器中打开"),经官方 `ctx.workspaces.openPath` 打开当前会话所属 Workspace 目录 |

## 设计要点(符合 dsh 设计理念)

- **能力复用官方网关**:打开本地路径由官方 api-gateway 的 `host.openPath` 承担(host 侧 native-path-opener,不经 shell、PowerShell 单引号转义防注入),不自研 RPC。
- **安全**:打开的路径来自 host 端 Workspace 注册表(`WorkspaceView.path`,host-side realpath canon),非任意用户输入;仅打开目录。
- **平台门控**:经 `connection.hostDescription` 读 `canOpenPath`(Windows/macOS/WSL 为 true),不支持时按钮隐藏。
- **挂载点**:`conversation.session.header.actions` 为 session 作用域 list 槽(官方 ui-jobs/ui-subagent 同款注册口径),不与 ui-workspace 独占的 hero single 槽冲突。
- **接线**:由 `desktop-bundle/cordis.patch.yml` 注册 `desktop-client` 行进入 Loader;dsh-client-modules 扫描 Loader 条目发现 dsh.client 声明,合成 `__DSH_BOOT__` 并由 webServer 服务 `/plugins/@dsh-desktop/client/client.js`。

## 验证(实测)

- `pnpm build` 全链路编译通过(bundle → client → app)。
- 打包产物中 `/plugins/@dsh-desktop/client/client.js` 返回 200 且含按钮文案"在文件管理器中打开";启动秒开保持(窗口 48ms、前端 2.36s)。

## 相关页面

- [desktop-bundle](desktop-bundle.md)
- [electron-host](electron-host.md)
- [构建与工具链约定](../config/build-tooling.md)
- [目录入口](../index.md)
