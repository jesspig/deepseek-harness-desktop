---
type: Plan
title: 详细实施方案
description: M0 薄壳到 M1 进程内组合的分阶段实施方案,含上游机制核实结论、文件级实施步骤、风险对策与验收标准
tags: [plan, m0, m1, electron, profile, bundle, 实施]
timestamp: 2026-08-14
---

# 详细实施方案

> 状态:本文档于 2026-08-14 基于上游源码(本地 checkout 对应 commit)与 npm 实况核实后写入;**M0 尚未开始实施**,涉及实施的部分均标注 `> [!todo] 待补充`。

## 背景与目标

- 用户诉求:以**新仓库**为 deepseek-harness(`dsh`)开发桌面端,**不改上游**;用户只需**双击运行**,无需手动启动服务器与 WebUI,对新手友好。
- 项目定位:独立 Cordis 应用外壳(自定义 profile + bundle + Cordis 插件),见 [overview.md](overview.md)。
- 与现有形态的关系:官方 `npx @deepseek-ai/dsh web` 一条命令其实已同时启动服务器与 WebUI;桌面端的真正增量是**双击即用(无需用户安装 Node/pnpm)+ 原生窗口体验(托盘/通知/开机自启)+ 数据隔离(内置 DSH_HOME)**。

## 上游机制核实结论(2026-08-14,均有源码依据)

### npm 发布物

| 包 | 核实版本 | 用途 |
|---|---|---|
| `@deepseek-ai/dsh` | npm 最新 `0.1.0-rc.6`(上游 checkout 内 `0.1.0-rc.5`) | CLI:`dsh --profile <name>`、`dsh web`、`dsh plugin` |
| `@deepseek-ai/dsh-base` | `0.1.0-rc.x` | 每个 profile 的第一层 bundle(模型适配、工具、持久化、沙箱、设置、凭据) |
| `@deepseek-ai/dsh-web-app` | `0.1.0-rc.x` | Web 面 bundle:前端 dist 服务、web-runtime、URL 就绪行 |
| `@deepseek-ai/dsh-app-boot` | `0.1.0-rc.x` | `boot()` / `loadProfile` / `composeEntries` 等组合工具(M1 进程内组合用) |

- 官方仍在高频发布(rc.5 → rc.6),印证「版本必须精确锁定」的硬约束([constraints.md](constraints.md))。

### profile 机制(依据上游 `packages/boot/app-boot/README.md`、`apps/cli/README.md`)

- profile 目录:`$DSH_HOME/profiles/<name>/`(`$DSH_HOME` 默认 `~/.dsh`)。
- 内容:目录内 `package.json`(声明 `dsh.profile.bundles` 有序列表 + out-of-tree 插件依赖)+ 用户自己的 `cordis.patch.yml`。
- `web` / `headless` 模板**首次使用自动初始化**;自定义 profile 需经 `dsh plugin --profile <name> <pnpm args>` 或 `initProfile` 创建。
- bundle 解析顺序:**先 dsh 安装内,再 profile 自身 node_modules** —— 这是 out-of-tree bundle 的官方通道,桌面 bundle 无需进上游。
- 树组合顺序:各 bundle patch(按 `bundles` 列表顺序)→ profile 的 `cordis.patch.yml` → 全局 `$DSH_HOME/cordis.patch.yml` → `--patch` 覆盖层。
- 分层中的用户 patch 支持热更新(`watchUserPatches` + HMR)。

### bundle 机制(依据上游 `packages/bundle/web-app/package.json`、`cordis.patch.yml`)

- manifest 声明:`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`。
- patch 内容:按 id 覆盖已有行的整个 `config`(不深合并,需复述保留字段)+ `insert` 新行;支持 `!!js` 表达式(如 `dshHomePath('...')`、`ctx.webStartup.host`)、`inject` 依赖声明。
- 范例:`packages/bundle/web-app/cordis.patch.yml` 展示了完整的 host 插件行插入与 `webserver` 行覆盖写法,是 desktop-bundle 的模板。

### Web 面启动协议(依据上游 `packages/bundle/web-app/src/startup.ts`、`src/index.ts`)

