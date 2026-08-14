import { app } from "electron";

export function acquireSingletonLock(appName: string): {
  hasLock: boolean;
  onSecondInstance: (cb: () => void) => void;
} {
  const hasLock = app.requestSingleInstanceLock();
  return {
    hasLock,
    onSecondInstance(cb: () => void): void {
      if (!hasLock) {
        return;
      }
      app.on("second-instance", cb);
    },
  };
}
