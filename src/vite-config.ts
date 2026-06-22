/**
 * Vite plugin for `@autorender/vue`.
 *
 * `video.js` (used by `<ARVideo>`) ships a number of CommonJS-only sub-modules
 * (`global/window`, `global/document`, `@videojs/xhr`, `@xmldom/xmldom`,
 * `mux.js/lib/utils/clock`, `mux.js/lib/tools/parse-sidx`, `videojs-vtt.js`)
 * whose `module.exports = ...` pattern Vite cannot consistently translate
 * into ESM `default` / named imports, producing browser errors like
 * *"does not provide an export named 'default'"* or *"… 'DOMParser'"*.
 *
 * This plugin transparently shims each problematic specifier into a small
 * virtual ESM module that re-exports the values the importer expects. The
 * shim itself imports the underlying package via a **bare specifier**, which
 * lets Vite's normal pre-bundle pipeline (esbuild) handle CJS-to-ESM interop
 * properly. The plugin also configures `optimizeDeps.include` and
 * `ssr.noExternal` so the same setup works on **npm, pnpm, yarn,
 * CodeSandbox, StackBlitz and Nuxt**.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import vue from '@vitejs/plugin-vue';
 * import { autorenderVue } from '@autorender/vue/vite';
 *
 * export default defineConfig({
 *   plugins: [vue(), autorenderVue()],
 * });
 * ```
 */

// We intentionally avoid importing concrete `Plugin` / `UserConfig` types from
// `vite`. In monorepos (and pnpm) the consumer's `vite` install is often a
// different copy than the one resolved while building this package, which leads
// to "Type 'Plugin<any>' is not assignable to type 'PluginOption'" errors.
// The structural shape below is a strict subset of Vite's `Plugin`, so the
// consumer's TypeScript will accept it as a valid `PluginOption` regardless of
// which `vite` version is installed.

/** Structural shape of a Vite plugin — wide enough to satisfy any `vite` install. */
export interface AutorenderVuePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  config?: () => Record<string, unknown> | undefined;
  resolveId: (
    source: string,
    importer: string | undefined,
  ) => string | null;
  load: (id: string) => string | null;
}

const VIRTUAL_PREFIX = '\0autorender-vue:';

/** Map of bare specifier the consumer (or `video.js`) imports → virtual shim id. */
const SHIM_TARGETS: Record<string, string> = {
  'global/window': 'global-window',
  'global/document': 'global-document',
  '@videojs/xhr': 'videojs-xhr',
  '@xmldom/xmldom': 'xmldom',
  'mux.js/lib/utils/clock': 'mux-clock',
  'mux.js/lib/tools/parse-sidx': 'mux-parse-sidx',
  'videojs-vtt.js': 'videojs-vtt',
  'videojs-vtt.js/lib/browser-index': 'videojs-vtt',
  'videojs-vtt.js/lib/browser-index.js': 'videojs-vtt',
};

/**
 * Tell Vite to pre-bundle these specifiers via esbuild. Pre-bundling is what
 * provides correct `default` / named export interop for the underlying CJS
 * packages, so our shims (which import these via bare specifiers) work.
 *
 * We use Vite's **`'parent > nested'`** syntax for the transitive dependencies
 * so they resolve correctly on **pnpm** (CodeSandbox, StackBlitz) — pnpm puts
 * transitive deps inside `.pnpm/video.js@x.y.z/node_modules/` rather than at
 * the project root, so a bare specifier like `mux.js/...` is unreachable from
 * our virtual shim's context. The `'video.js > mux.js/...'` form tells Vite
 * to scan for `mux.js/...` using `video.js`'s resolution context, which
 * works on both flat (npm/yarn) and isolated (pnpm) installs.
 *
 * The plain `'video.js'` entry pre-bundles Video.js itself.
 */
const OPTIMIZE_DEPS_INCLUDE = [
  'video.js',
  'video.js > @videojs/xhr',
  'video.js > @xmldom/xmldom',
  'video.js > mux.js/lib/utils/clock',
  'video.js > mux.js/lib/tools/parse-sidx',
  'video.js > videojs-vtt.js/lib/vtt.js',
  'video.js > videojs-vtt.js/lib/vttcue.js',
  'video.js > videojs-vtt.js/lib/vttregion.js',
];

