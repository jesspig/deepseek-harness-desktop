/**
 * Build the browser client bundle for @dsh-desktop/client with esbuild.
 *
 * The desktop client-modules runtime requires the plugin's browser artifact
 * (lib/client.js) to register itself via
 * `window.__ModuleLoader__.load({ id, factory })` — the official tsdown
 * clientBundle closure-factory format (format cjs, platform browser, externals
 * resolved through the injected require against the loader module table).
 *
 * `tsc` (run by `build` before this script) emits the node half (`lib/index.js`)
 * and type declarations. This script overwrites only `lib/client.js` (plus its
 * sourcemap) with the wrapped CJS factory — it never touches the node half.
 *
 * Idempotent: safe to run repeatedly. Exits non-zero on failure.
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url) // package root (…/desktop-client/)

// The bundle must end on the CJS wrapper exactly as the loader expects:
// factory opens with the banner+intro, and the build body lands between them,
// closing with the footer. No stray output allowed after the footer.
const banner = [
  'window.__ModuleLoader__.load({ id: "@dsh-desktop/client", factory: (require) => {',
  'var module = { exports: {} }; var exports = module.exports;',
].join('\n')
const footer = 'return module.exports; } });'

try {
  await build({
    entryPoints: [fileURLToPath(new URL('src/client.tsx', root))],
    outfile: fileURLToPath(new URL('lib/client.js', root)),
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    // Platform modules answered by the loader module table through the injected
    // require: react family only. @deepseek-ai/* imports in src/client.tsx are all
    // `import type` — erased at build time — so no external entries are needed
    // for them (and esbuild's external only accepts strings, not regexes).
    external: ['react', 'react/jsx-runtime'],
    banner: { js: banner },
    footer: { js: footer },
    sourcemap: true,
    // keep the default loader for .tsx (jsx handled implicitly by esbuild)
  })
} catch (error) {
  // non-zero exit so a failed bundle fails the build pipeline
  console.error('[build-client] failed to bundle lib/client.js:', error)
  process.exit(1)
}

console.log('[build-client] wrote lib/client.js (loader-wrapped CJS factory)')