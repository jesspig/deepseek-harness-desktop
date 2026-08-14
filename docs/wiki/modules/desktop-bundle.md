---
type: Module
title: desktop-bundle(规划)
description: dsh.bundle 包,host 插件(窗口/托盘/生命周期/更新)+ cordis.patch.yml;目录尚未创建
tags: [bundle, host-plugin, cordis, 规划]
timestamp: 2026-08-14
---

# desktop-bundle(规划)

> [!todo] 待补充
> 规划路径 `packages/desktop-bundle/`,当前不存在。以下内容为 AGENTS.md / README 的规划转述。

## 职责(规划)

- dsh.bundle 包(上游 bundle 机制,参考上游 `packages/bundle/*`)
- host 插件:窗口、托盘、生命周期、自动更新
- 随包提供 `cordis.patch.yml`(对 dsh-base 的补丁式配置)

## 位置与作用(规划)

- 被 [desktop-profile](desktop-profile.md) 以 `bundles = [dsh-base, dsh-web-app, desktop-bundle]` 引用
- 与 [electron-host](electron-host.md) 配合完成桌面外壳能力
- 桌面能力(窗口、托盘、原生通知、`dsh://` 协议、开机自启、自动更新)一律以插件形式实现,受 [constraints.md](../project/constraints.md) 安全默认约束

## 相关页面

- [desktop-profile](desktop-profile.md)
- [electron-host](electron-host.md)
- [硬约束](../project/constraints.md)
- [项目概览](../project/overview.md)
- [目录入口](../index.md)
