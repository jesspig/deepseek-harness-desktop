# 项目知识库索引

deepseek-harness(`dsh`)桌面端外壳的增量维护知识库。当前仓库处于骨架阶段(M0 未开始),所有模块页面均为规划转述,尚未创建对应目录。

## 项目

- [项目概览](project/overview.md) — 项目定位、当前状态、设计原则
- [里程碑规划](project/milestones.md) — M0 薄壳与 M1+ 进程内组合的形态演进
- [详细实施方案](project/implementation-plan.md) — M0/M1 分阶段实施步骤、上游机制核实结论、验收标准
- [硬约束](project/constraints.md) — 不改上游、版本锁定、安全默认等五项约束

## 模块

- [electron-host(规划)](modules/electron-host.md) — Electron 入口(main / preload),仅进程宿主
- [desktop-bundle(规划)](modules/desktop-bundle.md) — host 插件(窗口/托盘/生命周期/更新)+ cordis.patch.yml
- [desktop-client(规划,可选)](modules/desktop-client.md) — client 插件(IPC 传输、桌面专属 UI)
- [desktop-profile(规划)](modules/desktop-profile.md) — dsh.profile 定义(bundles = [dsh-base, dsh-web-app, desktop-bundle])

## 配置

- [构建与工具链约定](config/build-tooling.md) — 由 .gitignore 反映的 pnpm / Vite / electron-builder / nyc 事实

## 研究

- [dsh-TUI 社区参考调研](research/dsh-tui-reference.md) — dsh-cc-tui 插件调研:形态验证、dsh plugin add 机制、发布模式、对桌面端的启示

## 维护

- [更新日志](log.md) — 更新摘要(最近 7 条)
- 每日明细见 [changelog/2026-08-14-log.md](changelog/2026-08-14-log.md)
