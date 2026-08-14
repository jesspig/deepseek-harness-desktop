---
type: Module
title: desktop-client(规划,可选)
description: client 插件(IPC 传输、桌面专属 UI),可选;目录尚未创建
tags: [client-plugin, ipc, 可选, 规划]
timestamp: 2026-08-14
---

# desktop-client(规划,可选)

> [!todo] 待补充
> 规划路径 `packages/desktop-client/`,当前不存在。以下内容为 AGENTS.md / README 的规划转述。

## 职责(规划)

- client 插件:IPC 传输(renderer 经 IPC 直连树内 apiproxy,不依赖 HTTP)
- 桌面专属 UI(可选)
- 该包为**可选**组件,M0 阶段可能不需要

## 与相邻模块的关系(规划)

- 与 [desktop-bundle](desktop-bundle.md) 同属本仓库实现的插件层(host 插件 + client 插件)
- 传输形态对应上游 `AbstractApiClient.doFetch` 预留的 IPC bridge(见 [milestones.md](../project/milestones.md) 的 M1+)

## 相关页面

- [desktop-bundle](desktop-bundle.md)
- [里程碑规划](../project/milestones.md)
- [项目概览](../project/overview.md)
- [目录入口](../index.md)
