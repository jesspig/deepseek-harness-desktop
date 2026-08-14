---
type: Convention
title: 构建与工具链约定
description: 由 .gitignore 反映的 pnpm、Vite、TypeScript、electron-builder、nyc 等工具链事实
resource: ../../../.gitignore
tags: [pnpm, vite, typescript, electron-builder, nyc, tooling]
timestamp: 2026-08-14
---

# 构建与工具链约定

本页事实全部来自根 `.gitignore`(唯一可核实的工具链证据),无 package.json / lockfile 可进一步印证。

## 事实清单

| 工具 | 证据 | 说明 |
|---|---|---|
| pnpm | `.pnpm-store/` | 包管理器;但无 `pnpm-workspace.yaml` / package.json,monorepo 形态待补充 |
| Vite | `.vite/` 段注释 | 前端构建工具 |
| TypeScript | `*.tsbuildinfo` | tsc 增量编译产物 |
| electron-builder | `dist_electron/` 段注释 | 打包分发工具(与 AGENTS.md「pnpm dist」规划互证) |
| nyc(Istanbul) | `coverage/`、`.nyc_output/` | 测试覆盖率工具 |

## 输出目录约定

- `dist/`、`out/`、`release/`、`lib/`、`dist_electron/` 均为构建输出
- `.vite/` 为 Vite 缓存

## 环境与安全约定

- `.env`、`.env.*` 忽略,`.env.example` 白名单保留
- `logs/`、`*.log` 忽略

> [!todo] 待补充
> 无 package.json 与 lockfile,脚本名、依赖版本、workspace 结构均无法核实。

## 相关页面

- [硬约束](../project/constraints.md)(版本锁定与 pnpm 依赖管理关联)
- [项目概览](../project/overview.md)
- [目录入口](../index.md)
