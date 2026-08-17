/*** @dsh-desktop/bundle — desktop host 插件(最小占位)
 *
 * 本 bundle 的桌面能力(用系统默认应用打开本地路径)由官方 api-gateway
 * (@deepseek-ai/dsh-host-apiproxy)的 host.openPath 承担。官方网关在 host 侧
 * 通过 native-path-opener 打开路径,不经 shell,并以 PowerShell 单引号转义防范
 * 注入;平台检测由 api-gateway 的 nativeOpen 行负责,Windows/macOS/WSL 下自动
 * 为 true(对应 host.describe().canOpenPath)。桌面端不再需要自研 RPC 打开本地
 * 应用。
 *
 * 本插件仅保留 cordis.patch.yml 注册的 desktop-host 行与未来扩展位:当桌面端
 * 需要宿主侧能力时,在此 apply 内扩展。空 apply 与官方 UI 插件的 node 半一致,
 * 使插件存在于 host cordis.yml / Loader 的注册行中。
 */

import type { Context } from '@deepseek-ai/cordis'

/** Host 插件正文 — 桌面能力由官方 api-gateway 的 host.openPath 承担,无宿主侧行为。 */
export function apply(ctx: Context): void {}

