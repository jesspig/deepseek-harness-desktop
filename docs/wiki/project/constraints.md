---
type: Policy
title: 硬约束
description: 不改上游、不重写 UI、版本锁定、稳定面优先、安全默认五项硬约束及其执行状态
tags: [policy, 约束, 安全]
timestamp: 2026-08-14
---

# 硬约束

> [!todo] 待补充
> 以下条目出自根 `AGENTS.md`。当前为空骨架仓库,无代码/依赖可核实各条的执行情况;约束本身不构成现状冲突。

## 约束清单

| 约束 | 内容 | 核实状态 |
|---|---|---|
| 不改上游 | 不得 fork 或 patch `deepseek-harness`;只依赖 npm 官方发布物(`@deepseek-ai/*`) | 待补充:无依赖清单 |
| 不重写 UI | 渲染层复用官方 Web UI(`client/ui-*` 包),本仓库只实现 host 插件与少量 client 插件 | 待补充:无实现 |
| 版本锁定 | dsh 处于 developer preview(rc 期),依赖必须精确锁定;升级单独进行并验收 | 待补充:无 lockfile |
| 稳定面优先 | 优先官方服务(`webServer` / `agents` / `sessions` / `jobs`)与稳定协议(stdout URL 行、/api Connection、DSH_HOME 布局),少依赖树内内部函数 | 待补充 |
| 安全默认 | 仅 loopback 通信;加载 URL 前校验来源;renderer 不开 nodeIntegration;外链一律交给系统打开 | 待补充 |

## 相关页面

- [项目概览](overview.md)
- [desktop-bundle 模块](../modules/desktop-bundle.md)(host 插件的窗口/托盘/生命周期/更新实现将受安全约束约束)
- [构建与工具链约定](../config/build-tooling.md)(版本锁定与 pnpm 依赖管理关联)
- [目录入口](../index.md)
