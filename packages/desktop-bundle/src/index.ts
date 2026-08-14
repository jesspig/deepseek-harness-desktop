import type { Context } from '@deepseek-ai/cordis'

export default function desktopHost(ctx: Context): void {
  ctx.logger('desktop-host').info('[desktop-bundle] host plugin loaded')
}