- `dsh --profile web --port 0`:**官方支持**,`0` = 让 OS 随机分配空闲端口。
- `--host 0.0.0.0` 被官方**故意禁用**(防止把远程代码执行暴露到网络)。
- 就绪信号:Loader 结算后 stdout 打印一行 `dsh web: http://127.0.0.1:<port>`(web-runtime 行 `printUrl: true`,该行被官方定位为 supervisor 的 readiness 信号)。
- 以上即 M0 薄壳的全部依赖:spawn + 解析 URL 行 + 开窗。

## 总体架构(两阶段)

| 阶段 | 形态 | 进程模型 | 说明 |
|---|---|---|---|
| M0 | 薄壳 | Electron main spawn dsh CLI 子进程 | 只用官方 CLI + stdout 协议,稳定面最大;先交付「双击即用」 |
| M1+ | 进程内组合 | Electron main 直接 boot Cordis 树 | renderer 经 IPC bridge 通信(上游 `AbstractApiClient.doFetch` 预留形态),桌面插件与 main 同进程,可直接调 Electron API |

M0 验收通过后才启动 M1([milestones.md](milestones.md) 同口径)。

## 仓库布局(目标态)

```text
apps/desktop/             Electron 入口(main / preload),仅进程宿主,无业务逻辑
packages/desktop-bundle/  dsh.bundle 包:host 插件(托盘/通知/生命周期/更新)+ cordis.patch.yml
packages/desktop-client/  client 插件(IPC 传输、桌面专属 UI;可选,M0 不需要)
packages/desktop-profile/ dsh.profile 定义(bundles = [dsh-base, desktop-bundle])
```

## M0 详细实施步骤

