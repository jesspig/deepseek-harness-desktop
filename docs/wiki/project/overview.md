---
type: Project
title: 项目概览
description: deepseek-harness(dsh)的桌面端外壳,以官方扩展方式实现,不改上游仓库
tags: [dsh, electron, cordis, m0]
timestamp: 2026-08-15
---

# 项目概览

## 定位

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh`)的**独立 Cordis 应用外壳**:不改动上游仓库,以官方扩展方式(自定义 profile + bundle + Cordis 插件)把 dsh 跑成原生桌面应用。

## 当前状态

- **M0 薄壳已实施完成并通过验收**:双击启动 → 窗口加载官方 Web UI(HTTP 200);URL loopback 校验;关窗无残留进程;数据落盘 DSH_HOME;子进程崩溃弹窗 + 日志可查;单例锁。唯一待用户验证项:配置 API Key 后的对话全链路。
- 实现资产:`apps/desktop/`(Electron 入口)、`packages/desktop-bundle/`(最小 host 插件)、`packages/desktop-profile/template/`(profile 模板)、`apps/desktop/scripts/`(构建脚本)。
- 上游 dsh 处于 developer preview,仓库精确锁定 `@deepseek-ai/dsh@0.1.0-rc.6`。
- 里程碑进度见 [milestones.md](milestones.md),实施细节见 [implementation-plan.md](implementation-plan.md)。

## 设计原则

1. **复用,不重写**:渲染层直接复用 dsh 官方 Web UI(client 插件体系),本仓库只实现桌面专属部分。
2. **零 fork**:只依赖 npm 官方发布物(`@deepseek-ai/*`),不修改上游仓库。
3. **桌面能力即插件**:窗口、托盘、原生通知、`dsh://` 协议、开机自启、自动更新,全部以 Cordis 插件实现。
4. **按上游预留形态演进**:传输层遵循上游 `AbstractApiClient.doFetch` 预留的 IPC bridge 形态,renderer 可经 IPC 直连树内 apiproxy,不依赖 HTTP。

## 关键决策记录

| 决策 | 说明 |
|---|---|
| 知识库位置 | 仓库无在线文档框架,按规则新建 `docs/wiki/`,与 README 并存 |
| 包管理器 | pnpm workspace(`pnpm-workspace.yaml` + `pnpm-lock.yaml`,详见 [build-tooling.md](../config/build-tooling.md)) |
| dsh 版本 | 精确锁定 `@deepseek-ai/dsh@0.1.0-rc.6`(见 [constraints.md](constraints.md)) |
| 打包形态 | 开发模式直接 `pnpm dev` 用系统 dsh;打包版以 `ELECTRON_RUN_AS_NODE` 模式执行随包分发的 dsh 依赖树(见 [build-tooling.md](../config/build-tooling.md)) |

## 相关页面

- [里程碑规划](milestones.md)
- [硬约束](constraints.md)
- 模块:[electron-host](../modules/electron-host.md) / [desktop-bundle](../modules/desktop-bundle.md) / [desktop-client](../modules/desktop-client.md) / [desktop-profile](../modules/desktop-profile.md)
- [构建与工具链约定](../config/build-tooling.md)
- [目录入口](../index.md)
- 根 [README.md](../../../README.md)
