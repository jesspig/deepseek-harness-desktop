---
type: Convention
title: 构建与工具链约定
description: pnpm workspace、TypeScript、electron-builder、Node 版本等工具链事实与构建命令
resource: ../../../pnpm-workspace.yaml
tags: [pnpm, typescript, electron-builder, tooling]
timestamp: 2026-08-16
---

# 构建与工具链约定

本页事实来自根 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml` 与 `apps/desktop/*` 配置文件。

## 工具链事实

| 工具 | 版本/配置 | 证据 |
|---|---|---|
| pnpm | workspace(`apps/*`、`packages/*`),`nodeLinker: hoisted`,根 `allowBuilds` 声明 electron / koffi / node-pty / @google/genai / protobufjs 等 | 根 `pnpm-workspace.yaml` |
| Node | `^22.19 \|\| >=24`(根与 desktop-bundle engines) | 根 `package.json`、`packages/desktop-bundle/package.json` |
| TypeScript | `^5.9.3`;strict;`apps/desktop` CommonJS 编译到 `dist/`,`packages/desktop-bundle` nodenext 编译到 `lib/` | `apps/desktop/tsconfig.json`、`packages/desktop-bundle/tsconfig.json` |
| Electron | `43.4.0`(精确锁定) | `apps/desktop/package.json` |
| electron-builder | `^26.0.0`;NSIS 目标;`npmRebuild: false`(原生模块构建机预构建) | `apps/desktop/package.json`、`electron-builder.yml` |
| dsh | `@deepseek-ai/dsh@0.1.0-rc.6`(精确锁定) | `apps/desktop/package.json` |

## 构建命令(根目录)

| 命令 | 作用 |
|---|---|
| `pnpm install` | 安装依赖(根 `allowBuilds` 已声明原生依赖构建许可) |
| `pnpm dev` | `apps/desktop`:tsc 编译 + `electron .`(开发模式用 PATH 中的 dsh) |
| `pnpm build` | tsc 编译 desktop app |
| `pnpm dist` / `pnpm package` | 先构建 `@dsh-desktop/bundle` 与 `@dsh-desktop/client`,再 `pack-dsh.mjs`(复制 dsh 依赖树到 `release-resources/`)+ electron-builder(NSIS 安装包) |

## 打包流水线

1. `scripts/pack-dsh.mjs`:从根 node_modules(hoisted,全实体)不动点收集并复制 dsh 运行所需依赖到 `apps/desktop/release-resources/node_modules`(dereference,删除失效链接与 bundle 包内冗余 node_modules;校验 `@deepseek-ai/dsh` 与 `@dsh-desktop/bundle` 存在,输出体积)。复制时过滤非运行必需文件:`.pdb`/`.map`/`.d.ts`/`.d.mts`/`.ts`/`.mts` 源码与类型声明、C/C++ 源码(`.cc`/`.h` 等)、文档(LICENSE/README/CHANGELOG 等)、node-pty 错误平台 prebuilds(win32-arm64);保留全部 `.js`/`.mjs`/`.cjs`/`.json`/`.node`/`.dll`/`.exe`/`.ttf`/`.wasm`。产物由 245.4MB / 32756 文件降至 **107.9MB / 12195 文件**(启动加速 feature/startup-acceleration)。
2. `electron-builder.yml`:`files: [dist/**, package.json, assets/**]` 进 asar(assets 含品牌图标 icon.png);`win.icon: assets/icon.png` 生成 exe 图标;`extraResources` 把 `release-resources/node_modules` 映射到安装目录 `resources/node_modules`,把 `packages/desktop-profile/template` 映射到 `resources/template`。
3. 产物:`build/release/DeepSeek Harness Desktop Setup <version>.exe`(NSIS,oneClick 关闭,允许自选安装目录;`build/release/win-unpacked/` 为免安装版;electron-builder 输出目录由 `apps/desktop/electron-builder.yml` 的 `directories.output: ../../build/release` 指向仓库根 `build/` 下)。

## 运行时依赖解析约定

- 打包版 dsh 树放 `resources/node_modules`(asar 内无法承载原生模块,故 dsh 不进 asar,应用自身代码才进 asar)。
- profile 模板不含 node_modules;运行时由 `src/profile.ts` 复制模板清单,并在打包模式建立 `$DSH_HOME/profiles/node_modules` 的 Junction 链接([desktop-profile](../modules/desktop-profile.md))。
- 模板由 `scripts/generate-profile.mjs` 经官方 `dsh plugin add` 机制生成(两阶段规避 Windows 网络崩溃,见 [upstream-behavior-verify.md](../research/upstream-behavior-verify.md))。

## 相关页面

- [硬约束](../project/constraints.md)(版本锁定)
- [desktop-profile 模块](../modules/desktop-profile.md)
- [electron-host 模块](../modules/electron-host.md)
- [项目概览](../project/overview.md)
- [目录入口](../index.md)