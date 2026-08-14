---
type: Module
title: electron-host(规划)
description: Electron 入口模块,main / preload,仅进程宿主,无业务逻辑;目录尚未创建
tags: [electron, main, preload, 规划]
timestamp: 2026-08-14
---

# electron-host(规划)

> [!todo] 待补充
> 规划路径 `apps/desktop/`,当前不存在。以下内容为 AGENTS.md / README 的规划转述。

## 职责(规划)

- Electron 入口(main / preload)
- 仅进程宿主,无业务逻辑
- M0 阶段:spawn 官方 CLI 并开窗加载 Web UI(见 [milestones.md](../project/milestones.md))
- M1+ 阶段:main 进程直接 boot Cordis 树,renderer 经 IPC bridge 通信

## 与相邻模块的关系(规划)

- 依赖 [desktop-bundle](desktop-bundle.md) 提供的 host 插件能力(窗口/托盘/生命周期)
- 依赖 [desktop-profile](desktop-profile.md) 定义的 profile 组合
- 受安全约束约束(loopback 通信、URL 来源校验、renderer 不开 nodeIntegration,见 [constraints.md](../project/constraints.md))

## 相关页面

- [里程碑规划](../project/milestones.md)
- [desktop-bundle](desktop-bundle.md)
- [desktop-profile](desktop-profile.md)
- [目录入口](../index.md)