const SSR_NO_EXTERNAL = [
  'video.js',
  '@videojs/xhr',
  '@xmldom/xmldom',
  'mux.js',
  'videojs-vtt.js',
  'global',
];

export interface AutorenderVueOptions {
  /**
   * Disable the CJS interop shims for `video.js` sub-modules.
   * Set to `false` if you don't use `<ARVideo>` and want to opt out of the
   * `optimizeDeps` / `ssr.noExternal` adjustments.
   * @default true
   */
  videoShims?: boolean;
}

/**
 * Vite plugin for `@autorender/vue`. Add it to your `plugins` array.
 *
 * @example
 * ```ts
 * import { autorenderVue } from '@autorender/vue/vite';
 *
 * export default defineConfig({
 *   plugins: [vue(), autorenderVue()],
 * });
 * ```
 */
export function autorenderVue(options: AutorenderVueOptions = {}): AutorenderVuePlugin {
  const enableVideoShims = options.videoShims !== false;

  return {
    name: '@autorender/vue',
    enforce: 'pre',

    config() {
      if (!enableVideoShims) return undefined;
      return {
        optimizeDeps: {
          include: OPTIMIZE_DEPS_INCLUDE,
          esbuildOptions: {
            define: { global: 'globalThis' },
          },
        },
        ssr: {
          noExternal: SSR_NO_EXTERNAL,
        },
      };
    },

    resolveId(source, importer) {
      if (!enableVideoShims) return null;
      // Don't intercept imports made FROM our own virtual shims — let Vite's
      // normal resolver handle them (which triggers the proper esbuild
      // pre-bundle CJS-to-ESM interop). Without this guard we'd infinite-loop
      // when the shim re-imports the same bare specifier we just hijacked.
      if (importer && importer.startsWith(VIRTUAL_PREFIX)) return null;
      const target = SHIM_TARGETS[source];
      if (!target) return null;
      return VIRTUAL_PREFIX + target;
    },

    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const target = id.slice(VIRTUAL_PREFIX.length);
      return generateShim(target);
    },
  };
}

