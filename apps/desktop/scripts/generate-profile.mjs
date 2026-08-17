#!/usr/bin/env node
/**
 * generate-profile.mjs — 生成可重现的 desktop profile 模板(T6a)
 *
 * 用途:构建机执行一次,把官方 dsh 的 plugin add 机制产物固化为模板,
 * 随安装包分发;运行时(Electron main)从模板复制出用户 profile。
 *
 * 模板目录规范(T8a 引用):
 *   - 模板 = profile 清单文件(不含 node_modules)
 *   - 运行时(Electron main)将模板复制到用户 DSH_HOME/profiles/desktop/,
 *     并建立 $DSH_HOME/profiles/node_modules 的链接(官方 healProfilesModuleFallback
 *     逻辑;M0 简化:复制模板后,把应用的 @deepseek-ai/* 包目录链接进
 *     profiles/node_modules;若实现复杂,M0 可先注释说明由 T8a 处理,本脚本只管生成)
 *   - 依赖解析:模板不含 node_modules,运行期依赖从应用安装的包树解析
 *     (profiles/node_modules 链接由运行时阶段建立,见上)
 *
 * 流程(两阶段,规避 Windows 下 dsh 转发 pnpm 的网络并发崩溃):
 *   1. 清空并重建 --home(临时 DSH_HOME)
 *   2. 阶段 1:仅对 @deepseek-ai/dsh-web-app 执行 dsh plugin --profile desktop add;
 *      成功则跳过阶段 2/3;失败分三类:因忽略构建脚本或网络并发失败(见 RE_NET_ERRORS)
 *      则标记转入手动安装,其他失败直接抛错。
 *      --bundle 包一律跳过阶段 1,直接标记进阶段 2(手动 pnpm add 绝对路径),
 *      保证阶段 3 reconcile 顺序为 web-app 先、bundle 后,最终 bundles 顺序 =
 *      [dsh-base, dsh-web-app, <bundle>...](desktop-bundle 的 patch 需叠加在
 *      web-app 之后)
 *   3. 阶段 2:对标记包在 profile 目录手动 pnpm add --save-exact(失败重试
 *      最多 3 轮,每轮间隔 5 秒,失败输出含忽略构建特征先修复 allowBuilds)。
 *      手动安装必须带显式版本(见 WEB_APP_PKG_SPEC):pnpm add 无版本 spec 会对
 *      全部版本做 resolution,200+ 并发元数据请求触发网络风暴(UND_ERR_DESTROYED
 *      + libuv 断言);显式版本 resolution 极窄,稳定成功。--bundle 传入的本地
 *      目录路径不含版本,pnpm 按目录链接,同样无 resolution 风暴,保持原样。
 *      版本锁定与仓库全局策略一致(依赖精确锁定,升级单独进行并验收)。
 *   4. 阶段 3:对阶段 2 包再次 dsh plugin add(stores 已缓存,download 0,
 *      稳定成功;reconcile 把带 dsh.bundle 声明的包追加为 bundle 层;
 *      仍传原始包名,dsh add 官方语义,依赖已装后无网络下载)。
 *      reconcile 循环按 [web-app 若标记, ...bundles] 顺序执行,bundle 追加在
 *      web-app 之后
 *   5. 阶段 4:allowBuilds 修复(pnpm-workspace.yaml 中 pnpm 11 写入的占位符
 *      "set this to true or false" 逐行置为 true),重跑 pnpm install
 *      完成原生依赖构建
 *   6. 校验:manifest 的 dsh.profile.bundles 包含 dsh-base、dsh-web-app
 *      及全部 --bundle 包名;cordis.patch.yml 存在;失败抛错并输出诊断
 *   7. 复制模板:package.json、cordis.patch.yml、pnpm-workspace.yaml 三个
 *      清单文件到 --out(先清空 --out,幂等);package.json 缺失抛错,
 *      其余文件存在则复制、缺失跳过;cordis.yml 若存在也一并复制
 *      (官方 plugin add 产物不含 cordis.yml,非必需);随后对生成的
 *      package.json 做 link 绝对路径规范化(本地目录包依赖形如
 *      link:<绝对路径> 的值改写为相对 --out 的相对路径,统一正斜杠),
 *      保证模板输出可移植、克隆后仍有效
 *
 * 参数(--key value 手写解析,不引依赖):
 *   --dsh-bin <path>  dsh 可执行文件路径(Windows 下可传 .cmd shim)
 *   --out <dir>       模板输出目录(先清空后写入)
 *   --home <dir>      临时 DSH_HOME(先清空后重建)
 *   --bundle <pkg>    额外 bundle 包(包名或本地包目录路径),可重复;
 *                     目录路径一律先绝对化(pnpm 以 cwd=profile 目录执行,
 *                     相对路径会相对 profile 目录解析,导致依赖键名记错)
 *   --pnpm-bin <path> pnpm 可执行文件路径;缺省取 DSH_PNPM_BIN 环境变量,
 *                     再退回 PATH 中的 pnpm
 *
 * 约束:仅使用 Node 内置模块;跨平台(Windows 下对 .cmd/.bat 经 ComSpec 包装执行)。
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PROFILE_NAME = 'desktop';
const BASE_PKG = '@deepseek-ai/dsh-base';
const WEB_APP_PKG = '@deepseek-ai/dsh-web-app';
const WEB_APP_PKG_SPEC = '@deepseek-ai/dsh-web-app@0.1.0-rc.6';
const IGNORED_BUILDS_RE = /ERR_PNPM_IGNORED_BUILDS|ignored build|build scripts/i;
const RE_NET_ERRORS = /UND_ERR_DESTROYED|ECONNRESET|ETIMEDOUT|UV_HANDLE_CLOSING|Assertion failed/i;
const ALLOW_BUILDS_PLACEHOLDER_RE = /^(\s*[^#][^#]*?:\s*)set this to true or false\s*$/gm;
const TEMPLATE_FILES = ['package.json', 'cordis.patch.yml', 'pnpm-workspace.yaml'];
const REQUIRED_TEMPLATE_FILE = 'package.json';
const OPTIONAL_TEMPLATE_FILES = ['cordis.yml'];
const MAX_MANUAL_ATTEMPTS = 3;
const MANUAL_RETRY_DELAY_MS = 5000;

function log(message) {
  process.stdout.write(`[generate-profile] ${message}\n`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function usageText() {
  return [
    '用法:',
    '  node generate-profile.mjs --dsh-bin <path> --out <dir> --home <dir>',
    '      [--bundle <pkg>]... [--pnpm-bin <path>]',
    '',
    '参数:',
    '  --dsh-bin <path>  dsh 可执行文件路径(Windows 下可传 .cmd shim)',
    '  --out <dir>       模板输出目录(先清空后写入,幂等)',
    '  --home <dir>      临时 DSH_HOME(先清空后重建)',
    '  --bundle <pkg>    额外 bundle 包:包名或本地包目录路径,可重复',
    '  --pnpm-bin <path> pnpm 可执行文件路径;缺省取 DSH_PNPM_BIN 环境变量,再退回 PATH 中的 pnpm',
    '  --help            显示本帮助',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { bundles: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--help' || key === '-h') {
      opts.help = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined) {
      throw new Error(`参数 ${key} 缺少值`);
    }
    i += 1;
    if (key === '--dsh-bin') {
      opts.dshBin = value;
    } else if (key === '--out') {
      opts.out = value;
    } else if (key === '--home') {
      opts.home = value;
    } else if (key === '--bundle') {
      opts.bundles.push(value);
    } else if (key === '--pnpm-bin') {
      opts.pnpmBin = value;
    } else {
      throw new Error(`未知参数: ${key}`);
    }
  }
  return opts;
}

function resolveBin(bin) {
  if (fs.existsSync(bin)) return bin;
  if (/[\\/]/.test(bin)) return bin;
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, bin + ext);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return bin;
}

function quoteCmdArg(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function runCommand(bin, args, { cwd, env } = {}) {
  const resolvedBase = resolveBin(bin);
  let resolved = resolvedBase;
  if (
    process.platform === 'win32' &&
    !/\.(cmd|bat|exe)$/i.test(resolvedBase) &&
    fs.existsSync(resolvedBase + '.cmd')
  ) {
    resolved = resolvedBase + '.cmd';
  }
  const isCmdShim = process.platform === 'win32' && /\.(cmd|bat)$/i.test(resolved);
  let command = resolved;
  let fullArgs = args;
  const spawnOpts = {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  };
  if (isCmdShim) {
    const cmdLine = [quoteCmdArg(resolved), ...args.map(quoteCmdArg)].join(' ');
    command = process.env.ComSpec || 'cmd.exe';
    fullArgs = ['/d', '/s', '/c', `"${cmdLine}"`];
    spawnOpts.windowsVerbatimArguments = true;
  }
  const result = spawnSync(command, fullArgs, spawnOpts);
  if (result.error) {
    throw new Error(`无法执行 ${resolved}: ${result.error.message}`);
  }
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function fixAllowBuilds(yamlPath) {
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`profile 目录缺少 pnpm-workspace.yaml: ${yamlPath}`);
  }
  const raw = fs.readFileSync(yamlPath, 'utf8');
  const fixed = raw.replace(ALLOW_BUILDS_PLACEHOLDER_RE, '$1true');
  if (fixed !== raw) {
    fs.writeFileSync(yamlPath, fixed);
    const count = (raw.match(/set this to true or false/g) ?? []).length;
    log(`allowBuilds 修复: ${count} 个占位符置为 true`);
  }
}

function resolveBundleName(value) {
  const manifestPath = path.join(value, 'package.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const name = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).name;
      if (typeof name === 'string' && name.length > 0) return name;
    } catch {
      // 本地包 manifest 解析失败时退回原值
    }
  }
  return value;
}

/**
 * 规范化 package.json 中 link 依赖的绝对路径。
 *
 * pnpm add 本地目录包时会把 link 值写成绝对路径(如
 * link:C:/Users/.../packages/desktop-bundle),导致生成的模板携带本机绝对路径、不可移植。
 * 本函数把 outDir 下 package.json 里形如 link:<绝对路径> 的依赖值改写为相对 outDir 的
 * 相对路径(统一正斜杠),相对路径解析到仓库内目标包目录,克隆后仍有效。非绝对路径
 * (已是相对 link 或纯包名)原样保留。仅在确有改写时写回,沿用原文件 2 空格缩进。
 */
