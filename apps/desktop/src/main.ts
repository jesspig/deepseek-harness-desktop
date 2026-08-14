import os from "node:os";
import path from "node:path";
import { app, dialog, type BrowserWindow } from "electron";
import { URL_LINE_PATTERN, createDshProcess, type DshProcess } from "./dsh/process";
import { ensureDesktopProfile, ensureProfileLinks } from "./profile";
import { createAppWindow, openExternal } from "./window";
import { initLog, type Log } from "./log";
import { installLifecycle } from "./lifecycle";
import { acquireSingletonLock } from "./singleton";

export function main(): void {
  const dshPath = process.env.DSH_DESKTOP_DSH_PATH ?? "dsh";
  const profile = "desktop";
  const dshHome = path.resolve(process.env.DSH_HOME ?? path.join(os.homedir(), ".dsh"));

  app.whenReady().then(() => {
    const log: Log = initLog(path.join(app.getPath("userData"), "logs"));
    log.info(
      "应用就绪, profile=" + profile + ", dshHome=" + dshHome + ", packaged=" + app.isPackaged,
    );

    const runAsNode = app.isPackaged
      ? {
          executable: app.getPath("exe"),
          entry: path.join(
            process.resourcesPath,
            "node_modules",
            "@deepseek-ai",
            "dsh",
            "lib",
            "bin.js",
          ),
        }
      : undefined;
    const templateDir = app.isPackaged
      ? path.join(process.resourcesPath, "template")
      : path.join(app.getAppPath(), "..", "..", "packages", "desktop-profile", "template");
    const packagesRoot = app.isPackaged
      ? path.join(process.resourcesPath, "node_modules")
      : path.join(app.getAppPath(), "node_modules");

    ensureDesktopProfile({ dshHome, templateDir, packagesRoot });
    if (app.isPackaged) {
      ensureProfileLinks({ dshHome, templateDir, packagesRoot });
    }
    log.info("profile 引导完成");

    let win: BrowserWindow | null = null;
    let dshProcess: DshProcess;
    let lifecycleDispose: { dispose(): void } | null = null;

    const singleton = acquireSingletonLock(app.getName());
    log.info("单例锁获取: " + singleton.hasLock);
    if (!singleton.hasLock) {
      log.info("已有实例在运行,本实例退出");
      app.quit();
      return;
    }
    singleton.onSecondInstance(() => {
      win?.focus();
    });

    function onChildExit(code: number | null, signal: string | null): void {
      if (!win) {
        return;
      }
      log.info("子进程退出 code=" + code + " signal=" + signal);
      dialog.showErrorBox(
        "dsh 进程已退出",
        `dsh 进程意外退出,code=${code} signal=${signal}`,
      );
      app.quit();
    }

    function openWindow(url: string): void {
      if (win) {
        return;
      }
      win = createAppWindow(url, {
        preloadPath: path.join(__dirname, "preload.js"),
        onOpenExternal: openExternal,
      });
      lifecycleDispose = installLifecycle({
        window: win,
        process: dshProcess,
        hooks: { onChildExit, log },
      });
      win.on("closed", () => {
        win = null;
        lifecycleDispose?.dispose();
        lifecycleDispose = null;
      });
    }

    dshProcess = createDshProcess({
      dshPath,
      profile,
      dshHome,
      runAsNode,
      onStdoutLine: (line) => {
        const match = URL_LINE_PATTERN.exec(line);
        if (match) {
          log.info("URL 就绪: " + match[1]);
          openWindow(match[1]);
        }
      },
      onStderrLine: (line) => log.error(line),
      log,
    });
    dshProcess.exited.catch((err) => {
      dialog.showErrorBox("dsh 启动失败", err instanceof Error ? err.message : String(err));
      app.quit();
    });
    log.info(
      "spawn dsh: " + dshPath + (runAsNode ? " (runAsNode " + runAsNode.entry + ")" : ""),
    );
    dshProcess.spawn();
    log.info("dsh 子进程已启动");
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

if (require.main === module) {
  main();
}
