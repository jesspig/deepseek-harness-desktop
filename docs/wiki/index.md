# 项目知识库索引

deepseek-harness(`dsh`)桌面端外壳的增量维护知识库。当前状态:**M0 薄壳已实施完成并通过验收**(双击启动 → 窗口加载官方 Web UI;URL loopback 校验;关窗无残留;崩溃提示与日志;单例锁;NSIS 安装包),待用户验证项为配置 API Key 后的对话全链路。

## 项目

- [项目概览](project/overview.md) — 项目定位、当前状态、设计原则
- [里程碑规划](project/milestones.md) — M0(已完成)与 M1+(规划)两阶段的形态演进
- [详细实施方案](project/implementation-plan.md) — 上游机制核实结论、M0 实施要点与验收结果、M1 规划
- [硬约束](project/constraints.md) — 不改上游、版本锁定、安全默认等五项约束及其落地状态

## 模块

- [electron-host(已实现)](modules/electron-host.md) — Electron 入口(main / preload):spawn dsh、URL 行解析、窗口、生命周期、单例、日志、profile 引导
- [desktop-bundle(已实现,占位)](modules/desktop-bundle.md) — @dsh-desktop/bundle:host 插件占位 + cordis.patch.yml
- [desktop-client(未实现)](modules/desktop-client.md) — client 插件(IPC 传输、桌面专属 UI,可选,规划中)
- [desktop-profile(已实现)](modules/desktop-profile.md) — dsh.profile 定义与模板生成流程(bundles = [dsh-base, dsh-web-app, @dsh-desktop/bundle])

## 配置

- [构建与工具链约定](config/build-tooling.md) — pnpm workspace / TypeScript / electron-builder 工具链事实与打包流水线

## 研究

- [dsh-TUI 社区参考调研](research/dsh-tui-reference.md) — dsh-cc-tui 插件调研:形态验证、dsh plugin add 机制、发布模式、对桌面端的启示
- [上游行为实测验证报告](research/upstream-behavior-verify.md) — T3 实测:URL 就绪行格式、plugin add 的 bundle 层追加、Windows pnpm 11 注意点

## 维护

- [更新日志](log.md) — 更新摘要(最近 7 条)
- 每日明细见 [changelog/2026-08-15-log.md](changelog/2026-08-15-log.md)(含 2026-08-14)
