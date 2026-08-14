---
type: Plan
title: 里程碑规划
description: M0 薄壳已完成并通过验收;M1+ 进程内组合尚未开始
tags: [milestone, m0, m1, 规划]
timestamp: 2026-08-15
---

# 里程碑规划

## M0:薄壳(已完成)

- 形态:Electron main spawn 官方 CLI(`dsh --profile desktop --port 0`),解析 stdout URL 行,开窗加载官方 Web UI。
- **状态:已实施完成并通过验收**(2026-08-15),验收明细见 [implementation-plan.md](implementation-plan.md) 的 M0 验收结果。
- 实施资产:`apps/desktop/`([electron-host](../modules/electron-host.md))、`packages/desktop-bundle/`([desktop-bundle](../modules/desktop-bundle.md))、`packages/desktop-profile/template/`([desktop-profile](../modules/desktop-profile.md))、`apps/desktop/scripts/`(构建脚本)。

## M1+:进程内组合(未开始)

- 形态:Electron main 直接 boot Cordis 树(`@deepseek-ai/dsh-app-boot` 的 `loadProfile` / `composeEntries` / `boot`),renderer 经 IPC bridge 通信(上游 `AbstractApiClient.doFetch` 预留形态)。
- **状态:未开始**。M0 验收已通过,但上游相关抽象仍在 rc 期演进,启动时机待定。

## 相关页面

- [项目概览](overview.md)
- [详细实施方案](implementation-plan.md)
- [electron-host 模块](../modules/electron-host.md)
- [desktop-bundle 模块](../modules/desktop-bundle.md)
- [目录入口](../index.md)
