import { Menu, Tray, nativeImage } from "electron";
import * as path from "node:path";

const ICON_PATH = path.join(__dirname, "..", "assets", "icon.png");

export interface AppTrayOptions {
  onShow: () => void;
  onQuit: () => void;
}

export function createAppTray(opts: AppTrayOptions): Tray {
  const tray = new Tray(nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 }));
  tray.setToolTip("DeepSeek Harness Desktop");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开主界面", click: () => opts.onShow() },
      { type: "separator" },
      { label: "退出", click: () => opts.onQuit() },
    ]),
  );
  tray.on("click", () => opts.onShow());
  return tray;
}

export function destroyAppTray(tray: Tray | null): void {
  tray?.destroy();
}
