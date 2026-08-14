---
type: Plan
title: 详细实施方案
description: M0 薄壳的分阶段实施记录(已完成)与 M1 进程内组合规划,含上游机制核实结论、实施要点与验收结果
tags: [plan, m0, m1, electron, profile, bundle, 实施]
timestamp: 2026-08-15
---

# 详细实施方案

> 状态:M0 薄壳已于 2026-08-15 实施完成并通过验收;本文档据此更新——「上游机制核实结论」「实施要点」章节记录已实现的事实,M1+ 规划部分仍为未实施规划。

## 背景与目标

- 用户诉求:以**新仓库**为 deepseek-harness(`dsh`)开发桌面端,**不改上游**;用户只需**双击运行**,无需手动启动服务器与 WebUI。
- 项目定位:独立 Cordis 应用外壳(自定义 profile + bundle + Cordis 插件),见 [overview.md](overview.md)。
- 桌面端增量:双击即用 + 原生窗口体验 + 数据隔离(内置 DSH_HOME)。官方 `npx @deepseek-ai/dsh web` 虽一条命令同时启动服务器与 WebUI,但需要用户自行安装 Node/pnpm。

## 上游机制核实结论(2026-08-14 核实,均已落地验证)

### npm 发布物

| 包 | 仓库锁定版本 | 用途 |
|---|---|---|
| `@deepseek-ai/dsh` | `0.1.0-rc.6`(`apps/desktop/package.json`) | CLI:`dsh --profile <name>`、`dsh web`、`dsh plugin` |
| `@deepseek-ai/dsh-base` | rc.6 系(profile 模板 bundles 首层) | 每个 profile 的第一层 bundle |
| `@deepseek-ai/dsh-web-app` | `0.1.0-rc.6`(profile 模板精确锁定) | Web 面 bundle:前端 dist 服务、web-runtime、URL 就绪行 |
| `@deepseek-ai/dsh-app-boot` | rc.6 系(依赖树内) | `boot()` / `loadProfile` / `composeEntries` 等组合工具(M1 进程内组合用) |

- 官方持续高频发布(rc.5 → rc.6),「版本必须精确锁定」的硬约束已落实([constraints.md](constraints.md))。

### profile 机制

- profile 目录:`$DSH_HOME/profiles/<name>/`;内容为目录内 `package.json`(声明 `dsh.profile.bundles`)+ `cordis.patch.yml`。
- 自定义 profile 经 `dsh plugin --profile <name> add <pkg>` 初始化并追加 bundle 层。
- bundle 解析顺序:先 dsh 安装内,再 profile 自身 node_modules。
- 实测:Windows 下 `$DSH_HOME/profiles/node_modules` 为 Junction(官方 `healProfilesModuleFallback` 维护),见 [upstream-behavior-verify.md](../research/upstream-behavior-verify.md)。

### bundle 机制

- manifest 声明:`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`;patch 内容支持 `insert` 新行、按 id 覆盖 config。
- 实测:带 `dsh.bundle.patch` 声明的包经 `dsh plugin add` 后自动追加为 bundle 层。
- 本仓库 desktop-bundle 采用同一形态,见 [desktop-bundle](../modules/desktop-bundle.md)。

### Web 面启动协议

- `dsh --profile web --port 0`:官方支持,`0` = OS 随机分配空闲端口;`--host 0.0.0.0` 被官方禁用。
- 就绪行:`dsh web: http://127.0.0.1:<port>`,host 恒为 loopback,是 supervisor readiness 信号。
- 实测正则基准 `^dsh web: (http://127\.0\.0\.1:\d+)$` 已落地为 `URL_LINE_PATTERN`([electron-host](../modules/electron-host.md))。

## 总体架构

| 阶段 | 形态 | 进程模型 | 状态 |
|---|---|---|---|
| M0 | 薄壳 | Electron main spawn dsh CLI 子进程 | **已完成并验收** |
| M1+ | 进程内组合 | Electron main 直接 boot Cordis 树 | 未开始(规划) |

## 仓库布局(现状)

```text
apps/desktop/             Electron 入口(main / preload / log / singleton / lifecycle / window / profile / dsh/process),仅进程宿主
apps/desktop/scripts/     generate-profile.mjs(profile 模板生成)、pack-dsh.mjs(dsh 依赖树打包复制)
packages/desktop-bundle/  dsh.bundle 包:@dsh-desktop/bundle(host 插件占位 + cordis.patch.yml)
packages/desktop-client/  未实现(仅占位目录)
packages/desktop-profile/ dsh.profile 定义(template/:package.json + cordis.patch.yml + pnpm-workspace.yaml)
```

## M0 实施要点(已完成)

### M0.1 仓库骨架

- 根 `package.json` + `pnpm-workspace.yaml`(pnpm workspace,`nodeLinker: hoisted`,`allowBuilds` 声明 electron/koffi/node-pty 等)。
- 精确锁定 `@deepseek-ai/dsh@0.1.0-rc.6`、`electron@43.4.0`;electron-builder `^26.0.0`、typescript `^5.9.3`(见 [build-tooling.md](../config/build-tooling.md))。
- `apps/desktop/`:`src/main.ts`、`src/preload.ts` + `src/preload.d.ts`、`tsconfig.json`(严格模式,CommonJS 编译到 `dist/`)。

### M0.2 Electron main:spawn + URL 行解析(已实现)

实现于 [electron-host](../modules/electron-host.md),核心流程与规划一致:

