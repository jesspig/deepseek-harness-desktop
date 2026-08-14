export interface DesktopBridge {
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
}

declare global {
  interface Window {
    dshDesktop: DesktopBridge;
  }
}

export {};
