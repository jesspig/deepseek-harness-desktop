import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { app, dialog, type BrowserWindow, type Tray } from "electron";
import { createAppTray, destroyAppTray } from "./tray";
import { URL_LINE_PATTERN, createDshProcess, type DshProcess } from "./dsh/process";
import { ensureDesktopProfile, ensureProfileLinks } from "./profile";
import { createSplashWindow, loadMainUrl, openExternal } from "./window";
import { initLog, type Log } from "./log";
import { installLifecycle } from "./lifecycle";
import { acquireSingletonLock } from "./singleton";

export function main(): void {
  const dshPath = process.env.DSH_DESKTOP_DSH_PATH ?? "dsh";
  const profile = "desktop";
  const dshHome = path.resolve(process.env.DSH_HOME ?? path.join(os.homedir(), ".dsh"));
  let tray: Tray | null = null;
  let dshProcess: DshProcess;
  let lifecycleDispose: { dispose(): void } | null = null;

  app.whenReady().then(() => {
    // 窗口先行:第一行同步创建 splash 窗口,不等待后端就绪
    const t0 = Date.now();
    let quitting = false;
    let win: BrowserWindow | null = createSplashWindow({
      preloadPath: path.join(__dirname, "preload.js"),
      onOpenExternal: openExternal,
    });
    const t1 = Date.now();
    // 关窗拦截为隐藏:应用常驻,不销毁窗口(退出走 quitApp)
    win.on("close", (e) => {
      if (!quitting) {
        e.preventDefault();
        win?.hide();
      }
    });

    const ccDir = path.join(app.getPath("userData"), "node-compile-cache");
    fs.mkdirSync(ccDir, { recursive: true });
    process.env.NODE_COMPILE_CACHE ??= ccDir;

    const log: Log = initLog(path.join(app.getPath("userData"), "logs"));
    log.info("启动打点:窗口创建完成 elapsed=" + (t1 - t0) + "ms");
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

    const singleton = acquireSingletonLock(app.getName());
    log.info("单例锁获取: " + singleton.hasLock);
    if (!singleton.hasLock) {
      log.info("已有实例在运行,本实例退出");
      quitting = true;
      app.quit();
      return;
    }
    singleton.onSecondInstance(() => {
      if (win) {
        win.show();
        win.focus();
      }
    });

    tray = createAppTray({
      onShow: () => {
        if (win) {
          win.show();
          win.focus();
        }
      },
      onQuit: quitApp,
    });

    // 退出路径:置 quitting 放行窗口 close 销毁,并停 dsh 子进程后退出(stop 幂等)
    function quitApp(): void {
      quitting = true;
      destroyAppTray(tray);
      tray = null;
      void dshProcess?.stop().then(() => app.quit());
    }

    function onChildExit(code: number | null, signal: string | null): void {
      if (!win || quitting) {
        return;
      }
      log.info("子进程退出 code=" + code + " signal=" + signal);
      dialog.showErrorBox(
        "dsh 进程已退出",
        `dsh 进程意外退出,code=${code} signal=${signal}`,
      );
      quitApp();
    }

    function openMain(url: string): void {
      if (!win) {
        return;
      }
      win.webContents.on("did-start-loading", () => {
        log.info("启动打点:前端加载开始 elapsed=" + (Date.now() - t0) + "ms");
      });
      win.webContents.on("did-finish-load", () => {
        log.info("启动打点:前端加载完成 elapsed=" + (Date.now() - t0) + "ms");
      });
      loadMainUrl(win, url);
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
          const url = match[1];
          log.info("启动打点:URL 就绪 elapsed=" + (Date.now() - t0) + "ms url=" + url);
          openMain(url);
        }
      },
      onStderrLine: (line) => log.error(line),
      log,
    });
    dshProcess.exited.catch((err) => {
      dialog.showErrorBox("dsh 启动失败", err instanceof Error ? err.message : String(err));
      quitApp();
    });
    log.info(
      "spawn dsh: " + dshPath + (runAsNode ? " (runAsNode " + runAsNode.entry + ")" : ""),
    );
    dshProcess.spawn();
    log.info("dsh 子进程已启动");
  });

  // 常驻:关窗被拦截为隐藏,窗口不销毁,退出走 quitApp
  app.on("window-all-closed", () => {});

  app.on("before-quit", () => {
    if (!lifecycleDispose) {
      void dshProcess?.stop();
    }
  });
}

if (require.main === module) {
  main();
}
