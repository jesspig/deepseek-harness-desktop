---
type: Research
title: dsh-TUI 社区参考调研
description: ccch1mneyyy/dsh-TUI(dsh-cc-tui)调研:社区插件补位官方无 TUI 的形态验证、dsh plugin add 机制、发布模式与对桌面端的启示
tags: [research, reference, dsh-cc-tui, tui, 社区插件]
timestamp: 2026-08-14
sources:
  - https://github.com/ccch1mneyyy/dsh-TUI
  - https://dshplugin.app/
---

# dsh-TUI 社区参考调研

> 调研日期 2026-08-14。**事实**均来自仓库 README / package.json 与官方文档抓取;标"启示"的内容为对桌面端方案的推断,不构成上游事实。
> 参考仓库:[ccch1mneyyy/dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI)(npm 包名 `dsh-cc-tui`)。

## 概览(事实)

- 定位:DeepSeek Harness 官方尚无终端 TUI(只有 Web UI),该插件补位——Claude Code 风格全屏交互终端,纯 Cordis 插件挂载,零核心改动。
- 数据:302 stars / 10 forks;BSD-3-Clause;TypeScript + Ink(移植的 React reconciler 终端渲染)。
- 被 DeepSeek Harness 官方公众号收录为"内测用户精选插件"。
- 官网收录于社区插件注册表 [dshplugin.app](https://dshplugin.app/)(安装命令:`dsh plugin --profile cc-tui add dsh-cc-tui`)。
- 功能面全部走官方服务:消息来自会话日志事件流,fork/resume/compact 走官方 agents/sessions/sessionPersistence/compact,卸载即完全还原。

## 安装与启动机制(事实,官方 CLI 语义)

```sh
npm install -g @deepseek-ai/dsh   # 官方 CLI
dsh plugin --profile cc-tui add dsh-cc-tui   # 装入插件
dsh --profile cc-tui              # 启动
```

`dsh plugin add` 语义(官方 app-boot / CLI 实现,仓库 README 转述):

1. 首次执行在 `$DSH_HOME/profiles/cc-tui/` 自动初始化 profile——manifest 的 `dsh.profile.bundles` **首层自动为 `@deepseek-ai/dsh-base`**;
2. 在 profile 目录内 `pnpm add <包>`;
3. 安装成功后按「依赖是否声明 `dsh.bundle.patch`」自动把该包**追加为 bundle 层**,无需手动改任何文件;
4. 启动时按 bundle 顺序叠加:dsh-base → 各 bundle → profile 的 `cordis.patch.yml`;
5. 重复执行安全(已初始化的 profile 不会被改动)。

## 发布模式(事实,直接照抄的模板)

- `files: ["lib", "cordis.patch.yml", "cordis.yml", "skills"]`:**构建产物 `lib/` 打进 npm 包,安装无需构建**;源码想改需从 git 仓库自建。
- `exports` 暴露 `.`、`./cordis.patch.yml`、`./package.json`、`./src/*` —— 与官方 bundle(如 `@deepseek-ai/dsh-web-app`)的导出模式一致。
- `peerDependencies`:`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-invariants`。
- `engines.node`:`^22.19 || >=24`(与上游 Node 版本要求同口径)。
- 自带依赖注入:`dsh-working-activity` 随包带入 profile node_modules,本包 bundle patch 直接 insert 它的行,用户无需单独 add。

## 版本情报(事实)

- 依赖 `@deepseek-ai/*@^0.1.0-rc.6` —— npm 实况为 rc.6,与本仓库 [implementation-plan.md](../project/implementation-plan.md) 的核实结论一致(上游 checkout 内为 rc.5,官方仍在高频发布)。
- 佐证硬约束「版本精确锁定,升级单独进行并验收」([constraints.md](../project/constraints.md))。

## Windows 封装(事实)

- 仓库提供 `install.sh`(含 pnpm 预检)与 **Windows 的 `dsh-cc.cmd`**(等价,且 `--resume` 恢复上次会话)。社区以脚本降低门槛的做法,桌面端以 electron-builder 全量打包彻底消除。

## 对桌面端方案的启示

1. **形态验证**:官方只有 Web UI 的形态缺口,由社区以「纯 Cordis 插件 + profile」补位并获得官方收录——证明我们的扩展路径(新仓库 + bundle + profile,不改上游)是同一路线的延伸,社区已验证可行。
2. **分发双路径可并存**:
   - 主打:electron-builder 全量打包(内置 CLI + profile,双击即用,新手友好)——见 [implementation-plan.md](../project/implementation-plan.md) M0.5;
   - 极客路径(可选):`dsh plugin --profile desktop add <我们的包>`,与 dsh-TUI 安装方式完全一致。
3. **desktop-bundle 可以很薄**:dsh-TUI 需要自研整个 UI 层(终端渲染);桌面端复用官方 Web UI,外壳只做"启动 dsh + 开窗口",host 插件只管桌面生命周期。
4. **bundles 组合佐证**:dsh-TUI 的 profile 只需 `[dsh-base, dsh-cc-tui]`(UI 自研);桌面端加载官方 Web UI,必须显式包含 `@deepseek-ai/dsh-web-app`——官方 `web` profile 模板即为 `[dsh-base, dsh-web-app]`。desktop profile 目标组合见 [desktop-profile](../modules/desktop-profile.md)。

## 相关页面

- [详细实施方案](../project/implementation-plan.md)
- [里程碑规划](../project/milestones.md)
- [desktop-profile 模块](../modules/desktop-profile.md)
- [目录入口](../index.md)
