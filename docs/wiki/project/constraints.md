---
type: Policy
title: 硬约束
description: 不改上游、不重写 UI、版本锁定、稳定面优先、安全默认五项硬约束及其落地状态
tags: [policy, 约束, 安全]
timestamp: 2026-08-15
---

# 硬约束

## 约束清单

| 约束 | 内容 | 落地状态 |
|---|---|---|
| 不改上游 | 不得 fork 或 patch `deepseek-harness`;只依赖 npm 官方发布物(`@deepseek-ai/*`) | 已落实:仓库无上游代码副本,依赖全部来自 npm(`apps/desktop/package.json`、`pnpm-lock.yaml`) |
| 不重写 UI | 渲染层复用官方 Web UI(`client/ui-*` 包),本仓库只实现 host 插件与少量 client 插件 | 已落实:M0 直接加载官方 Web UI(URL 就绪行指向官方 web-runtime);host 插件仅占位 |
| 版本锁定 | dsh 处于 developer preview(rc 期),依赖必须精确锁定;升级单独进行并验收 | 已落实:`@deepseek-ai/dsh@0.1.0-rc.6`、`@deepseek-ai/dsh-web-app@0.1.0-rc.6`、`electron@43.4.0` 均精确锁定(`apps/desktop/package.json`、`packages/desktop-profile/template/package.json`) |
| 稳定面优先 | 优先官方服务(`webServer` / `agents` / `sessions` / `jobs`)与稳定协议(stdout URL 行、/api Connection、DSH_HOME 布局),少依赖树内内部函数 | 已落实:仅消费 stdout URL 就绪行与 `--port 0` 官方语义([electron-host](../modules/electron-host.md)) |
| 安全默认 | 仅 loopback 通信;加载 URL 前校验来源;renderer 不开 nodeIntegration;外链一律交给系统打开 | 已落实:URL 就绪行正则限 `127.0.0.1`;`isLoopbackUrl` 加载前校验;`contextIsolation: true` / `nodeIntegration: false`;`setWindowOpenHandler` + `will-navigate` 拦截,外链走 `shell.openExternal` |

## 执行说明

- 安全约束的具体实现见 [electron-host](../modules/electron-host.md)(`src/window.ts` 的 loopback 校验与外链白名单、`src/dsh/process.ts` 的 URL 行解析)。
- 版本锁定的具体锁定值见 [build-tooling.md](../config/build-tooling.md)。

## 相关页面

- [项目概览](overview.md)
- [electron-host 模块](../modules/electron-host.md)
- [构建与工具链约定](../config/build-tooling.md)
- [目录入口](../index.md)
