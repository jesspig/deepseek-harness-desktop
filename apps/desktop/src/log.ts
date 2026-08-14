import fs from "fs";
import path from "path";

export interface Log {
  info(msg: string): void;
  error(msg: string, err?: unknown): void;
}

function formatDateStamp(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function initLog(dir: string): Log {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `desktop-${formatDateStamp(new Date())}.log`);

  const writeLine = (level: "INFO" | "ERROR", message: string): void => {
    try {
      fs.appendFileSync(filePath, `[${new Date().toISOString()}] [${level}] ${message}\n`, "utf8");
    } catch {
      // 文件写入失败不抛,console 已兜底输出
    }
  };

  return {
    info(msg: string): void {
      const line = `[${new Date().toISOString()}] [INFO] ${msg}`;
      console.log(line);
      writeLine("INFO", msg);
    },
    error(msg: string, err?: unknown): void {
      let detail = msg;
      if (err instanceof Error) {
        detail = `${msg}\n${err.stack ?? err.message}`;
      } else if (err !== undefined) {
        detail = `${msg}\n${String(err)}`;
      }
      const line = `[${new Date().toISOString()}] [ERROR] ${detail}`;
      console.error(line);
      writeLine("ERROR", detail);
    },
  };
}
