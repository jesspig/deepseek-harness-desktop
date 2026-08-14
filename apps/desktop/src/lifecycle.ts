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

  const onWindowClosed = (): void => {
    void stopProcess().then(() => quitOnce());
  };

  const onChildExit = (code: number | null, signal: string | null): void => {
    if (window.isDestroyed() || quitting) {
      return;
    }
    hooks.log.error(`dsh 子进程意外退出 (code=${code}, signal=${signal})`);
    hooks.onChildExit(code, signal);
    quitOnce();
  };

  void opts.process.exited.then((code) => onChildExit(code, null)).catch(() => {});

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

  window.on("closed", onWindowClosed);
  app.on("before-quit", onBeforeQuit);
  app.on("will-quit", onWillQuit);

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    window.removeListener("closed", onWindowClosed);
    app.removeListener("before-quit", onBeforeQuit);
    app.removeListener("will-quit", onWillQuit);
  }

  return { dispose };
}
