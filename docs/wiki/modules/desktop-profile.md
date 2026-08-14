---
type: Module
title: desktop-profile(已实现)
description: dsh.profile 定义:packages/desktop-profile/template/(bundles = [dsh-base, dsh-web-app, @dsh-desktop/bundle])与 generate-profile.mjs 生成流程
resource: ../../../packages/desktop-profile/template/package.json
tags: [profile, bundles, 已实现]
timestamp: 2026-08-15
---

# desktop-profile(已实现)

实现目录:`packages/desktop-profile/`,模板目录 `packages/desktop-profile/template/`。

## 模板内容(template/)

| 文件 | 内容 |
|---|---|
| `package.json` | `dsh.profile.bundles = ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@dsh-desktop/bundle"]`;`dependencies` 精确锁定 `@deepseek-ai/dsh-web-app@0.1.0-rc.6` 与 `@dsh-desktop/bundle`(本地路径链接) |
| `cordis.patch.yml` | profile 用户 patch 层,当前为 `[]`(官方 plugin add 初始化产物) |
| `pnpm-workspace.yaml` | `nodeLinker: hoisted`、`autoInstallPeers: false`、`allowBuilds: koffi: true`(allowBuilds 占位符修复后的产物) |

## bundles 组合说明

- `@deepseek-ai/dsh-base`:每个 profile 的第一层(模型适配、工具、持久化、沙箱、设置、凭据)。
- `@deepseek-ai/dsh-web-app`:**必须包含**——桌面端加载官方 Web UI 依赖它提供的 webServer(127.0.0.1 监听)、浏览器插件名册(`dsh.client` 行)与 `dsh web:` URL 就绪行。
- `@dsh-desktop/bundle`:桌面 host 插件(当前占位),见 [desktop-bundle](desktop-bundle.md)。
- 社区参考:自研 UI 的插件(如 dsh-cc-tui)profile 只需 `[dsh-base, 自身]`;复用官方 Web UI 则必须含 dsh-web-app,见 [dsh-TUI 参考调研](../research/dsh-tui-reference.md)。

## 生成流程(scripts/generate-profile.mjs)

模板由构建机执行一次生成,可重现:

1. 阶段 1:官方 `dsh plugin --profile desktop add @deepseek-ai/dsh-web-app`(初始化 profile + 追加 bundle 层);失败(忽略构建 / 网络并发)转阶段 2。
2. 阶段 2:profile 目录内手动 `pnpm add @deepseek-ai/dsh-web-app@0.1.0-rc.6 --save-exact`(显式版本规避 resolution 网络风暴;失败重试 3 轮间隔 5s)。
3. 阶段 3:对阶段 2 的包再执行官方 `dsh plugin add`(store 已缓存,download 0;reconcile 把带 `dsh.bundle` 声明的包追加为 bundle 层)。
4. 阶段 4:`allowBuilds` 占位符(`set this to true or false`)逐行置为 `true`,重跑 `pnpm install` 完成原生依赖构建。
5. 校验 `dsh.profile.bundles` 与 `cordis.patch.yml` 存在,把清单文件复制到 `--out`(幂等,不含 node_modules)。

## 运行时引导(src/profile.ts)

- `ensureDesktopProfile`:profile 目录缺 `package.json` 时,从模板复制清单文件到 `$DSH_HOME/profiles/desktop/`。
- `ensureProfileLinks`(仅打包模式):把 `resources/node_modules` 下 `@deepseek-ai`、`@dsh-desktop` 包链接进 `$DSH_HOME/profiles/node_modules`(Windows junction / POSIX dir),对应官方 `healProfilesModuleFallback` 逻辑。
- 详见 [electron-host](electron-host.md)。

## 相关页面

- [desktop-bundle](desktop-bundle.md)
- [electron-host](electron-host.md)
- [构建与工具链约定](../config/build-tooling.md)
- [详细实施方案](../project/implementation-plan.md)
- [上游行为实测验证报告](../research/upstream-behavior-verify.md)
- [dsh-TUI 参考调研](../research/dsh-tui-reference.md)
- [目录入口](../index.md)
