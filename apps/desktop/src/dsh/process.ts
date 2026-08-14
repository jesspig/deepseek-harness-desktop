import { spawn, type ChildProcess } from "node:child_process";
import type { Log } from "../log";

export const URL_LINE_PATTERN = /^dsh web: (http:\/\/127\.0\.0\.1:\d+)$/;

export interface DshProcessOptions {
  dshPath: string;
  profile: string;
  dshHome: string;
  runAsNode?: { executable: string; entry: string };
  args?: string[];
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
  onExit?: (code: number | null, signal: string | null) => void;
  log: Log;
}

export interface DshProcess {
  spawn(): void;
  stop(): Promise<void>;
  readonly exited: Promise<number | null>;
}

const STOP_GRACE_MS = 5_000;

export function createDshProcess(opts: DshProcessOptions): DshProcess {
  return new DshProcessImpl(opts);
}

class DshProcessImpl implements DshProcess {
  readonly exited: Promise<number | null>;

  private child: ChildProcess | null = null;
  private stdoutBuffer = "";
  private stderrBuffer = "";
  private exitInfo: { code: number | null; signal: string | null } | null = null;
  private settled = false;
  private stopPromise: Promise<void> | null = null;
  private resolveExit!: (code: number | null) => void;
  private rejectExit!: (err: Error) => void;

  constructor(private readonly opts: DshProcessOptions) {
    this.exited = new Promise((resolve, reject) => {
      this.resolveExit = resolve;
      this.rejectExit = reject;
    });
  }

  spawn(): void {
    if (this.child) {
      throw new Error("dsh 进程已启动,不能重复 spawn");
    }
    const child = this.opts.runAsNode
      ? spawn(
          this.opts.runAsNode.executable,
          [
            // Electron(ELECTRON_RUN_AS_NODE)下 node-addon-require-builtin 原生模块不可用
            // (realm 限制,无 GetAlignedPointerFromEmbedderData),cordis-plugin-hmr 获取
            // ctx.loader.internal 需走 execArgv 含 --expose-internals 的 require 路径,
            // 故显式前置该 node flag;dev 模式系统 node 走原生模块路径,无需此 flag
            "--expose-internals",
            this.opts.runAsNode.entry,
            "--profile",
            this.opts.profile,
            "--port",
            "0",
            ...(this.opts.args ?? []),
          ],
          {
            env: {
              ...process.env,
              DSH_HOME: this.opts.dshHome,
              ELECTRON_RUN_AS_NODE: "1",
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        )
      : spawn(
          this.opts.dshPath,
          ["--profile", this.opts.profile, "--port", "0", ...(this.opts.args ?? [])],
          {
            env: { ...process.env, DSH_HOME: this.opts.dshHome },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
    this.child = child;

    child.stdout?.on("data", (chunk: Buffer) => {
      this.stdoutBuffer = this.consumeLines(this.stdoutBuffer, chunk, (line) => {
        this.opts.onStdoutLine?.(line);
      });
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      this.stderrBuffer = this.consumeLines(this.stderrBuffer, chunk, (line) => {
        this.opts.onStderrLine?.(line);
        this.opts.log.error(line);
      });
    });
    child.on("error", (err) => {
      this.opts.log.error(`dsh 启动失败: ${err.message}`, err);
      this.settle(null, null, err);
    });
    child.on("close", (code, signal) => {
      this.flushRemaining();
      this.settle(code, signal);
    });
  }

  stop(): Promise<void> {
    if (!this.stopPromise) {
      this.stopPromise = this.doStop();
    }
    return this.stopPromise;
  }

  private async doStop(): Promise<void> {
    const child = this.child;
    if (!child || this.exitInfo) {
      return;
    }
    this.opts.log.info("终止 dsh 进程");
    child.kill();
    await Promise.race([
      this.exited.catch(() => null),
      new Promise<void>((resolve) => setTimeout(resolve, STOP_GRACE_MS)),
    ]);
    if (this.exitInfo) {
      return;
    }
    this.opts.log.error("dsh 进程未在宽限期内退出,强制终止");
    if (process.platform === "win32") {
      // Windows 无 SIGTERM 树语义,kill 超时后用 taskkill 树杀兜底
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      try {
        process.kill(child.pid ?? -1, "SIGKILL");
      } catch {
        // 进程可能已退出,忽略
      }
    }
    await this.exited.catch(() => null);
  }

  private consumeLines(buffer: string, chunk: Buffer, onLine: (line: string) => void): string {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      onLine(raw.replace(/\r$/, ""));
    }
    return buffer;
  }

  private flushRemaining(): void {
    if (this.stdoutBuffer) {
      const line = this.stdoutBuffer.replace(/\r$/, "");
      this.stdoutBuffer = "";
      this.opts.onStdoutLine?.(line);
    }
    if (this.stderrBuffer) {
      const line = this.stderrBuffer.replace(/\r$/, "");
      this.stderrBuffer = "";
      this.opts.onStderrLine?.(line);
      this.opts.log.error(line);
    }
  }

  private settle(code: number | null, signal: string | null, err?: Error): void {
    if (this.settled) {
      return;
    }
    this.settled = true;
    this.exitInfo = { code, signal };
    if (err) {
      this.rejectExit(err);
    } else {
      this.resolveExit(code);
    }
    this.opts.onExit?.(code, signal);
  }
}
