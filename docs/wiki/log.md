# 更新日志(摘要)

- 2026-08-14 初始化知识库,并写入详细实施方案:新建 `docs/wiki/`,收录项目概览、里程碑规划、硬约束、四个规划模块与工具链约定;基于上游源码与 npm 实况核实 profile/bundle/Web 启动协议,新增 [implementation-plan.md](project/implementation-plan.md),细化 M0 文件级步骤与验收标准。同日完成 [dsh-TUI 社区参考调研](research/dsh-tui-reference.md)(社区插件补位官方无 TUI 的形态验证、`dsh plugin add` 机制、发布模式与对桌面端的启示),并修正 desktop profile 的 bundles 组合为 `[dsh-base, dsh-web-app, desktop-bundle]`(官方 Web UI 依赖 `dsh-web-app` 提供 webServer 与 URL 就绪行)。明细见 [changelog/2026-08-14-log.md](changelog/2026-08-14-log.md)。
