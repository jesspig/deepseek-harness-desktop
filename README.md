# DeepSeek Harness Desktop

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)(`dsh`)的桌面端外壳。

这是一个**独立的 Cordis 应用**:不改动上游仓库,以官方扩展方式(自定义 profile + bundle + Cordis 插件)把 dsh 跑成原生桌面应用。

> 状态: 骨架初始化中(M0 未开始)。上游 dsh 处于 developer preview(0.1.0-rc.x),存在破坏性变更。

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

## 仓库布局(规划)

```text
apps/desktop/            Electron 入口(仅进程宿主,无业务逻辑)
packages/desktop-bundle/ dsh.bundle 包: host 插件(窗口/托盘/生命周期/更新)+ cordis.patch.yml
packages/desktop-client/ client 插件(IPC 传输、桌面专属 UI,可选)
packages/desktop-profile/ dsh.profile 定义(bundles = [dsh-base, dsh-web-app, desktop-bundle])
```

## 上游参考

- 仓库: <https://github.com/deepseek-ai/deepseek-harness>
- 架构: <https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/architecture.md>
- Cordis 入门: <https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/cordis-primer.md>

## License

[MIT](LICENSE)
