import { Menu, Tray, nativeImage } from "electron";

const ICON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABSSURBVDhP3cyxDYAwFAPRbMgmrE8J4hcpXoKlNBQ56TqfW9uT47zuL90OGMy06ThM2haOkraFo6TtUjw9eHGUtC0cJW0LR0nbjsOZNgMGS/HvPO6uKPqR4mX2AAAAAElFTkSuQmCC";

export interface AppTrayOptions {
  onShow: () => void;
  onQuit: () => void;
}

export function createAppTray(opts: AppTrayOptions): Tray {
  const tray = new Tray(nativeImage.createFromDataURL(ICON_DATA_URL));
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
