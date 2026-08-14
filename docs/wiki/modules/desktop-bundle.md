---
type: Module
title: desktop-bundle(已实现,占位)
description: dsh.bundle 包 @dsh-desktop/bundle,host 插件占位 + cordis.patch.yml 声明 dsh.bundle.patch
resource: ../../../packages/desktop-bundle/cordis.patch.yml
tags: [bundle, host-plugin, cordis, 已实现]
timestamp: 2026-08-15
---

# desktop-bundle(已实现,占位)

实现目录:`packages/desktop-bundle/`(包名 `@dsh-desktop/bundle`,版本 `0.1.0-rc.6`,私有)。

## 内容

- `package.json`:`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` 声明 bundle 层身份(官方 bundle 机制);`files: [lib, cordis.patch.yml]`;依赖 `@deepseek-ai/cordis ^4.0.1`;`engines.node ^22.19 || >=24`。
- `cordis.patch.yml`:insert `desktop-host` 行(插件 id 为 `desktop-host`,加载 `@dsh-desktop/bundle`)。
- `src/index.ts`:`desktopHost(ctx)` 仅记录加载日志(`ctx.logger('desktop-host').info(...)`),编译产物 `lib/index.js` 由 `tsc` 生成。

## 职责边界(现状)

- M0 阶段插件仅占位:窗口/单例/外链/生命周期全部在 Electron main 侧实现([electron-host](electron-host.md)),插件无跨进程能力。
- 未来能力(托盘 / 原生通知 / `dsh://` 协议 / 开机自启 / 自动更新)以 Cordis 插件形式扩展,受 [constraints.md](../project/constraints.md) 安全默认约束;M1 进程内组合后与 main 同进程可直接调 Electron API。

## 打包集成

- `pack-dsh.mjs` 将 `@dsh-desktop` scope 实体复制进 `release-resources/node_modules`([build-tooling.md](../config/build-tooling.md));`generate-profile.mjs` 把该包作为 `--bundle` 追加为 profile bundle 层([desktop-profile](desktop-profile.md))。

## 相关页面

- [desktop-profile](desktop-profile.md)
- [electron-host](electron-host.md)
- [硬约束](../project/constraints.md)
- [详细实施方案](../project/implementation-plan.md)
- [目录入口](../index.md)
