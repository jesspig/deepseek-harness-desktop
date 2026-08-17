#!/usr/bin/env node
/**
 * check-builder-config.mjs — 校验 electron-builder.yml 符合 electron-builder schema
 *
 * 用途:在打包前用仓库自带 app-builder-lib/scheme.json 校验配置文件,
 * 配置错误(如属性位置/类型不合 schema)在本地即可发现,避免烧 CI 资源。
 * electron-builder.yml 为四平台 job 共享配置,任何非法属性都会导致
 * 全平台打包失败,故任何改动后必须先跑本脚本。
 *
 * 用法:node check-builder-config.mjs(无参数,路径从脚本位置推导)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(SCRIPT_DIR, '..');
const CONFIG_PATH = path.join(DESKTOP_DIR, 'electron-builder.yml');
const NODE_MODULES = path.resolve(DESKTOP_DIR, '..', '..', 'node_modules');

function log(message) {
  process.stdout.write(`[check-builder-config] ${message}\n`);
}

function main() {
  const Ajv = require('ajv');
  const yaml = require('yaml');
  const schema = require(path.join(NODE_MODULES, 'app-builder-lib', 'scheme.json'));
  const config = yaml.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(config)) {
    const details = validate.errors
      .map((error) => `${error.instancePath || '(root)'} ${error.message}`)
      .join('\n');
    throw new Error(`electron-builder.yml 不符合 schema:\n${details}`);
  }
  log(`校验通过: ${CONFIG_PATH}`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`[check-builder-config] 错误: ${err.message}\n`);
  process.exitCode = 1;
}
