---
type: Module
title: electron-host(已实现)
description: Electron 入口模块 apps/desktop/,main / preload,仅进程宿主;spawn dsh 子进程、URL 行解析、窗口、生命周期、单例、日志、profile 引导
resource: ../../../apps/desktop/src/main.ts
tags: [electron, main, preload, 已实现]
timestamp: 2026-08-15
---

# electron-host(已实现)

实现目录:`apps/desktop/`,源文件 `src/`,编译产物 `dist/`。模块间契约见 `apps/desktop/src/contracts.md`。

## 模块结构(src/)

| 文件 | 职责 |
|---|---|
| `main.ts` | 装配入口:`app.whenReady` → initLog → profile 引导(打包模式含 links)→ 单例锁 → spawn dsh → URL 就绪行开窗;`dshPath` 取 `DSH_DESKTOP_DSH_PATH` 环境变量,默认 `dsh` |
| `dsh/process.ts` | spawn dsh CLI(`--profile desktop --port 0`)、逐行解析 stdout、stderr 透传日志、`stop()` 优雅终止(kill → 5s 宽限 → Windows 下 `taskkill /T /F` 树杀);导出 `URL_LINE_PATTERN = /^dsh web: (http:\/\/127\.0\.0\.1:\d+)$/` |
| `window.ts` | `createAppWindow`(加载前 `isLoopbackUrl` 校验;`contextIsolation: true` / `nodeIntegration: false` / preload;`setWindowOpenHandler` 与 `will-navigate` 拦截外链)、`openExternal`(仅 http/https 非 loopback 交 `shell.openExternal`) |
| `lifecycle.ts` | 关窗 → `stopProcess()` → `app.quit()`;子进程意外退出 → 错误弹窗 + 退出;`before-quit` 兜底停止;`will-quit` 时 dispose |
| `singleton.ts` | `acquireSingletonLock`(`requestSingleInstanceLock`);`second-instance` 聚焦已有窗口 |
| `log.ts` | `initLog` 落盘 `userData/logs/desktop-<YYYYMMDD>.log`,ISO 时间戳 + INFO/ERROR 级别 |
| `profile.ts` | `ensureDesktopProfile`(模板清单复制到 `$DSH_HOME/profiles/desktop/`)、`ensureProfileLinks`(打包模式建立 `$DSH_HOME/profiles/node_modules` Junction) |
| `preload.ts` + `preload.d.ts` | contextBridge 暴露 `window.dshDesktop.versions`(M0 占位,后续在 `DesktopBridge` 上增量扩展) |

## 启动流程

1. 解析 `DSH_HOME`(默认 `~/.dsh`)与 dsh 路径。
2. `ensureDesktopProfile`:profile 目录缺 `package.json` 时,从模板复制 `package.json` / `cordis.patch.yml` / `pnpm-workspace.yaml`(/ `cordis.yml` 可选)。
3. 打包模式 `ensureProfileLinks`:把 `resources/node_modules` 下 `@deepseek-ai`、`@dsh-desktop` scope 内包链接进 `$DSH_HOME/profiles/node_modules`(Windows junction / POSIX dir)。
4. 单例锁失败 → 退出;成功 → `spawn dsh --profile desktop --port 0`。
5. stdout 匹配 `URL_LINE_PATTERN` → 校验 loopback → 开窗加载官方 Web UI。
6. 关窗/退出/崩溃均清理子进程(见 `lifecycle.ts`)。

## 打包模式差异

- 开发模式:`spawn("dsh", ...)` 使用 PATH 中系统 dsh;打包模式:`ELECTRON_RUN_AS_NODE=1` spawn 自身 exe 执行 `resources/node_modules/@deepseek-ai/dsh/lib/bin.js`,并前置 `--expose-internals`(ELECTRON_RUN_AS_NODE 下 `node-addon-require-builtin` 原生模块不可用,HMR 需走 execArgv 路径)。
- 模板目录:开发模式指向 `packages/desktop-profile/template`,打包模式指向 `resources/template`。

## 安全落实

- URL 就绪行正则仅接受 `http://127.0.0.1:<port>`;`isLoopbackUrl` 仅放行 `127.0.0.1` / `localhost` 且带端口。
- renderer:`nodeIntegration: false` + `contextIsolation: true`(sandbox 保持默认)。
- 外链一律 `shell.openExternal`,窗口内导航拦截。

## 相关页面

- [里程碑规划](../project/milestones.md)
- [详细实施方案](../project/implementation-plan.md)
- [desktop-profile](desktop-profile.md)
- [desktop-bundle](desktop-bundle.md)
- [硬约束](../project/constraints.md)
- [构建与工具链约定](../config/build-tooling.md)
- [目录入口](../index.md)