function generateShim(target: string): string {
  switch (target) {
    case 'global-window':
      return `export default typeof window !== 'undefined' ? window : globalThis;\n`;

    case 'global-document':
      return `export default typeof document !== 'undefined' ? document : {};\n`;

    case 'videojs-xhr':
      // `@videojs/xhr` does `module.exports = createXHR; module.exports.default = createXHR;`
      // We accept both interop shapes (default property OR direct function).
      return [
        `import * as ns from '@videojs/xhr';`,
        `const mod = ns && (ns.default !== undefined ? ns.default : ns);`,
        `const createXHR = (typeof mod === 'function')`,
        `  ? mod`,
        `  : (mod && typeof mod.default === 'function' ? mod.default : mod);`,
        `export { createXHR };`,
        `export default createXHR;`,
        ``,
      ].join('\n');

    case 'xmldom':
      return [
        `import * as ns from '@xmldom/xmldom';`,
        `const m = ns && (ns.default !== undefined ? ns.default : ns);`,
        `export const DOMParser = m.DOMParser;`,
        `export const XMLSerializer = m.XMLSerializer;`,
        `export const DOMImplementation = m.DOMImplementation;`,
        `export default m;`,
        ``,
      ].join('\n');

    case 'mux-clock':
      return [
        `import * as ns from 'mux.js/lib/utils/clock';`,
        `const m = ns && (ns.default !== undefined && typeof ns.default === 'object' ? ns.default : ns);`,
        `export const ONE_SECOND_IN_TS = m.ONE_SECOND_IN_TS;`,
        `export const secondsToVideoTs = m.secondsToVideoTs;`,
        `export const secondsToAudioTs = m.secondsToAudioTs;`,
        `export const videoTsToSeconds = m.videoTsToSeconds;`,
        `export const audioTsToSeconds = m.audioTsToSeconds;`,
        `export const audioTsToVideoTs = m.audioTsToVideoTs;`,
        `export const videoTsToAudioTs = m.videoTsToAudioTs;`,
        `export const metadataTsToSeconds = m.metadataTsToSeconds;`,
        `export default m;`,
        ``,
      ].join('\n');

    case 'mux-parse-sidx':
      return [
        `import * as ns from 'mux.js/lib/tools/parse-sidx';`,
        `const mod = ns && (ns.default !== undefined ? ns.default : ns);`,
        `const parseSidx = (typeof mod === 'function') ? mod : (mod && typeof mod.default === 'function' ? mod.default : mod);`,
        `export { parseSidx };`,
        `export default parseSidx;`,
        ``,
      ].join('\n');

    case 'videojs-vtt':
      // `videojs-vtt.js/lib/browser-index.js` does `module.exports = { WebVTT, VTTCue, VTTRegion }`
      // and mutates `window.vttjs`. We import the leaf CJS files (each is
      // `module.exports = SomeClass`) so esbuild's interop reliably gives us
      // the constructors, then replicate the side effects.
      return [
        `import * as vttNS from 'videojs-vtt.js/lib/vtt.js';`,
        `import * as cueNS from 'videojs-vtt.js/lib/vttcue.js';`,
        `import * as regNS from 'videojs-vtt.js/lib/vttregion.js';`,
        `function _pick(ns) { var v = ns && (ns.default !== undefined ? ns.default : ns); return (v && typeof v.default === 'function') ? v.default : v; }`,
        `const WebVTT = _pick(vttNS);`,
        `const VTTCue = _pick(cueNS);`,
        `const VTTRegion = _pick(regNS);`,
        `const vttjs = { WebVTT, VTTCue, VTTRegion };`,
        `const _w = typeof window !== 'undefined' ? window : globalThis;`,
        `const cueShim = vttjs.VTTCue;`,
        `const regionShim = vttjs.VTTRegion;`,
        `const nativeVTTCue = _w.VTTCue;`,
        `const nativeVTTRegion = _w.VTTRegion;`,
        `vttjs.shim = function () { _w.VTTCue = cueShim; _w.VTTRegion = regionShim; };`,
        `vttjs.restore = function () { _w.VTTCue = nativeVTTCue; _w.VTTRegion = nativeVTTRegion; };`,
        `if (!_w.VTTCue) vttjs.shim();`,
        `_w.vttjs = vttjs;`,
        `_w.WebVTT = vttjs.WebVTT;`,
        `export { WebVTT, VTTCue, VTTRegion };`,
        `export const shim = vttjs.shim;`,
        `export const restore = vttjs.restore;`,
        `export default vttjs;`,
        ``,
      ].join('\n');

    default:
      return `// unknown autorender shim: ${target}\nexport default {};\n`;
  }
}

/* ------------------------------------------------------------------ */
/* Backwards-compatible helpers (deprecated since 0.1.44)             */
/* ------------------------------------------------------------------ */

/** @deprecated Use `autorenderVue()` plugin instead. */
export type AutorenderVueViteAlias = { find: string | RegExp; replacement: string };

/** @deprecated Use `autorenderVue()` plugin instead. */
export type AutorenderVueVitePatch = {
  resolve: { alias: AutorenderVueViteAlias[] };
  optimizeDeps: { include: string[]; exclude: string[]; esbuildOptions: { define: { global: string } } };
  ssr: { noExternal: string[] };
};

/**
 * @deprecated Use the `autorenderVue()` plugin (recommended) — it works on
 * pnpm/yarn-pnp/CodeSandbox without further setup.
 */
export function autorenderVueViteResolveAliases(): AutorenderVueViteAlias[] {
  return [];
}

/**
 * @deprecated Use the `autorenderVue()` plugin (recommended).
 */
export function autorenderVueViteConfig(_isDev = true): AutorenderVueVitePatch {
  return {
    resolve: { alias: [] },
    optimizeDeps: {
      include: OPTIMIZE_DEPS_INCLUDE,
      exclude: [],
      esbuildOptions: { define: { global: 'globalThis' } },
    },
    ssr: { noExternal: SSR_NO_EXTERNAL },
  };
}
