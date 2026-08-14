import { BrowserWindow, shell } from "electron";

export interface WindowOptions {
  preloadPath: string;
  onOpenExternal: (url: string) => void;
}

export function createAppWindow(url: string, opts: WindowOptions): BrowserWindow {
  if (!isLoopbackUrl(url)) {
    throw new Error(`拒绝加载非 loopback URL: ${url}`);
  }
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: opts.preloadPath,
      // sandbox 保持默认(true):preload 仅用 contextBridge 与沙箱内 process polyfill,无 Node 依赖
    },
  });

  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isExternalHttpUrl(target)) {
      opts.onOpenExternal(target);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, target) => {
    if (isLoopbackUrl(target)) {
      return;
    }
    event.preventDefault();
    if (isExternalHttpUrl(target)) {
      opts.onOpenExternal(target);
    }
  });

  win.loadURL(url).catch((err) => {
    console.error("加载 URL 失败:", err);
  });
  return win;
}

export function isLoopbackUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  if (!parsed.port) {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return host === "127.0.0.1" || host === "localhost";
}

function isExternalHttpUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  return host !== "127.0.0.1" && host !== "localhost";
}

export function openExternal(url: string): void {
  if (!isExternalHttpUrl(url)) {
    return;
  }
  void shell.openExternal(url);
}
