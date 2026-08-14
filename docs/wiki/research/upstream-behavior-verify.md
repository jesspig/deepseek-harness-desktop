---
type: Research
title: 上游行为实测验证报告
description: T3 任务实测结论:URL 就绪行格式、--port 0 语义、dsh plugin add 机制、bundle 层追加行为、Windows 环境注意点
tags: [research, verify, cli, profile, bundle, windows]
timestamp: 2026-08-15
sources:
  - npm @deepseek-ai/dsh 0.1.0-rc.6 本机实测(Windows 11 / Node v24.15.0 / pnpm 11.17.0)
---

# 上游行为实测验证报告

> T3 实测日期 2026-08-14,环境:Windows 11,Node v24.15.0,pnpm 11.17.0,`@deepseek-ai/dsh@0.1.0-rc.6`(精确锁定)。**全部结论均有本机运行输出为依据**。

## 1. CLI 面(实测)

- `dsh --version` → `0.1.0-rc.6`。
- 顶层选项:`--profile <name>`、`--patch <path>`(可重复)、`--dump-config`、`--dump-default-config`。
- 命令:`web`(= `--profile web` 别名)、`plugin`(转发剩余参数给 profile 目录内的 pnpm)。
- `dsh --profile web --help` 确认:`--port <port>` "pass 0 to let the OS pick a free one";`--trusted-host <authority...>` 可重复;`--host` 存在但官方文档说明 web 面绑定默认 loopback。

## 2. URL 就绪行(实测)

运行 `dsh --profile web --port 0`(首次运行,自动初始化 web 模板),stdout 唯一行:

```
dsh web: http://127.0.0.1:6229
```

- 格式:`dsh web: ` + `http://127.0.0.1:<port>`,host 恒为 `127.0.0.1`(loopback)。
- `--port 0` 实测生效(端口 6229 为 OS 随机分配)。
- M0 解析正则基准:`^dsh web: (http://127\.0\.0\.1:\d+)$`,捕获组即加载 URL。
- stderr 无输出;加载完成后进程常驻等待(验证时手动 Kill)。

## 3. profile 模板(实测)

- web 模板自动初始化到 `$DSH_HOME/profiles/web/`(本次验证用临时 DSH_HOME),manifest:

```json
{
  "name": "dsh-profile-web",
  "dependencies": {},
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } }
}
```

- profile 目录含 `cordis.patch.yml`(初始化为 `[]`)、`cordis.yml`、`pnpm-workspace.yaml`。
- 旧环境(用户本机 `~/.dsh`,由更早版本 pnpm 初始化)的 `pnpm-workspace.yaml` 仅有 `packages/nodeLinker/autoInstallPeers` 三项;新环境由 dsh 生成的额外含 `minimumReleaseAgeExclude` 与 `allowBuilds`。

## 4. dsh plugin add 机制(实测)

`dsh plugin --profile test add <pkg>`:

- 首步自动初始化 profile(manifest `dsh.profile.bundles = ["@deepseek-ai/dsh-base"]`,`cordis.patch.yml = []`)。
- 自动生成 `pnpm-workspace.yaml`:`nodeLinker: hoisted`、`autoInstallPeers: false`、`minimumReleaseAgeExclude`(@deepseek-ai 全套 rc.6 包)、`allowBuilds`(pnpm 11 被忽略构建脚本自动以占位符 `set this to true or false` 写入)。
- **无 `dsh.bundle` 声明的包**:`dsh-message-feedback@0.0.1-rc.2` 安装为普通 dependency,并输出警告 `declares no dsh.bundle — installed as a plain dependency, not a profile layer`;manifest bundles 不变。
- **有 `dsh.bundle` 声明的包**:`@deepseek-ai/dsh-web-app@0.1.0-rc.6` 安装后 manifest bundles 自动追加为 `["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]`(警告消失)。**bundle 层追加机制实测成立**。
- `$DSH_HOME/profiles/node_modules` 为 Junction(Windows 符号链接),由官方 `healProfilesModuleFallback` 维护。

## 5. Windows 环境注意点(实测)

- **pnpm 11 默认阻止依赖构建脚本**:koffi 等原生包触发 `ERR_PNPM_IGNORED_BUILDS`,导致 `dsh plugin add` 失败退出。修复:profile 的 `pnpm-workspace.yaml` 中 `allowBuilds: koffi: true`(占位符必须手动置为 `true`)。构建机与打包分发均需处理此点。
- 偶发 registry 网络错误(`UND_ERR_DESTROYED`)与 libuv 断言(`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c`):网络抖动所致,重试或直接在 profile 目录内 `pnpm add` 可恢复;与 dsh 机制无关。
- 手动 `pnpm add` 到 profile 目录**不会**更新 manifest bundles(仅 `dsh plugin add` 更新)。

## 6. --dump-config(实测)

`dsh --profile test --dump-config` 输出组合树,含 `web-startup`(`@deepseek-ai/dsh-web-app/startup`)、`webserver`(`host: !!js ctx.webStartup.host ?? '127.0.0.1'`、`port: !!js ctx.webStartup.port ?? 3080`)、`web-runtime`(`printUrl: true`)行 —— 自定义 profile + plugin add 追加 web-app 的组合路径成立。

## 7. 对实施的影响(均已落地)

以下为 T3 实测时对后续任务的影响结论,均已随 M0 实施落地,对应实现见 [implementation-plan.md](../project/implementation-plan.md):

- URL 解析器按 2 节格式实现(`apps/desktop/src/dsh/process.ts` 的 `URL_LINE_PATTERN`),URL 校验仅接受 `127.0.0.1`([electron-host](../modules/electron-host.md))。
- profile 生成脚本复用 `dsh plugin add` 官方机制(含 allowBuilds 修复步骤),即 `apps/desktop/scripts/generate-profile.mjs`;两阶段策略规避 Windows 网络崩溃(见 [desktop-profile](../modules/desktop-profile.md))。
- desktop-bundle 声明 `dsh.bundle.patch` 成为 profile layer(实测 4 节),见 [desktop-bundle](../modules/desktop-bundle.md)。
- 打包分发:profile 模板预生成(构建机执行 plugin add 并修复 allowBuilds),首启复制;运行时由 Electron 内置 Node 以 `ELECTRON_RUN_AS_NODE` 执行 dsh(`pack-dsh.mjs` + `electron-builder.yml`,见 [build-tooling.md](../config/build-tooling.md))。

## 相关页面

- [详细实施方案](../project/implementation-plan.md)
- [dsh-TUI 社区参考调研](dsh-tui-reference.md)
- [目录入口](../index.md)
