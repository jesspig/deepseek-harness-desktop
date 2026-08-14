---
type: Plan
title: 里程碑规划
description: M0 薄壳与 M1+ 进程内组合两阶段的形态演进规划,均未开始
tags: [milestone, m0, m1, 规划]
timestamp: 2026-08-14
---

# 里程碑规划

> [!todo] 待补充
> 以下为 README「规划形态」表的转述。两阶段均未开始:仓库无任何实现代码,`apps/`、`packages/` 目录均不存在。

## M0:薄壳

- spawn 官方 CLI(`dsh --profile desktop --port 0`)
- 解析 stdout URL 行,开窗加载官方 Web UI
- 状态:未开始

## M1+:进程内组合

- Electron main 直接 boot Cordis 树
- renderer 经 IPC bridge 通信(上游 `AbstractApiClient.doFetch` 预留形态)
- 状态:未开始(依赖 M0 验收)

## 相关页面

- [项目概览](overview.md)
- [electron-host 模块](../modules/electron-host.md)
- [desktop-bundle 模块](../modules/desktop-bundle.md)
- [目录入口](../index.md)
