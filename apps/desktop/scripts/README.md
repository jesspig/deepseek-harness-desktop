# generate-profile.mjs — desktop profile 模板生成脚本

构建机执行一次,通过官方 `dsh plugin add` 机制生成可重现的 `desktop` profile 模板,产物随安装包分发。实现细节见脚本头部注释(T6a / 模板目录规范 T8a)。

## 用途

- 调用 `dsh plugin --profile desktop add <pkg>` 初始化 profile 并追加 bundle 层:先官方包 `@deepseek-ai/dsh-web-app`,再各 `--bundle` 包。
- 修复 pnpm 11 的 allowBuilds 占位符,重跑 `pnpm install` 完成原生依赖构建。
- 校验 manifest 的 `dsh.profile.bundles` 与 `cordis.patch.yml`,然后把清单文件复制为模板。

## 用法

```text
node generate-profile.mjs --dsh-bin <dsh> --out <模板目录> --home <临时DSH_HOME> [--bundle <包名或本地目录>]... [--pnpm-bin <pnpm>]
```

参数:

- `--dsh-bin <path>`:dsh 可执行文件路径(Windows 下可传 npm 安装生成的 `.cmd` shim)。
- `--out <dir>`:模板输出目录,先清空再写入,重复执行结果一致。
- `--home <dir>`:临时 DSH_HOME,先清空再重建;不能等于 `--out`。
- `--bundle <pkg>`:额外 bundle 包,包名或本地包目录路径,可重复。本地目录按其 `package.json` 的 `name` 参与校验。
- `--pnpm-bin <path>`:pnpm 可执行文件路径;缺省依次取 `DSH_PNPM_BIN` 环境变量、PATH 中的 `pnpm`。

Windows 示例:

```text
node generate-profile.mjs ^
  --dsh-bin C:\Users\me\AppData\Roaming\npm\dsh.cmd ^
  --out ..\..\packages\desktop-profile\template ^
  --home %TEMP%\dsh-desktop-profile-home ^
  --bundle ..\..\packages\desktop-bundle
```

POSIX 示例:

```text
node generate-profile.mjs \
  --dsh-bin "$HOME/.npm-global/bin/dsh" \
  --out ../../packages/desktop-profile/template \
  --home /tmp/dsh-desktop-profile-home \
  --bundle ../../packages/desktop-bundle
```

## 输出规范

- 模板目录仅含 4 个清单文件:`package.json`、`cordis.patch.yml`、`cordis.yml`、`pnpm-workspace.yaml`。
- **不复制 `node_modules`**:模板 = profile 清单文件,运行期依赖从应用安装的包树解析;`$DSH_HOME/profiles/node_modules` 链接由运行时阶段(官方 `healProfilesModuleFallback` 逻辑,M0 由 T8a 处理)建立。
- 脚本幂等:执行前清空 `--home` 与 `--out`,重复执行产出一致模板。

## 已知限制

- **需要网络与 pnpm**:dsh 的 `plugin add` 与构建脚本安装都要访问 npm registry;原生依赖(如 koffi)构建需要 pnpm。Windows 下 pnpm 不在 PATH 时请用 `--pnpm-bin` 指定。
- **allowBuilds 修复的必要性**:pnpm 11 默认阻止依赖构建脚本,`dsh` 生成的 `pnpm-workspace.yaml` 会以占位符 `set this to true or false` 写入 `allowBuilds`,导致 `dsh plugin add` 因 `ERR_PNPM_IGNORED_BUILDS` 失败。脚本把占位行改为 `true` 后重跑 `pnpm install`,并自动重试失败的 add;该修复仅在 Windows/pnpm11 场景实际生效,其他平台不影响。
- 偶发 registry 网络错误(`UND_ERR_DESTROYED` 等)会令 add/install 失败,重跑脚本即可恢复。
- `.cmd` shim 在 Windows 下经 `ComSpec` 包装执行,包名含空格或引号等特殊字符不受支持(包名本身不含这些字符)。

---

# pack-dsh.mjs — dsh 依赖树打包脚本(T8a)

## 用途

`pnpm dist` 的第一步:把 `apps/desktop/node_modules` 中 dsh 运行所需的包实体复制到 `apps/desktop/release-resources/node_modules/`,供 electron-builder 以 `extraResources` 分发到安装目录 `resources/node_modules`。运行时以 `ELECTRON_RUN_AS_NODE` 模式 spawn `electron.exe` 执行 `resources/node_modules/@deepseek-ai/dsh/lib/bin.js`;asar 内无法放原生模块,故 dsh 树不进 asar,应用自身代码才进 asar。

## release-resources 约定

- `apps/desktop/release-resources/` 为构建产物目录(不提交),打包前清空重建,脚本幂等。
- 复制必须 `dereference`:顶层 symlink(workspace / `.pnpm` 布局)在 Windows 打包后会失效,实体复制保证安装后可运行。
- 主路径复制 `@deepseek-ai` 全部 + 各包 `dependencies` 中非 `@deepseek-ai` 的顶层依赖;顶层未覆盖时退路为整体复制 `node_modules`(体积大但可靠,M0 接受)。
- 完成后校验 `release-resources/node_modules/@deepseek-ai/dsh/package.json` 存在并打印体积统计。

## 与 electron-builder.yml 的衔接

`electron-builder.yml` 中 `extraResources` 将 `release-resources/node_modules` 映射到安装目录 `resources/node_modules`,并设置 `npmRebuild: false`(dsh 原生模块已在源机器构建,M0 不重新编译)。`npm run dist` 先执行本脚本再调用 electron-builder,顺序由 `apps/desktop/package.json` 的 `dist` script 保证。

## 用法

```text
node scripts/pack-dsh.mjs
```

无参数,路径从脚本位置推导;仅使用 Node 内置模块。运行前需已 `pnpm install`(需安装 `@deepseek-ai/dsh`)。
