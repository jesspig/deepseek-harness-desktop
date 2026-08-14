---
type: Module
title: desktop-profile(规划)
description: dsh.profile 定义(bundles = [dsh-base, dsh-web-app, desktop-bundle]);目录尚未创建
tags: [profile, bundles, 规划]
timestamp: 2026-08-14
---

# desktop-profile(规划)

> [!todo] 待补充
> 规划路径 `packages/desktop-profile/`,当前不存在。以下内容为 AGENTS.md / README 的规划转述。

## 职责(规划)

- 定义 dsh.profile(上游 profile 组合机制,参考上游 `packages/boot/app-boot`)
- `bundles = [dsh-base, dsh-web-app, desktop-bundle]`(顺序即叠加顺序)

## bundles 组合说明

- `@deepseek-ai/dsh-base`:每个 profile 的第一层(模型适配、工具、持久化、沙箱、设置、凭据)。
- `@deepseek-ai/dsh-web-app`:**必须包含**——桌面端加载官方 Web UI 依赖它提供的 webServer(127.0.0.1 监听)、浏览器插件名册(`dsh.client` 行)与 `dsh web:` URL 就绪行;官方 `web` profile 模板即为 `[dsh-base, dsh-web-app]`。
- `<desktop-bundle>`:桌面专属 host 插件(托盘/通知/生命周期/更新,实施时定范围),见 [desktop-bundle](desktop-bundle.md)。
- 社区参考:自研 UI 的插件(如 dsh-cc-tui)profile 只需 `[dsh-base, 自身]`;复用官方 Web UI 则必须含 dsh-web-app,见 [dsh-TUI 参考调研](../research/dsh-tui-reference.md)。

## 位置与作用(规划)

- M0 阶段由官方 CLI 以 `dsh --profile desktop` 加载(见 [milestones.md](../project/milestones.md))
- 组合 [desktop-bundle](desktop-bundle.md) 与官方 dsh-base / dsh-web-app,构成桌面版运行树

## 相关页面

- [desktop-bundle](desktop-bundle.md)
- [里程碑规划](../project/milestones.md)
- [项目概览](../project/overview.md)
- [dsh-TUI 参考调研](../research/dsh-tui-reference.md)
- [目录入口](../index.md)
