# AGENTS.md

面向在本仓库中工作的 agent 的指引。

## 项目一句话

deepseek-harness(`dsh`)的桌面端外壳:以官方扩展方式(自定义 profile + bundle + Cordis 插件)实现,不改上游仓库。

当前状态:骨架初始化中(M0 未开始),仓库仅含 `README.md`、`AGENTS.md`、`.gitignore`、`LICENSE` 四个文本文件,无源码与依赖清单。

## 硬约束

- **不改上游**: 不得 fork 或 patch `deepseek-harness`。只依赖 npm 官方发布物(`@deepseek-ai/*`)。
- **不重写 UI**: 渲染层复用官方 Web UI(`client/ui-*` 包),本仓库只实现 host 插件与少量 client 插件。
- **版本锁定**: dsh 处于 developer preview(rc 期),依赖必须精确锁定版本;升级单独进行并验收。
- **稳定面优先**: 优先使用官方服务(`webServer` / `agents` / `sessions` / `jobs`)与稳定协议(stdout URL 行、/api Connection、DSH_HOME 布局),少依赖树内内部函数。
- **安全默认**: 仅 loopback 通信;加载 URL 前校验来源;renderer 不开 nodeIntegration;外链一律交给系统打开。

## 仓库布局(规划)

```text
apps/desktop/             Electron 入口(main / preload),无业务逻辑
packages/desktop-bundle/  dsh.bundle 包: host 插件 + cordis.patch.yml
packages/desktop-client/  client 插件(IPC 传输等,可选)
packages/desktop-profile/ dsh.profile 定义(bundles = [dsh-base, desktop-bundle])
```

## 常用命令(规划中)

- `pnpm install` 安装依赖
- `pnpm dev` 开发模式
- `pnpm build` 构建
- `pnpm dist` 打包分发(electron-builder)

## 项目知识库

- 位置: `docs/wiki/`,入口为 `docs/wiki/index.md`,更新摘要见 `docs/wiki/log.md`。
- 格式: 每个概念一个 `.md` 文件,必须含 YAML frontmatter(`type` 必需,同类概念 type 一致);`index.md` 与 `log.md` 为保留文件,不含 frontmatter。
- 更新规则: 增量维护,仅更新受影响页面;按需更新(功能完成 / 交付操作指南 / 提交前),微调不更新;每日明细写入 `docs/wiki/changelog/<YYYY-MM-DD>-log.md`(条目精确到小时),`log.md` 摘要仅保留最近 7 条。
- 事实纪律: 一切内容基于实际源码,严禁推测;规划未实现的内容标注 `> [!todo] 待补充`;页面间用相对路径互链。

## 参考(上游仓库)

- 架构: `docs/architecture.md`
- Cordis 入门: `docs/cordis-primer.md`
- 扩展机制: `packages/boot/app-boot`(profile 组合)、`packages/bundle/*`(bundle 范例)
