# desktop 模块契约

T2 冻结的模块边界与接口签名,供 T4 / T5 并行实现。接口签名、常量(**不得改动**,下游依赖):

- `URL_LINE_PATTERN`(src/dsh/process.ts):`^dsh web: (http://127\.0\.0\.1:\d+)$`,捕获组即加载 URL(T3 实测,见 docs/wiki/research/upstream-behavior-verify.md)

## 职责矩阵

| 模块 | 职责 | 拥有者 | 依赖 |
| --- | --- | --- | --- |
| `src/main.ts` | 装配:app.whenReady → initLog → createDshProcess+spawn → URL 行 → createAppWindow → installLifecycle;注册 acquireSingletonLock | 共享(仅装配,无业务) | 全部 |
| `src/log.ts` | initLog 落盘到应用数据目录(文件/轮转 T5 细化) | T5 | 无 |
| `src/dsh/process.ts` | spawn(stdio pipe)、逐行解析 stdout、URL 匹配抛事件、stderr 透传日志、stop 优雅终止(SIGTERM→超时 kill) | T4 | log.Log |
| `src/window.ts` | createAppWindow(contextIsolation、nodeIntegration 关、sandbox 默认、加载前 loopback 校验)、isLoopbackUrl 纯函数、openExternal 白名单(https/http 且非 loopback) | T4 | electron |
| `src/lifecycle.ts` | 关窗→优雅终止子进程、子进程意外退出→提示、应用退出→清理 | T5 | dsh/process、log |
| `src/singleton.ts` | acquireSingletonLock(requestSingleInstanceLock + second-instance 回调) | T5 | electron |
| `src/preload.ts` + `src/preload.d.ts` | contextBridge 暴露 `window.dshDesktop.versions`(M0 占位) | 共享 | electron |

## 并行边界

- T4 只触碰 `process.ts`、`window.ts`;T5 只触碰 `lifecycle.ts`、`singleton.ts`、`log.ts`。
- 双方不得互相依赖,只通过 `main.ts` 装配;T5 完成前 `main.ts` 保持抛错占位。
- preload 系 M0 占位,后续任务在现有 `DesktopBridge` 上增量扩展。
