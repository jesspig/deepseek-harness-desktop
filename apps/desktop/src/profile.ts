import fs from "node:fs";
import path from "node:path";
import type { Log } from "./log";

export interface ProfileBootstrapOptions {
  dshHome: string;
  templateDir: string;
  packagesRoot: string;
  log: Log;
}

const PROFILE_NAME = "desktop";
const TEMPLATE_FILES = ["package.json", "cordis.patch.yml", "pnpm-workspace.yaml"];
const REQUIRED_TEMPLATE_FILE = "package.json";
const OPTIONAL_TEMPLATE_FILES = ["cordis.yml"];
const LINK_SCOPES = ["@deepseek-ai", "@dsh-desktop"];
const LINK_REMOVE_RETRY_TIMES = 3;
const LINK_REMOVE_RETRY_INTERVAL_MS = 100;

export function ensureDesktopProfile(opts: ProfileBootstrapOptions): void {
  const profileDir = path.join(opts.dshHome, "profiles", PROFILE_NAME);
  if (fs.existsSync(path.join(profileDir, "package.json"))) {
    return;
  }
  fs.mkdirSync(profileDir, { recursive: true });
  for (const file of [...TEMPLATE_FILES, ...OPTIONAL_TEMPLATE_FILES]) {
    const src = path.join(opts.templateDir, file);
    if (!fs.existsSync(src)) {
      if (file === REQUIRED_TEMPLATE_FILE) {
        throw new Error(`profile 模板缺少清单文件 ${file}: ${src}`);
      }
      continue;
    }
    fs.copyFileSync(src, path.join(profileDir, file));
  }
}

export function ensureProfileLinks(opts: ProfileBootstrapOptions): void {
  const linksRoot = path.join(opts.dshHome, "profiles", "node_modules");
  const packagesRoot = path.resolve(opts.packagesRoot);
  fs.mkdirSync(linksRoot, { recursive: true });
  for (const scope of LINK_SCOPES) {
    const scopeDir = path.join(packagesRoot, scope);
    if (!fs.existsSync(scopeDir)) {
      continue;
    }
    const linkScopeDir = path.join(linksRoot, scope);
    fs.mkdirSync(linkScopeDir, { recursive: true });
    for (const pkg of fs.readdirSync(scopeDir)) {
      const source = path.join(scopeDir, pkg);
      if (!fs.statSync(source).isDirectory()) {
        continue;
      }
      ensurePackageLink(source, path.join(linkScopeDir, pkg), opts.log);
    }
  }
}

function ensurePackageLink(target: string, linkPath: string, log: Log): void {
  let stat: fs.Stats | null = null;
  try {
    stat = fs.lstatSync(linkPath);
  } catch {
    // 链接不存在,需要创建
  }
  if (stat) {
    if (!stat.isSymbolicLink()) {
      return;
    }
    if (fs.existsSync(linkPath) && linkTargetMatches(linkPath, target)) {
      return;
    }
    if (!removeLink(linkPath, log)) {
      log.error(`删除失效链接失败,跳过重建: ${linkPath}`);
      return;
    }
  }
  createLink(target, linkPath, log);
}

/** 删除链接并有限重试;链接已被并发删除(ENOENT)视为成功 */
function removeLink(linkPath: string, log: Log): boolean {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= LINK_REMOVE_RETRY_TIMES; attempt++) {
    try {
      fs.unlinkSync(linkPath);
      return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return true;
      }
      lastErr = err;
      if (attempt < LINK_REMOVE_RETRY_TIMES) {
        sleepSync(LINK_REMOVE_RETRY_INTERVAL_MS);
      }
    }
  }
  log.error(`删除链接失败(已重试 ${LINK_REMOVE_RETRY_TIMES} 次): ${linkPath}`, lastErr);
  return false;
}

function createLink(target: string, linkPath: string, log: Log): void {
  try {
    fs.symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
  } catch (err) {
    log.error(`创建链接失败: ${linkPath} -> ${target}`, err);
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** 解析链接真实目标并与期望目标比较;任一侧不可解析视为不一致 */
function linkTargetMatches(linkPath: string, expectedTarget: string): boolean {
  try {
    return fs.realpathSync(linkPath) === fs.realpathSync(expectedTarget);
  } catch {
    return false;
  }
}
