# DeepSeek Harness Desktop

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh`)的桌面端外壳。

这是一个**独立的 Cordis 应用**:不改动上游仓库,以官方扩展方式(自定义 profile + bundle + Cordis 插件)把 dsh 跑成原生桌面应用。

> 状态: M0 薄壳已实施完成并通过验收(双击启动 → 窗口加载官方 Web UI;URL loopback 校验;关窗无残留;崩溃提示与日志;单例锁;NSIS 安装包)。待用户验证:配置 API Key 后的对话全链路。上游 dsh 处于 developer preview(0.1.0-rc.x),存在破坏性变更,依赖已精确锁定。

## 设计原则

- **复用,不重写**: 渲染层直接复用 dsh 官方 Web UI(client 插件体系),本仓库只实现桌面专属部分。
- **零 fork**: 只依赖 npm 官方发布物(`@deepseek-ai/*`),不修改上游仓库。
- **桌面能力即插件**: 窗口、托盘、原生通知、`dsh://` 协议、开机自启、自动更新,全部以 Cordis 插件实现。
- **按上游预留形态演进**: 传输层遵循上游 `AbstractApiClient.doFetch` 预留的 IPC bridge 形态,渲染进程可经 IPC 直连树内 apiproxy,不依赖 HTTP。

## 规划形态

| 阶段 | 形态 |
|---|---|
| M0 | 薄壳:spawn 官方 CLI(`dsh --profile desktop --port 0`),解析 URL,开窗加载 Web UI |
| M1+ | 进程内组合:Electron main 直接 boot Cordis 树,renderer 经 IPC bridge 通信 |

## 仓库布局(现状)

```text
apps/desktop/            Electron 入口(spawn dsh、URL 行解析、窗口、生命周期、单例、日志、profile 引导;scripts/ 打包脚本)
packages/desktop-bundle/ dsh.bundle 包(@dsh-desktop/bundle):host 插件占位 + cordis.patch.yml
packages/desktop-client/ client 插件(IPC 传输、桌面专属 UI,可选,未实现)
packages/desktop-profile/ dsh.profile 定义(template/:bundles = [dsh-base, dsh-web-app, @dsh-desktop/bundle])
```

## 已知限制

- **Windows 下 dsh 转发 pnpm 的网络并发崩溃**:`dsh plugin ... add <pkg>` 在 Windows 上以 `spawnSync("pnpm", {shell:true})` 转发 pnpm,无 lockfile 全量 resolution 需高并发网络下载时,会触发 libuv 断言崩溃(`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`,退出码 -1073740791)。实测手动 spawn pnpm(不经 dsh 转发)在相同环境稳定成功,故 `apps/desktop/scripts/generate-profile.mjs` 采用两阶段策略:先走官方 `dsh plugin add`;遇网络崩溃或忽略构建失败即转本脚本手动 `pnpm add --save-exact`(失败重试 3 轮,间隔 5 秒);依赖进 store 缓存后再补一次官方 `dsh plugin add` 完成 reconcile(此时 download 0,稳定成功,且将带 `dsh.bundle` 声明的包追加为 bundle 层)。
- **手动安装必须显式版本**:阶段 2 的 `pnpm add` 若不带版本号(如 `pnpm add @deepseek-ai/dsh-web-app`),pnpm 会对该包全部版本做 resolution(200+ 并发元数据请求),触发网络风暴失败(`UND_ERR_DESTROYED` + libuv 断言)。脚本内 `@deepseek-ai/dsh-web-app` 固定使用 `@0.1.0-rc.6`(与仓库全局版本锁定策略一致),仅 `--bundle` 传入的本地目录路径例外(路径不含版本,pnpm 按目录链接,无 resolution 风暴;脚本内部将该目录路径统一绝对化,避免相对 profile 目录的解析歧义)。

## 上游参考

- 仓库: <https://github.com/deepseek-ai/deepseek-harness>
- 架构: <https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/architecture.md>
- Cordis 入门: <https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/cordis-primer.md>

## License

[MIT](LICENSE)
