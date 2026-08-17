#!/usr/bin/env node
/**
 * set-version.mjs — 注入 tag 版本到 apps/desktop/package.json(CI 用)
 *
 * 用途:GitHub Actions 发布流程中,把 push tag(如 v0.1.0 或 0.1.0-rc.6)的
 * 版本写入应用 manifest,使 electron-builder 产物携带与 tag 一致的版本号。
 * 跨平台由 Node 统一处理,避免 shell 引号与转义差异。
 *
 * 用法:node set-version.mjs <tag>
 *   - tag 允许带 v 前缀,写入时剥离;版本须匹配 semver 主版本号
 *     段(\d+.\d+.\d+,允许 prerelease 后缀)
 *   - 仅改写 version 字段,保留其余字段;JSON 输出缩进 2 空格,
 *     末尾保留换行(与原文件格式一致)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const VERSION_RE = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;

function main() {
  const tag = process.argv[2];
  if (tag === undefined) {
    throw new Error('缺少参数: 用法 node set-version.mjs <tag>');
  }
  const match = VERSION_RE.exec(tag);
  if (match === null) {
    throw new Error(`非法 tag 版本: ${tag}(需匹配 semver,可带 v 前缀)`);
  }
  const version = match[1];
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  manifest.version = version;
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`[set-version] ${MANIFEST_PATH} version -> ${version}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`[set-version] 错误: ${err.message}\n`);
  process.exitCode = 1;
}