> [!todo] 待补充
> 以下各步均为规划,尚未实施;完成标准见 [M0 验收标准](#m0-验收标准)。

### M0.1 仓库骨架

- 根 `package.json` + `pnpm-workspace.yaml`(pnpm workspace;`apps/`、`packages/` 目录)。
- **精确锁定** `@deepseek-ai/dsh` 版本(当前 npm 最新 `0.1.0-rc.6`),升级单独进行并验收。
- `apps/desktop/`:依赖 `electron`、`electron-builder`(dev);`src/main.ts`、`src/preload.ts`、`tsconfig.json`。
- TypeScript 严格模式;main / preload 分别编译产物。

### M0.2 Electron main:spawn + URL 行解析

核心流程(规划):

1. 解析启动参数(可选 `--dsh-home` 覆盖,默认 `~/.dsh`)。
2. 定位 dsh 可执行文件:
   - 开发模式:`node_modules/.bin/dsh`(workspace 内安装 `@deepseek-ai/dsh`);
   - 打包模式:asar 内随包分发的 dsh 及其依赖树(见 M0.5)。
3. `spawn(dsh, ['--profile', 'desktop', '--port', '0'])`,`stdio: ['ignore', 'pipe', 'pipe']`。
4. **逐行解析 stdout**,匹配 `dsh web: http://127.0.0.1:<port>` 形式的 URL 就绪行:
   - 校验 URL 来源必须为 `127.0.0.1` loopback(安全默认,见 [constraints.md](constraints.md));
   - 创建 `BrowserWindow`(`webPreferences: { contextIsolation: true, nodeIntegration: false, preload }`);
   - `loadURL(url)`;窗口内**外链一律交给系统打开**。
5. 生命周期联动:窗口关闭 → 优雅终止子进程(先 SIGTERM,超时后 kill);子进程意外退出 → 弹窗提示并可选重启;进程退出时清理子进程,不留残留。
6. 二次实例保护(单例锁);托盘最小化是否纳入见 M0.4 范围确认。
7. stderr 透传为日志文件(应用数据目录),供排障。

### M0.3 desktop-profile 模板

profile 分发两方案,**先 B 后 A**:

- **方案 B(M0 最小闭环,先做)**:复用官方 `web` profile,Electron 以 `--profile web` 启动,先验证 spawn + URL 解析闭环;桌面专属配置暂以 patch 注入。
- **方案 A(正式形态,后续切换)**:定义 `packages/desktop-profile/` 模板:
  - `package.json` 声明 `"dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "<desktop-bundle 包名>"] } }` + out-of-tree 依赖;
  - 首次运行由 Electron 将模板写入 `$DSH_HOME/profiles/desktop/`(参照官方 web / headless 模板自动初始化机制),`desktop-bundle` 装入该 profile 的 node_modules —— 官方支持的 out-of-tree 路径。

### M0.4 desktop-bundle(cordis.patch.yml 模板)

- 以官方 `packages/bundle/web-app/cordis.patch.yml` 为模板:insert 桌面插件行、按需覆盖 `webserver` 行(`host` 保持 loopback 默认;`port` 保持 `--port 0` 随机)。
- **职责边界(M0 关键约束)**:desktop-bundle 的 host 插件运行在 **dsh 子进程内**,而窗口/托盘等原生 API 只在 **Electron main 进程**可用;两者是不同进程。M0 的桌面能力按如下分配:
  - **main 侧直接实现**:窗口、单例锁、外链托管、生命周期(不需要插件);
  - **插件侧实现**:运行树内的配置面/数据面扩展(如 surface 提示文本、shell 环境变量);
  - **跨进程能力**(托盘/原生通知)两条路二选一,实施时定夺:
    1. main 侧独立管理(最简单,M0 推荐);
    2. 插件经**自定义 stdout 协议行**(如 `dsh-desktop: <json>`)与 main 通信,main 执行原生操作(协议行需自定格式并严格校验,注意与官方 URL 行共存解析);
  - M1 进程内组合后插件与 main 同进程,上述边界自然消失。
- **第一批能力范围(待确认)**:托盘 / 退出 / 关于 是否进入 M0,或 M0 仅「窗口 + 加载 UI」最小闭环。

### M0.5 打包分发(electron-builder)

- `apps/desktop` 打包为 asar;dsh 及其全部依赖(`@deepseek-ai/*` 依赖树、`node-addon-require-builtin` 等原生模块)随包分发,用户机器**无需安装 Node/pnpm**。
- pnpm 符号链接处理:评估 `node-linker=hoisted` 或打包脚本将符号链接解析为真实文件;`node_modules/.bin/dsh` 需在打包产物中可执行。
- 平台原生依赖 unpack 配置(`asarUnpack`)。
- 产物形态(实施时定):Windows 双击运行的 `.exe`(NSIS 安装包或便携目录)。

### M0.6 验收标准

- [ ] 双击启动 → 窗口出现并加载 Web UI,无需任何手动命令(开发模式下 `pnpm dev` 亦可)。
- [ ] stdout URL 行解析成功,URL 来源校验通过(仅 `127.0.0.1`)。
- [ ] 在 UI 中完成模型 API Key 配置后,对话可用(全链路打通 dsh-base + web-app)。
- [ ] 关闭窗口后进程树无残留(无 dsh 子进程)。
- [ ] 数据落盘位置符合预期(默认 `~/.dsh`),会话可恢复。
- [ ] 子进程崩溃时给出可读错误提示,日志可查。

## M1+(进程内组合)要点

- main 直接调用 `@deepseek-ai/dsh-app-boot` 的 `loadProfile` / `composeEntries` / `boot`(与官方 CLI 同一组合路径,`--dump-config` 结果一致)。
- renderer 经 IPC bridge 通信(上游 `AbstractApiClient.doFetch` 预留形态,见 [desktop-client](modules/desktop-client.md))。
- desktop-bundle 插件与 main 同进程,托盘 / 通知 / 开机自启直接调 Electron API;`dsh://` 协议、自动更新纳入。
- 启动条件:M0 验收通过 + 上游相关抽象稳定。

## 风险与对策

| 风险 | 对策 |
|---|---|
| 上游 rc 期破坏性变更 | 精确锁定版本;升级单独进行并验收 |
| 打包体积大(dsh 依赖多) | 评估 asar 压缩与按平台裁剪;体积列入验收记录 |
| pnpm 符号链接在打包产物中失效 | `node-linker=hoisted` 或打包脚本实体化;打包产物实机验收 |
| Windows 下 profile 的 node_modules 分发 | 方案 A 中 bundle 依赖装入应用 node_modules,profile 只留清单与 patch |
| 双进程通信复杂度 | M0 限定:窗口/生命周期归 main,跨进程能力最小化或推迟 |
| 新手排障困难 | 内置 DSH_HOME、日志落盘应用数据目录、错误弹窗含日志路径 |

## 相关页面

- [项目概览](overview.md)
- [里程碑规划](milestones.md)
- [硬约束](constraints.md)
- 模块:[electron-host](../modules/electron-host.md) / [desktop-bundle](../modules/desktop-bundle.md) / [desktop-client](../modules/desktop-client.md) / [desktop-profile](../modules/desktop-profile.md)
- [构建与工具链约定](../config/build-tooling.md)
- [目录入口](../index.md)
