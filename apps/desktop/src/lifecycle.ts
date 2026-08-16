import { app } from "electron";
import type { BrowserWindow, Event } from "electron";
import type { DshProcess } from "./dsh/process";
import type { Log } from "./log";

export interface LifecycleHooks {
  onChildExit: (code: number | null, signal: string | null) => void;
  log: Log;
}

export function installLifecycle(opts: {
  window: BrowserWindow;
  process: DshProcess;
  hooks: LifecycleHooks;
}): { dispose(): void } {
  const { window, hooks } = opts;

  let stopping = false;
  let stopDone = false;
  let quitting = false;
  let disposed = false;

  const stopProcess = async (): Promise<void> => {
    if (stopping) {
      return;
    }
    stopping = true;
    try {
      await opts.process.stop();
    } catch (err) {
      hooks.log.error("停止 dsh 子进程失败", err);
    } finally {
      stopDone = true;
    }
  };

  const quitOnce = (): void => {
    if (quitting) {
      return;
    }
    quitting = true;
    app.quit();
  };

  // 窗口 close 已被 main 拦截为隐藏,closed 不再发生(除非退出时);退出由 main 的 quitApp 负责
  const onChildExit = (code: number | null, signal: string | null): void => {
    if (window.isDestroyed() || quitting) {
      return;
    }
    hooks.onChildExit(code, signal);
    quitOnce();
  };

  void opts.process.exited.then((code) => onChildExit(code, null)).catch(() => {});

  // 兜底:防漏,幂等;与 main 的 before-quit 共存
  const onBeforeQuit = (event: Event): void => {
    if (stopDone || quitting) {
      return;
    }
    event.preventDefault();
    void stopProcess().then(() => quitOnce());
  };

  const onWillQuit = (): void => {
    dispose();
  };

  app.on("before-quit", onBeforeQuit);
  app.on("will-quit", onWillQuit);

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    app.removeListener("before-quit", onBeforeQuit);
    app.removeListener("will-quit", onWillQuit);
  }

  return { dispose };
}
