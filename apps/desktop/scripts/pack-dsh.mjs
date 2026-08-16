#!/usr/bin/env node
/**
 * pack-dsh.mjs — 复制 dsh 依赖树到 release-resources(T8a)
 *
 * 用途:electron-builder 打包前,把 apps/desktop 依赖树中 dsh 运行所需的包
 * 复制到 apps/desktop/release-resources/node_modules,再由 electron-builder.yml
 * 的 extraResources 分发到安装目录 resources/node_modules。
 * 运行时以 ELECTRON_RUN_AS_NODE 模式 spawn electron.exe 执行
 * resources/node_modules/@deepseek-ai/dsh/lib/bin.js;asar 内无法放原生模块,
 * 故 dsh 树不进 asar,应用自身代码才进 asar。
 *
 * 复制策略(仅使用 Node 内置模块):
 *   - 源为仓库根 node_modules(hoisted 布局,workspace 共享依赖树,
 *     全实体无符号链接,dereference 复制无副作用)。
 *   - 种子:整体复制仓库根 node_modules/@deepseek-ai(dereference),
 *     以及 @dsh-desktop(逐包解析链接后实体复制,详见下)。
 *   - 依赖收集(不动点):循环扫描复制产物中全部已复制包的
 *     package.json,收集非 @deepseek-ai/* 且非 @dsh-desktop/* 的
 *     包名(这两个 scope 已作为种子复制,跳过以避免自环),从仓库
 *     根 node_modules 顶层逐项复制,直到某一轮无新增依赖为止。
 *     由此覆盖传递依赖与 optionalDependencies 平台二进制包
 *     (如 @img/sharp-win32-x64、@koromix/koffi-win32-x64);
 *     electron/typescript 等 dev 依赖不会进入。
 *   - 依赖按来源区分 required 与 optional:dependencies 为必需
 *     依赖,顶层缺失直接抛错;optionalDependencies 遵循
 *     Node/pnpm 语义,允许缺失——pnpm 只安装当前平台的 optional
 *     包(如 @img/sharp-win32-x64),其他平台变体(如
 *     @img/sharp-darwin-arm64)不在顶层 node_modules,缺失时
 *     跳过该包;复制成功的 optional 包继续参与后续轮次收集,
 *     其自身依赖一并收集。
 *   - 桌面插件:@dsh-desktop 源优先取 apps/desktop/node_modules/
 *     @dsh-desktop;不存在则退到仓库根 node_modules/@dsh-desktop;
 *     两者都不存在时抛错(bundle 是打包必需,不允许静默跳过)。
 *     pnpm 布局下 scope 内包(如 bundle)为 Windows junction,
 *     cpSync 的 dereference 不解 junction(实测复制产物中仍为
 *     链接),故复制前先 realpathSync 解析 scope 及其中每个包
 *     (跟随全部链接层到实体路径),按实体路径逐包复制,产物无
 *     链接;复制后校验 @dsh-desktop/bundle/package.json 存在。
 *     复制产物中 bundle 包内 node_modules 一律删除:pnpm 链接为
 *     Windows junction,cpSync dereference 不解 junction,产物保留
 *     指向开发机的失效链接,NSIS 打包会报错;bundle 的运行依赖
 *     (@deepseek-ai/cordis)已由主路径复制到顶层,包内为冗余。
 *     再递归扫描 @dsh-desktop 产物中的 symlink/junction 条目并
 *     删除,兜底防未来引入同类问题。
 *   - 必须 dereference:Windows 打包后 symlink 会失效。
 *   - 先清空 release-resources 再复制,幂等。
 *
 * 用法:node pack-dsh.mjs(无参数,路径从脚本位置推导)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(SCRIPT_DIR, '..');
const NODE_MODULES = path.resolve(DESKTOP_DIR, '..', '..', 'node_modules');
const OUT_DIR = path.join(DESKTOP_DIR, 'release-resources');
const OUT_NODE_MODULES = path.join(OUT_DIR, 'node_modules');
const DSH_PKG = '@deepseek-ai/dsh';

function log(message) {
  process.stdout.write(`[pack-dsh] ${message}\n`);
}

// 非运行必需文件的扩展名(大小写不敏感,.d.ts/.d.mts 由 .ts/.mts 覆盖)
const SKIP_EXTENSIONS = new Set([
  '.pdb',
  '.map',
  '.d.ts',
  '.d.mts',
  '.ts',
  '.mts',
  '.cc',
  '.h',
  '.c',
  '.cpp',
  '.hpp',
  '.md',
]);
// 文档文件名前缀(大小写不敏感);仅对非运行必需扩展名生效
const SKIP_NAME_PREFIXES = [
  'license',
  'readme',
  'changelog',
  'notice',
  'authors',
  'copyright',
  'security',
];
// 运行必需扩展名,一律保留(安全优先,见任务保留清单)
const RUNTIME_EXTENSIONS = [
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.node',
  '.dll',
  '.exe',
  '.ttf',
  '.wasm',
];

function isRuntimeName(name) {
  const lower = name.toLowerCase();
  return RUNTIME_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function shouldSkipFile(name) {
  const lower = name.toLowerCase();
  if (SKIP_EXTENSIONS.has(path.extname(lower))) {
    return true;
  }
  // 文档类文件才应用名称前缀过滤,避免误删 license.js 等运行必需文件
  if (
    !isRuntimeName(lower) &&
    SKIP_NAME_PREFIXES.some((prefix) => lower.startsWith(prefix))
  ) {
    return true;
  }
  return false;
}

// node-pty 错误平台变体目录(不得影响 win32-x64 与 build/Release)
function isNodePtyDir(segments, rootName) {
  const lower = segments.map((s) => s.toLowerCase());
  const isNodePty =
    rootName === 'node-pty' || rootName === '@node-pty' || lower.includes('node-pty');
  if (!isNodePty) {
    return false;
  }
  if (lower.includes('prebuilds') && lower.includes('win32-arm64')) {
    return true;
  }
  if (lower.includes('third_party') && lower.includes('win10-arm64')) {
    return true;
  }
  return false;
}

// 带过滤的复制,保留 dereference 语义(符号链接解析到实体后实体复制)
const filterSkip = { files: 0, dirs: 0 };
function copyTree(src, dest, rootName, segments = []) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcFull = path.join(src, entry.name);
    const destFull = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (isNodePtyDir([...segments, entry.name], rootName)) {
        filterSkip.dirs += 1;
        log(`跳过平台变体目录: ${srcFull}`);
        continue;
      }
      copyTree(srcFull, destFull, rootName, [...segments, entry.name]);
      continue;
    }
    if (entry.isSymbolicLink()) {
      const real = fs.realpathSync(srcFull);
      const realStat = fs.statSync(real);
      if (realStat.isDirectory()) {
        if (isNodePtyDir([...segments, entry.name], rootName)) {
          filterSkip.dirs += 1;
          log(`跳过平台变体目录: ${srcFull}`);
          continue;
        }
        copyTree(real, destFull, rootName, [...segments, entry.name]);
      } else if (shouldSkipFile(entry.name)) {
        filterSkip.files += 1;
        continue;
      } else {
        fs.copyFileSync(real, destFull);
      }
      continue;
    }
    if (shouldSkipFile(entry.name)) {
      filterSkip.files += 1;
      continue;
    }
    fs.copyFileSync(srcFull, destFull);
  }
}

function removeInvalidLinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) {
      fs.rmSync(full, { recursive: true, force: true });
      log(`移除失效链接: ${full}`);
    } else if (stat.isDirectory()) {
      removeInvalidLinks(full);
    }
  }
}

function removeBundleNodeModules() {
  const desktopScope = path.join(OUT_NODE_MODULES, '@dsh-desktop');
  if (!fs.existsSync(desktopScope)) {
    return;
  }
  for (const name of fs.readdirSync(desktopScope)) {
    const pkgNodeModules = path.join(desktopScope, name, 'node_modules');
    if (fs.existsSync(pkgNodeModules)) {
      fs.rmSync(pkgNodeModules, { recursive: true, force: true });
      log(`移除 bundle 包内冗余 node_modules: ${pkgNodeModules}`);
    }
  }
}

function listInstalledPackages(packagesRoot) {
  const names = new Set();
  for (const entry of fs.readdirSync(packagesRoot, { withFileTypes: true })) {
    const full = path.join(packagesRoot, entry.name);
    if (!fs.statSync(full).isDirectory()) {
      continue;
    }
    if (entry.name.startsWith('@')) {
      for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
        const subFull = path.join(full, sub.name);
        if (
          fs.statSync(subFull).isDirectory() &&
          fs.existsSync(path.join(subFull, 'package.json'))
        ) {
          names.add(`${entry.name}/${sub.name}`);
        }
      }
    } else if (fs.existsSync(path.join(full, 'package.json'))) {
      names.add(entry.name);
    }
  }
  return names;
}

function collectDeps(packagesRoot, packageNames) {
  const required = new Set();
  const optional = new Set();
  for (const name of packageNames) {
    const manifestPath = path.join(packagesRoot, ...name.split('/'), 'package.json');
    if (!fs.existsSync(manifestPath)) {
      continue;
    }
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      throw new Error(`解析失败 ${manifestPath}: ${err.message}`);
    }
    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      if (dep.startsWith('@deepseek-ai/') || dep.startsWith('@dsh-desktop/')) {
        continue;
      }
      required.add(dep);
    }
    for (const dep of Object.keys(manifest.optionalDependencies ?? {})) {
      if (dep.startsWith('@deepseek-ai/') || dep.startsWith('@dsh-desktop/')) {
        continue;
      }
      optional.add(dep);
    }
  }
  return { required, optional };
}

function copyTopLevelDeps(deps) {
  const missing = [];
  for (const dep of deps) {
    const rel = dep.split('/');
    const src = path.join(NODE_MODULES, ...rel);
    if (!fs.existsSync(src)) {
      missing.push(dep);
      continue;
    }
    copyTree(src, path.join(OUT_NODE_MODULES, ...rel), dep);
  }
  return missing;
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(full);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function main() {
  const deepseekSrc = path.join(NODE_MODULES, '@deepseek-ai');
  if (!fs.existsSync(deepseekSrc)) {
    throw new Error(
      `仓库根 node_modules 缺少 @deepseek-ai(先执行 pnpm install): ${NODE_MODULES}`
    );
  }

  log(`清空并重建: ${OUT_DIR}`);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_NODE_MODULES, { recursive: true });

  log(`复制 ${deepseekSrc} → ${OUT_NODE_MODULES}/@deepseek-ai(dereference)`);
  copyTree(deepseekSrc, path.join(OUT_NODE_MODULES, '@deepseek-ai'), '@deepseek-ai');

  const dshDesktopCandidates = [
    path.join(DESKTOP_DIR, 'node_modules', '@dsh-desktop'),
    path.join(NODE_MODULES, '@dsh-desktop'),
  ];
  const dshDesktopSrc = dshDesktopCandidates.find((p) => fs.existsSync(p));
  if (!dshDesktopSrc) {
    throw new Error(
      `未找到 @dsh-desktop(先执行 pnpm install): ${dshDesktopCandidates.join(' 或 ')}`
    );
  }
  const dshDesktopReal = fs.realpathSync(dshDesktopSrc);
  const dshDesktopOut = path.join(OUT_NODE_MODULES, '@dsh-desktop');
  fs.mkdirSync(dshDesktopOut, { recursive: true });
  log(`复制 ${dshDesktopReal} → ${dshDesktopOut}(逐包解析链接后实体复制)`);
  for (const entry of fs.readdirSync(dshDesktopReal, { withFileTypes: true })) {
    const entryReal = fs.realpathSync(path.join(dshDesktopReal, entry.name));
    copyTree(entryReal, path.join(dshDesktopOut, entry.name), entry.name);
  }
  removeBundleNodeModules();
  removeInvalidLinks(dshDesktopOut);
  const bundleManifest = path.join(
    OUT_NODE_MODULES,
    '@dsh-desktop',
    'bundle',
    'package.json'
  );
  if (!fs.existsSync(bundleManifest)) {
    throw new Error(`复制后缺少 ${bundleManifest},@dsh-desktop/bundle 复制不完整`);
  }
  log('校验通过: @dsh-desktop/bundle 存在');

  let round = 0;
  const skippedOptional = new Set();
  while (true) {
    round += 1;
    const packages = listInstalledPackages(OUT_NODE_MODULES);
    const { required, optional } = collectDeps(OUT_NODE_MODULES, packages);
    const toCopyRequired = [...required].filter((dep) => !packages.has(dep));
    const toCopyOptional = [...optional].filter(
      (dep) => !packages.has(dep) && !skippedOptional.has(dep)
    );
    if (toCopyRequired.length === 0 && toCopyOptional.length === 0) {
      log(`依赖收集到达不动点(第 ${round} 轮,OUT 共 ${packages.size} 个包)`);
      break;
    }
    log(
      `第 ${round} 轮收集到 ${toCopyRequired.length} 个必需、${toCopyOptional.length} 个可选依赖,从顶层复制`
    );
    const missing = copyTopLevelDeps(toCopyRequired);
    if (missing.length > 0) {
      throw new Error(
        `顶层未覆盖 ${missing.length} 个依赖(${missing.join(', ')}),先执行 pnpm install`
      );
    }
    for (const dep of toCopyOptional) {
      const rel = dep.split('/');
      const src = path.join(NODE_MODULES, ...rel);
      if (!fs.existsSync(src)) {
        skippedOptional.add(dep);
        log(`跳过缺失的可选依赖: ${dep}`);
        continue;
      }
      copyTree(src, path.join(OUT_NODE_MODULES, ...rel), dep);
    }
  }

  const dshManifest = path.join(OUT_NODE_MODULES, ...DSH_PKG.split('/'), 'package.json');
  if (!fs.existsSync(dshManifest)) {
    throw new Error(`复制后缺少 ${dshManifest},dsh 依赖树不完整`);
  }
  log(`校验通过: ${DSH_PKG} 存在`);
  log(`体积: ${formatSize(dirSize(OUT_DIR))}(${OUT_DIR})`);
  log(`过滤后产物: ${countFiles(OUT_DIR)} 文件 / ${formatSize(dirSize(OUT_DIR))}`);
  log(`过滤跳过: ${filterSkip.files} 文件 / ${filterSkip.dirs} 目录`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`[pack-dsh] 错误: ${err.message}\n`);
  process.exitCode = 1;
}