function normalizeDependencyLinks(outDir, manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const deps = manifest.dependencies;
  if (!deps || typeof deps !== 'object') return;
  let changed = false;
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== 'string' || !spec.startsWith('link:')) continue;
    const target = spec.slice('link:'.length);
    if (!path.isAbsolute(target)) continue;
    const rel = path.relative(outDir, target).split(path.sep).join('/');
    const normalized = rel === '' || rel.startsWith('.') ? rel : `./${rel}`;
    deps[name] = `link:${normalized}`;
    changed = true;
  }
  if (!changed) return;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + `\n`);
  log('已规范化 link 绝对路径为相对路径(相对模板目录)');
}

function validateProfile(profileDir, expectedBundles) {
  const manifestPath = path.join(profileDir, 'package.json');
  const patchPath = path.join(profileDir, 'cordis.patch.yml');
  const errors = [];
  let manifest = null;
  if (!fs.existsSync(manifestPath)) {
    errors.push(`缺少 ${manifestPath}`);
  } else {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      errors.push(`package.json 解析失败: ${err.message}`);
    }
    const bundles = manifest?.dsh?.profile?.bundles;
    if (!Array.isArray(bundles)) {
      errors.push('dsh.profile.bundles 缺失或非数组');
    } else {
      for (const name of expectedBundles) {
        if (!bundles.includes(name)) errors.push(`bundles 缺少 ${name}`);
      }
      const extra = bundles.filter((name) => !expectedBundles.includes(name));
      if (extra.length > 0) {
        process.stderr.write(`[generate-profile] 警告: bundles 含预期外项 ${extra.join(', ')}\n`);
      }
    }
  }
  if (!fs.existsSync(patchPath)) {
    errors.push(`缺少 ${patchPath}`);
  }
  if (errors.length > 0) {
    const diag = manifest ? JSON.stringify(manifest, null, 2) : '(manifest 不存在)';
    throw new Error(
      `profile 校验失败(期望 bundles: ${expectedBundles.join(', ')})\n` +
        `${errors.map((message) => `- ${message}`).join('\n')}\n` +
        `manifest:\n${diag}`
    );
  }
  return manifest;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(`${usageText()}\n`);
    return;
  }
  const missing = [];
  if (!opts.dshBin) missing.push('--dsh-bin');
  if (!opts.out) missing.push('--out');
  if (!opts.home) missing.push('--home');
  if (missing.length > 0) {
    throw new Error(`缺少参数: ${missing.join(', ')}\n\n${usageText()}`);
  }

  const home = path.resolve(opts.home);
  const out = path.resolve(opts.out);
  opts.bundles = opts.bundles.map((bundle) => path.resolve(bundle));
  const profileDir = path.join(home, 'profiles', PROFILE_NAME);
  const pnpmBin = opts.pnpmBin ?? process.env.DSH_PNPM_BIN ?? 'pnpm';
  if (out === home || out === profileDir) {
    throw new Error(`--out 不能等于 --home 或 profile 目录: ${out}`);
  }
  const expectedBundles = [BASE_PKG, WEB_APP_PKG, ...opts.bundles.map(resolveBundleName)];

  log(`重建临时 DSH_HOME: ${home}`);
  fs.rmSync(home, { recursive: true, force: true });
  fs.mkdirSync(home, { recursive: true });

  const manualPackages = [...opts.bundles];
  log(`dsh plugin --profile desktop add ${WEB_APP_PKG}(阶段 1)`);
  const result = runCommand(opts.dshBin, ['plugin', '--profile', PROFILE_NAME, 'add', WEB_APP_PKG], {
    cwd: home,
    env: { DSH_HOME: home },
  });
  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    const ignoredBuilds = IGNORED_BUILDS_RE.test(output);
    const netError = RE_NET_ERRORS.test(output);
    if (!ignoredBuilds && !netError) {
      throw new Error(`dsh plugin add 失败(${WEB_APP_PKG}),退出码 ${result.status}:\n${output}`);
    }
    log(
      `dsh plugin add ${WEB_APP_PKG} 因 ${ignoredBuilds ? 'pnpm11 忽略构建脚本' : '网络并发崩溃'}失败,转入手动 pnpm add`
    );
    manualPackages.unshift(WEB_APP_PKG);
  }

  fs.mkdirSync(profileDir, { recursive: true });
  for (const pkg of manualPackages) {
    const spec = pkg === WEB_APP_PKG ? WEB_APP_PKG_SPEC : pkg;
    const outputs = [];
    for (let attempt = 0; attempt < MAX_MANUAL_ATTEMPTS; attempt += 1) {
      log(`pnpm add ${spec} --save-exact(阶段 2,第 ${attempt + 1} 轮,${profileDir})`);
      const result = runCommand(pnpmBin, ['add', spec, '--save-exact'], {
        cwd: profileDir,
        env: { DSH_HOME: home },
      });
      if (result.status === 0) break;
      const output = `${result.stdout}\n${result.stderr}`.trim();
      outputs.push(`--- 第 ${attempt + 1} 轮 ---\n${output}`);
      if (IGNORED_BUILDS_RE.test(output)) {
        fixAllowBuilds(path.join(profileDir, 'pnpm-workspace.yaml'));
      }
      if (attempt < MAX_MANUAL_ATTEMPTS - 1) {
        log(`pnpm add ${spec} 失败,${MANUAL_RETRY_DELAY_MS / 1000} 秒后重试`);
        sleep(MANUAL_RETRY_DELAY_MS);
      }
    }
    if (outputs.length >= MAX_MANUAL_ATTEMPTS) {
      throw new Error(
        `pnpm add 手动安装失败(${pkg}),重试 ${MAX_MANUAL_ATTEMPTS} 轮仍失败:\n${outputs.join('\n')}`
      );
    }
  }

  for (const pkg of manualPackages) {
    log(`dsh plugin --profile desktop add ${pkg}(阶段 3,reconcile)`);
    const result = runCommand(opts.dshBin, ['plugin', '--profile', PROFILE_NAME, 'add', pkg], {
      cwd: home,
      env: { DSH_HOME: home },
    });
    if (result.status !== 0) {
      throw new Error(
        `dsh plugin add reconcile 失败(${pkg}),退出码 ${result.status}:\n${result.stdout}\n${result.stderr}`
      );
    }
  }

  fixAllowBuilds(path.join(profileDir, 'pnpm-workspace.yaml'));
  log(`重跑 pnpm install(${profileDir},阶段 4)`);
  const install = runCommand(pnpmBin, ['install'], { cwd: profileDir });
  if (install.status !== 0) {
    throw new Error(`pnpm install 失败,退出码 ${install.status}:\n${install.stdout}\n${install.stderr}`);
  }

  const manifest = validateProfile(profileDir, expectedBundles);

  log(`清空并重建模板目录: ${out}`);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const file of [...TEMPLATE_FILES, ...OPTIONAL_TEMPLATE_FILES]) {
    const src = path.join(profileDir, file);
    const dest = path.join(out, file);
    if (!fs.existsSync(src)) {
      if (file === REQUIRED_TEMPLATE_FILE) {
        throw new Error(`模板源缺少 ${src}`);
      }
      continue;
    }
    fs.copyFileSync(src, dest);
  }

  // 规范化生成 package.json 中 link 依赖的绝对路径(如 bundle 本地目录的 link),
  // 使模板输出相对、可移植,克隆后仍有效
  normalizeDependencyLinks(out, path.join(out, REQUIRED_TEMPLATE_FILE));

  log(`模板已生成: ${out}`);
  log(`dsh.profile.bundles: ${manifest.dsh.profile.bundles.join(', ')}`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`[generate-profile] 错误: ${err.message}\n`);
  process.exitCode = 1;
}