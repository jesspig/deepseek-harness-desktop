#!/usr/bin/env node
/**
 * generate-icon.mjs — 从仓库根 assets/ 的 SVG 生成应用图标 PNG
 *
 * 用途:electron-builder 26.x 打包 mac(icns 转换)要求源图至少 512x512,
 * 直接用 SVG 源(50x50)会触发 ERR_ICON_TOO_SMALL 导致 mac 构建失败。
 * 本脚本用 sharp 将 favicon-blue.svg 渲染为 1024x1024 PNG,
 * 输出到 apps/desktop/assets/icon.png(mac/linux 共用),幂等覆盖。
 * win 的 icon.ico 不由此脚本生成。
 *
 * 用法:node generate-icon.mjs(无参数,路径从脚本位置推导)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(DESKTOP_DIR, '..', '..');
const SOURCE_SVG = path.join(REPO_ROOT, 'assets', 'favicon-blue.svg');
const OUTPUT_PNG = path.join(DESKTOP_DIR, 'assets', 'icon.png');
const TARGET_SIZE = 1024;
const MIN_SIZE = 512;

function log(message) {
  process.stdout.write(`[generate-icon] ${message}\n`);
}

async function main() {
  const sharp = require('sharp');
  if (!fs.existsSync(SOURCE_SVG)) {
    throw new Error(`缺少源图标: ${SOURCE_SVG}`);
  }
  const svg = fs.readFileSync(SOURCE_SVG);
  const svgMeta = await sharp(svg).metadata();
  log(`源 SVG: ${SOURCE_SVG}(viewBox ${svgMeta.width}x${svgMeta.height})`);
  const png = await sharp(svg)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  fs.mkdirSync(path.dirname(OUTPUT_PNG), { recursive: true });
  fs.writeFileSync(OUTPUT_PNG, png);
  const meta = await sharp(OUTPUT_PNG).metadata();
  if (meta.width < MIN_SIZE || meta.height < MIN_SIZE) {
    throw new Error(`输出图标尺寸不足 ${MIN_SIZE}x${MIN_SIZE}: ${meta.width}x${meta.height}`);
  }
  log(`生成图标: ${OUTPUT_PNG}(${meta.width}x${meta.height}, ${(png.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  process.stderr.write(`[generate-icon] 错误: ${err.message}\n`);
  process.exitCode = 1;
});