1. `DSH_HOME` 默认 `~/.dsh`,可用环境变量覆盖。
2. dsh 定位:开发模式 PATH 中 `dsh`;打包模式 `ELECTRON_RUN_AS_NODE` 执行 `resources/node_modules/@deepseek-ai/dsh/lib/bin.js`。
3. `spawn(dsh, ['--profile', 'desktop', '--port', '0'])`,`stdio: ['ignore', 'pipe', 'pipe']`。
4. 逐行解析 stdout 匹配 URL 就绪行(正则见上);加载前校验 loopback;`BrowserWindow` 配置 `contextIsolation: true`、`nodeIntegration: false`、preload。
5. 生命周期联动:关窗 → `stop()`(kill + 宽限 5s → Windows 下 `taskkill /T /F` 树杀);子进程意外退出 → 错误弹窗 + 退出。
6. 单例锁:`requestSingleInstanceLock`;二次实例聚焦已有窗口。
7. stderr 透传为日志文件(`userData/logs/desktop-<YYYYMMDD>.log`)。

### M0.3 desktop-profile 模板(已实现)

- 采用规划中的**方案 A 形态**:`packages/desktop-profile/template/` 含 `package.json`(bundles = `[dsh-base, dsh-web-app, @dsh-desktop/bundle]`)、`cordis.patch.yml`、`pnpm-workspace.yaml`。
- 模板由 `apps/desktop/scripts/generate-profile.mjs` 生成(两阶段策略规避 Windows pnpm 网络崩溃):先官方 `dsh plugin add`;失败转手动 `pnpm add --save-exact` + 补 reconcile;最后 `allowBuilds` 占位符修复 + `pnpm install`。
- 运行时首启由 `src/profile.ts` 的 `ensureDesktopProfile` 把模板清单复制到 `$DSH_HOME/profiles/desktop/`;打包模式下 `ensureProfileLinks` 建立 `$DSH_HOME/profiles/node_modules` 的 Junction 链接。

### M0.4 desktop-bundle(已实现)

- `packages/desktop-bundle/`:`cordis.patch.yml` insert `desktop-host` 行;插件 `src/index.ts` 目前仅记录加载日志(占位)。
- M0 职责边界落地:窗口/单例/外链/生命周期全部在 Electron main 侧实现,插件侧无跨进程能力;托盘等留待 M1。

### M0.5 打包分发(已实现)

- `apps/desktop/electron-builder.yml`:NSIS 目标(oneClick 关闭、允许改安装目录)、asar(仅应用自身代码)、`extraResources`:release-resources/node_modules(dsh 依赖树)与 desktop-profile/template。
- `scripts/pack-dsh.mjs`:从仓库根 node_modules(hoisted)实体复制 `@deepseek-ai/*`、`@dsh-desktop/*` 及传递依赖到 `apps/desktop/release-resources/node_modules`(不动点依赖收集、dereference、删除失效链接与 bundle 内冗余 node_modules),幂等。
- 产物:`apps/desktop/release/DeepSeek Harness Desktop Setup 0.0.0.exe`。

### M0.6 验收结果(全部实测通过)

- [x] 双击启动 → 窗口出现并加载 Web UI(HTTP 200)。
- [x] stdout URL 行解析成功,URL 来源校验通过(仅 loopback)。
- [ ] 配置 API Key 后对话可用 —— **待用户验证**(其余项均通过)。
- [x] 关闭窗口后进程树无残留。
- [x] 数据落盘 DSH_HOME,会话可恢复。
- [x] 子进程崩溃时给出可读错误提示,日志可查。

## M1+(进程内组合)要点(规划)

- main 直接调用 `@deepseek-ai/dsh-app-boot` 的 `loadProfile` / `composeEntries` / `boot`(与官方 CLI 同一组合路径)。
- renderer 经 IPC bridge 通信(上游 `AbstractApiClient.doFetch` 预留形态,见 [desktop-client](../modules/desktop-client.md))。
- desktop-bundle 插件与 main 同进程,托盘 / 通知 / 开机自启直接调 Electron API;`dsh://` 协议、自动更新纳入。
- 启动条件:上游相关抽象稳定后另行立项。

## 风险与对策(实施记录)

| 风险 | 对策 | 状态 |
|---|---|---|
| 上游 rc 期破坏性变更 | 精确锁定版本;升级单独进行并验收 | 已落实 |
| pnpm 符号链接在打包产物中失效 | pack-dsh.mjs 实体复制(dereference + junction 解析)+ 删除失效链接 | 已解决 |
| Windows 下 profile 的 node_modules 分发 | 模板只留清单;运行时 `ensureProfileLinks` 建立 Junction | 已解决 |
| Windows 下 dsh 转发 pnpm 网络并发崩溃 | generate-profile.mjs 两阶段策略(官方 add → 手动 pnpm add → reconcile) | 已解决 |
| 双进程通信复杂度 | M0 限定:窗口/生命周期归 main,跨进程能力推迟 | 已落实 |
| 新手排障困难 | 日志落盘 userData/logs,错误弹窗含信息 | 已落实 |
| 打包体积大(dsh 依赖多) | pack-dsh 按依赖收集裁剪,体积计入脚本输出 | 已缓解 |

## 相关页面

- [项目概览](overview.md)
- [里程碑规划](milestones.md)
- [硬约束](constraints.md)
- 模块:[electron-host](../modules/electron-host.md) / [desktop-bundle](../modules/desktop-bundle.md) / [desktop-client](../modules/desktop-client.md) / [desktop-profile](../modules/desktop-profile.md)
- [构建与工具链约定](../config/build-tooling.md)
- [上游行为实测验证报告](../research/upstream-behavior-verify.md)
- [目录入口](../index.md)
