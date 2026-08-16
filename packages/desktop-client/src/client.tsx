/**
 * Browser half of the desktop client: contributes one session-header action
 * that opens the current session’s Workspace directory in the host operating
 * system’s default file manager. The path is never user input — it is the
 * canonical directory of the host-side Workspace registry entry the current
 * session belongs to, opened through ctx.workspaces.openPath (host.openPath).
 * On hosts without native path opening (canOpenPath = false) the action hides.
 * @module
 */
import type { ConnectionHandle, HostDescriptionSource, SessionId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls ui-conversation’s SlotMap merge (the header action row) and
// the locale plugin’s Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'

/** Dictionary namespace owned by this plugin. */
export const NS = 'open-workspace'

/** Simplified Chinese dictionary (the key-set source of truth). */
const zh = {
  'action.open': '在文件管理器中打开',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
const en: Record<OpenWorkspaceKey, string> = {
  'action.open': 'Open in File Manager',
}

/** Key domain of the `open-workspace` namespace (zh is the source of truth). */
export type OpenWorkspaceKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Open-workspace-dir action copy. */
    'open-workspace': OpenWorkspaceKey
  }
}

/** Business face injected into the header action. */
export interface OpenWorkspaceDirInjected {
  hooks: {
    /** Generation-scoped host facts; `canOpenPath` gates the native open affordance. */
    hostDescription: HostDescriptionSource
  }
  /** Open a directory with the host’s default file manager. */
  openPath: (path: string) => Promise<void>
}

/** Full props of the registered header action. */
export type OpenWorkspaceDirProps =
  PropsRuntime<'conversation.session.header.actions'>
  & InjectFace<OpenWorkspaceDirInjected>
  & PropsLocale<typeof NS>

/**
 * Resolve the host-side Workspace whose session account contains the current
 * session. The registry path (never arbitrary input) is what we open.
 * @param items - host workspace registry rows.
 * @param sessionId - the current session.
 * @returns the owning Workspace, or undefined when the session is unaccounted.
 */
function workspaceOf(items: readonly WorkspaceView[], sessionId: SessionId): WorkspaceView | undefined {
  return items.find(item => item.sessionIds.includes(sessionId))
}

/**
 * Session-header action: open the current Workspace directory in the host
 * file manager. Renders nothing on heads-up hosts or for unaccounted sessions.
 * @param props - runtime session kit, the injected open action, and the locale seat.
 * @returns the button, or null when the capability or workspace is absent.
 */
export function OpenWorkspaceDirAction({
  sessionId, useWorkspaces, useHostDescription, openPath, t,
}: OpenWorkspaceDirProps) {
  const canOpenPath = useHostDescription(state => state?.canOpenPath === true)
  const workspace = useWorkspaces(state => workspaceOf(state.items, sessionId))
  if (canOpenPath !== true || workspace === undefined) return null
  return (
    <button type="button" onClick={() => { void openPath(workspace.path) }}>
      {t('action.open')}
    </button>
  )
}

/** Required services (cordis fiber inject): the slot registry, locale, and the wire handle. */
export const inject = ['slots', 'locale', 'connection', 'workspaces']

/**
 * Client plugin body: register the dictionaries and the header action.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const connection = ctx.get('connection') as ConnectionHandle
  const openPath = (path: string): Promise<void> => ctx.workspaces.openPath(path)

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'open-workspace-dir: dictionaries')
  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'open-workspace-dir',
      order: 30,
      locale: NS,
      inject: (): OpenWorkspaceDirInjected => ({
        hooks: { hostDescription: connection.hostDescription },
        openPath,
      }),
    }, OpenWorkspaceDirAction),
  )
}