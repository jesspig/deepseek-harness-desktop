---
type: Module
title: electron-host(已实现)
description: Electron 入口模块 apps/desktop/,main / preload,仅进程宿主;spawn dsh 子进程、splash 先行窗口、URL 行解析、托盘常驻、生命周期、单例、日志、profile 引导
resource: ../../../apps/desktop/src/main.ts
tags: [electron, main, preload, 已实现]
timestamp: 2026-08-16
---

# electron-host(已实现)

实现目录:`apps/desktop/`,源文件 `src/`,编译产物 `dist/`。模块间契约见 `apps/desktop/src/contracts.md`。

## 模块结构(src/)

| 文件 | 职责 |
|---|---|
| `main.ts` | 装配入口:`app.whenReady` 首行同步创建 splash 窗口(窗口先行)→ 打点 → 编译缓存 → initLog → profile 引导(打包模式含 links)→ 单例锁 → spawn dsh → URL 就绪行切主界面;关窗拦截为隐藏、托盘接线、`quitApp()` 统一退出路径 |
| `dsh/process.ts` | spawn dsh CLI(`--profile desktop --port 0`)、逐行解析 stdout、stderr 透传日志、`stop()` 优雅终止(kill → 5s 宽限 → Windows 下 `taskkill /T /F` 树杀,幂等);导出 `URL_LINE_PATTERN = /^dsh web: (http:\/\/127\.0\.0\.1:\d+)$/` |
| `window.ts` | `createSplashWindow`(窗口先行:**静态品牌启动画面**——内联 data: URL 展示官方 dsh 文字 logo(SVG,viewBox 182×24,17 path,提取自 dsh-web-frontend 的 BrandWordmark 组件),CSS prefers-color-scheme 适配深浅色主题(浅 #f5f5f7/#1a1a1a、深 #16161a/#e8e8ec),无加载指示,加载反馈由 Web UI 自带加载页提供;窗口图标 icon 加载 assets/icon.png(品牌蓝 mark,官方 favicon 派生),exe 图标经 electron-builder win.icon 同源;`show:false` + `ready-to-show` 显窗、加载前 `isLoopbackUrl` 校验、`contextIsolation: true` / `nodeIntegration: false` / preload、外链拦截)、`loadMainUrl`(URL 就绪后同窗口切换)、`v8CacheOptions` 实验开关(`DSH_DESKTOP_V8_CACHE`)、`openExternal` |
| `lifecycle.ts` | 子进程意外退出 → 错误弹窗 + 退出;`before-quit` 兜底停止子进程(幂等);`will-quit` 时 dispose;关窗退出逻辑已移除(关窗由 main 拦截为隐藏) |
| `tray.ts` | 系统托盘:内联 base64 图标、菜单「打开主界面 / 退出」、单击恢复窗口;`destroyAppTray` 安全销毁 |
| `singleton.ts` | `acquireSingletonLock`(`requestSingleInstanceLock`);`second-instance` 显示 + 聚焦已有窗口(窗口可能处于隐藏态) |
| `log.ts` | `initLog` 落盘 `userData/logs/desktop-<YYYYMMDD>.log`,ISO 时间戳 + INFO/ERROR 级别 |
| `profile.ts` | `ensureDesktopProfile`(模板清单复制到 `$DSH_HOME/profiles/desktop/`)、`ensureProfileLinks`(打包模式建立 `$DSH_HOME/profiles/node_modules` 逐包 Junction) |
| `preload.ts` + `preload.d.ts` | contextBridge 暴露 `window.dshDesktop.versions`(M0 占位,后续在 `DesktopBridge` 上增量扩展) |
| `assets/icon.png` | 品牌图标资源(256x256,官方 favicon.svg 派生品牌蓝;exe 与窗口标题栏共用) |

## 启动流程(窗口先行)

1. 解析 `DSH_HOME`(默认 `~/.dsh`)与 dsh 路径。
2. `whenReady` 回调**第一行**同步创建 splash 窗口(静态品牌启动画面,不等待后端),`ready-to-show` 后显示,打点 `elapsed=窗口创建完成`;加载反馈由 Web UI 自带加载页提供,避免双加载界面。
3. 设置 `NODE_COMPILE_CACHE`(指向 `userData/node-compile-cache`,Node 24 模块编译缓存)→ `initLog` → `ensureDesktopProfile`(+打包模式 `ensureProfileLinks`)。
4. 单例锁失败 → 退出;成功 → 创建托盘 → `spawn dsh --profile desktop --port 0`。
5. stdout 匹配 `URL_LINE_PATTERN` → 校验 loopback → 同窗口 `loadMainUrl` 切主界面;期间打点 `URL 就绪`、`前端加载开始`、`前端加载完成`(elapsed 均从 `whenReady` 回调开始起算)。
6. 关窗 → 拦截为隐藏(应用与 dsh 常驻);再次双击 exe 或点托盘 → 恢复窗口;托盘「退出」→ `quitApp()`(停子进程 → 退出,无残留)。

## 启动加速实测(feature/startup-acceleration)

| 指标 | 首次冷启动 | 二次启动(页缓存热) |
|---|---|---|
| 窗口创建完成(双击到 splash 出现) | 35ms | 27ms |
| URL 就绪(dsh 后端) | 32322ms | 1715ms |
| 前端加载完成 | 33460ms | 2174ms |

- 窗口先行后,双击 **<100ms 即出现 splash 窗口**(原实现需等后端 1.4–3s 才开窗)。
- 二次启动后端 1.7s(编译缓存目录 `v24.18.1-x64-*` 已生成;热启动差异主要来自 OS 页缓存)。
- 首次冷启动 32s 主要成本为 Defender 对全新构建资源的首次扫描与页缓存冷读;建议安装目录加入 Defender 排除(见 [build-tooling](../config/build-tooling.md))。

## 打包模式差异

- 开发模式:`spawn("dsh", ...)` 使用 PATH 中系统 dsh;打包模式:`ELECTRON_RUN_AS_NODE=1` spawn 自身 exe 执行 `resources/node_modules/@deepseek-ai/dsh/lib/bin.js`,并前置 `--expose-internals`(ELECTRON_RUN_AS_NODE 下 `node-addon-require-builtin` 原生模块不可用,HMR 需走 execArgv 路径)。
- 模板目录:开发模式指向 `packages/desktop-profile/template`,打包模式指向 `resources/template`。
- `NODE_COMPILE_CACHE` 经 spawn env 继承;系统 node(dev)下确认生效,打包模式 Electron 内置 Node 24.18.1 下版本目录生成、缓存落盘未确认(进程强杀场景未落盘,正常退出路径待验证)。

## 安全落实

- URL 就绪行正则仅接受 `http://127.0.0.1:<port>`;`isLoopbackUrl` 仅放行 `127.0.0.1` / `localhost` 且带端口;splash 为受控内联 `data:` 源。
- renderer:`nodeIntegration: false` + `contextIsolation: true`(sandbox 保持默认)。
- 外链一律 `shell.openExternal`,窗口内导航拦截;`loadMainUrl` 切换不触发 `will-navigate`,拦截语义不变。

## 相关页面

- [里程碑规划](../project/milestones.md)
- [详细实施方案](../project/implementation-plan.md)
- [desktop-profile](desktop-profile.md)
- [desktop-bundle](desktop-bundle.md)
- [硬约束](../project/constraints.md)
- [构建与工具链约定](../config/build-tooling.md)
- [目录入口](../index.md)