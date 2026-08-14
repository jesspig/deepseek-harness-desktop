---
type: Module
title: desktop-profile(规划)
description: dsh.profile 定义(bundles = [dsh-base, desktop-bundle]);目录尚未创建
tags: [profile, bundles, 规划]
timestamp: 2026-08-14
---

# desktop-profile(规划)

> [!todo] 待补充
> 规划路径 `packages/desktop-profile/`,当前不存在。以下内容为 AGENTS.md / README 的规划转述。

## 职责(规划)

- 定义 dsh.profile(上游 profile 组合机制,参考上游 `packages/boot/app-boot`)
- `bundles = [dsh-base, desktop-bundle]`

## 位置与作用(规划)

- M0 阶段由官方 CLI 以 `dsh --profile desktop` 加载(见 [milestones.md](../project/milestones.md))
- 组合 [desktop-bundle](desktop-bundle.md),与官方 dsh-base 一起构成桌面版运行树

## 相关页面

- [desktop-bundle](desktop-bundle.md)
- [里程碑规划](../project/milestones.md)
- [项目概览](../project/overview.md)
- [目录入口](../index.md)
