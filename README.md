# Autorender Vue SDK

[![npm version](https://img.shields.io/npm/v/@autorender/vue)](https://www.npmjs.com/package/@autorender/vue)
[![CI](https://github.com/autorenderhq/autorender-vue/workflows/CI/badge.svg)](https://github.com/autorenderhq/autorender-vue/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Follow on X](https://img.shields.io/twitter/follow/AutoRenderHQ?label=Follow&style=social)](https://x.com/AutoRenderHQ)

## Introduction

Autorender Vue SDK provides a simple way to integrate Autorender with your Vue 3 and Nuxt applications. It allows you to:

- Upload files with a fully-featured, customizable upload widget (`createAutorenderUploader`, `useAutorenderUploader`)
- Serve optimized images with automatic format selection, responsive sizes, and real-time transformations (`<ARImage>`, `useAutoRenderProvider`)
- Stream video with HLS and DASH support via an optional Video.js integration (`<ARVideo>`)

## TypeScript support

The SDK is written in TypeScript with full type definitions included. No additional `@types` packages needed.

## Installation

```bash
npm install @autorender/vue
# or
pnpm add @autorender/vue
# or
yarn add @autorender/vue
```

> Requires **Vue ≥ 3.0**. The plugin works with **Vite ^4 / ^5 / ^6 / ^7**.

## Vite setup (required for `<ARVideo>`)

If you only use the **uploader** or **`<ARImage>`**, you can skip this section — no extra Vite configuration is needed.

If you use **`<ARVideo>`** (Video.js / HLS / DASH), add the **`autorenderVue()` Vite plugin**. It is the **only thing you need** — no manual aliases, no shim files, no `patch-package`. It works the same way on **npm, pnpm, yarn, CodeSandbox, StackBlitz, and Nuxt**.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { autorenderVue } from '@autorender/vue/vite';

export default defineConfig({
  plugins: [vue(), autorenderVue()],
});
```

**What the plugin does for you** (so you don't have to):

- Transparently shims the CommonJS sub-modules that `video.js` pulls in (`global/window`, `global/document`, `@videojs/xhr`, `@xmldom/xmldom`, `mux.js/lib/utils/clock`, `mux.js/lib/tools/parse-sidx`, `videojs-vtt.js`). Without this, Vite throws:
  - `does not provide an export named 'default'`
  - `does not provide an export named 'DOMParser'`
  - `does not provide an export named 'ONE_SECOND_IN_TS'`
- Configures `optimizeDeps.exclude` and `optimizeDeps.esbuildOptions.define = { global: 'globalThis' }`.
- Configures `ssr.noExternal` so the same setup works for SSR / SSG (Nuxt, Vite SSR).

### Options

```ts
autorenderVue({ videoShims: false }); // disable Video.js CJS shims
```

| Option | Default | When to set |
|---|---|---|
| `videoShims` | `true` | Set `false` if you do **not** use `<ARVideo>` and want to avoid touching `optimizeDeps` / `ssr.noExternal`. |

### Nuxt 3

In `nuxt.config.ts` add the plugin via `vite.plugins`:

```ts
import { defineNuxtConfig } from 'nuxt/config';
import { autorenderVue } from '@autorender/vue/vite';

export default defineNuxtConfig({
  vite: {
    plugins: [autorenderVue()],
  },
});
```

For SSR-sensitive code (the uploader, `<ARVideo>`), wrap usages in `<ClientOnly>` or call them from `onMounted`.

### CodeSandbox / StackBlitz (pnpm)

These environments use **pnpm** which isolates packages and breaks ad-hoc `resolve.alias` shims. The plugin handles pnpm correctly out of the box — no additional configuration needed. Just `pnpm add @autorender/vue` and add `autorenderVue()` to `plugins`.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `Uncaught SyntaxError: ... does not provide an export named 'default'` for `global/window`, `@videojs/xhr`, `videojs-vtt.js`, `mux.js/...`, `@xmldom/xmldom` | Make sure `autorenderVue()` is in your `plugins` array (and that you're on `@autorender/vue ≥ 0.1.44`). Then restart the dev server and clear the Vite cache: `rm -rf node_modules/.vite && npm run dev`. |
| Stale errors after upgrading the SDK | Delete `node_modules/.vite` and re-run `npm run dev`. Vite caches pre-bundled deps aggressively. |
| Upgrading from `< 0.1.44` (legacy `autorenderVueViteResolveAliases` / `autorenderVueViteConfig`) | Replace `mergeConfig({...}, autorenderVueViteConfig(...))` and any custom `resolve.alias` entries with a single `autorenderVue()` plugin entry. The legacy helpers are still exported (deprecated) so existing configs keep working, but they're no-ops now — the plugin does the work. |

## Production use

- **Upload API key**: The uploader runs in the browser, so any key you pass to `createAutorenderUploader` / `useAutorenderUploader` is visible to visitors. Use a restricted upload key from the Autorender dashboard, and load it from environment variables (e.g. `import.meta.env.VITE_AUTORENDER_API_KEY` in Vite, `process.env.NUXT_PUBLIC_AUTORENDER_API_KEY` in Nuxt). Do not ship production secrets in your frontend bundle.
- **Workspace**: The `workspace` you pass to `useAutoRenderProvider` is not secret; it appears in public image URLs.
- **Client-only mounting**: Instantiate the uploader in `onMounted` (as in the examples below) so the DOM container exists and SSR / static prerender does not run browser-only code too early.
- **Nuxt / SSR**: Call `useAutoRenderProvider` from a client layout or a plugin with `mode: 'client'` if you see hydration issues. Keep the upload widget on the client the same way (`onMounted` or `<ClientOnly>`).

## Upload SDK Usage

### Option 1: Direct function (Recommended)

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createAutorenderUploader } from '@autorender/vue';
import type { UploaderInstance } from '@autorender/vue';
import '@autorender/vue/styles';

const containerRef = ref<HTMLDivElement | null>(null);
let uploader: UploaderInstance | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  
  uploader = createAutorenderUploader(containerRef.value, {
    apiKey: import.meta.env.VITE_AUTORENDER_API_KEY,
    type: 'inline',
    allowMultiple: true,
    theme: 'system',
    sources: ['local', 'camera'],
    onSuccess: ({ files }) => console.log('Uploaded', files),
  });
});

onUnmounted(() => {
  uploader?.destroy();
});
</script>

<template>
  <div ref="containerRef" class="uploader-container"></div>
</template>
```

### Option 2: Composable

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useAutorenderUploader } from '@autorender/vue';
import '@autorender/vue/styles';

const containerRef = ref<HTMLDivElement | null>(null);

const uploader = useAutorenderUploader({
  apiKey: import.meta.env.VITE_AUTORENDER_API_KEY,
  type: 'inline',
  containerRef,
});
</script>

<template>
  <div ref="containerRef" class="uploader-container"></div>
</template>
```

## ViewTag SDK Usage

### Setup Provider

```vue
<script setup lang="ts">
import { useAutoRenderProvider } from '@autorender/vue/viewtag';

useAutoRenderProvider({
  baseUrl: 'https://assets.autorender.io',
  workspace: 'ws_123',
  defaults: {}
});
</script>
```

### Use ARImage Component

```vue
<template>
  <ARImage
    src="products/shoe.jpg"
    :width="400"
    :height="400"
    alt="Shoe"
    :transformations="{ fit: 'cover' }"
    :responsive="true"
    :lazy="true"
  />
</template>

<script setup lang="ts">
import { ARImage } from '@autorender/vue/viewtag';
</script>
```

### Use ARVideo Component (Video.js)

```vue
<template>
  <ARVideo
    src="docs/skateboarding.mp4"
    :width="960"
    :height="540"
    :controls="true"
    preload="metadata"
    :transformations="{ w: 960, h: 540 }"
  />
</template>

<script setup lang="ts">
import { ARVideo } from '@autorender/vue/viewtag';
</script>
```

Supports MP4, HLS (`.m3u8`), and DASH (`.mpd`) sources.

### Common video transformations

Some transforms produce an image (thumbnail, GIF) — use `<ARImage>` for those instead of `<ARVideo>`.

```vue
<!-- Thumbnail frame — use ARImage, not ARVideo -->
<ARImage
  src="docs/skateboarding.mp4"
  :width="320"
  :height="220"
  alt="Thumbnail"
  :transformations="{ thumb_ar: true }"
/>

<!-- Animated GIF — use ARImage -->
<ARImage
  src="docs/skateboarding.mp4"
  :width="320"
  :height="220"
  alt="GIF preview"
  :transformations="{ f: 'gif' }"
/>

<!-- Trim a clip (2s – 8s) -->
<ARVideo
  src="docs/skateboarding.mp4"
  :width="720"
  :height="405"
  :controls="true"
  :transformations="{ so: 2, eo: 8 }"
/>

<!-- Pad to 16:9 with white background -->
<ARVideo
  src="docs/skateboarding.mp4"
  :width="720"
  :height="405"
  :controls="true"
  :transformations="{ ar: '16:9', cm_pad_resize: true, bg: 'white' }"
/>
```


### Use AR Instance Directly

```vue
<template>
  <img :src="imageUrl" :srcset="attrs.srcSet" :sizes="attrs.sizes" :width="attrs.width" alt="Image" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAutoRender } from '@autorender/vue/viewtag';

const AR = useAutoRender();

const imageUrl = computed(() => AR.url('image.jpg', { w: 300, h: 300, fit: 'cover' }));
const transformString = computed(() => AR.transformString({ w: 300, h: 300 }));
const dpr = computed(() => AR.getDPR());

const attrs = computed(() => AR.responsiveImageAttributes({
  src: 'hero.jpg',
  width: 1200,
  sizes: '(min-width: 800px) 50vw, 100vw',
  transform: { fit: 'cover' }
}));
</script>
```

## API Reference

### Upload SDK

#### `createAutorenderUploader(element, options)`

Creates a new uploader instance on the given element.

**Parameters:**
- `element: HTMLElement` - Target element
- `options: AutorenderVueOptions` - Uploader options

**Returns:** `UploaderInstance`

#### `useAutorenderUploader(options)`

Vue composable that returns an uploader instance.

**Parameters:**
- `options: AutorenderVueOptions & { containerRef: Ref<HTMLElement | null> }` - Uploader options with container ref

**Returns:** `UploaderInstance | null`

### ViewTag SDK

#### `useAutoRenderProvider(options): ARInstance`

Composable that provides AR instance to child components via Vue's provide/inject.

**Parameters:**
- `options: AutoRenderProviderOptions` - AR configuration
  - `baseUrl?: string` - Base URL (default: `'https://assets.autorender.io'`)
  - `workspace: string` - Your workspace ID
  - `defaults?: { f?: string, q?: string | number }` - Default transformations
  - `deviceBreakpoints?: number[]` - Device breakpoints
  - `imageBreakpoints?: number[]` - Image breakpoints
  - `enableDPR?: boolean` - Enable device pixel ratio (default: `true`)
  - `enableResponsive?: boolean` - Enable responsive images (default: `true`)

**Returns:** `ARInstance`

#### `<ARImage />`

Vue component that wraps `<img>` with AutoRender transformations.

**Props:**
- `src: string` - Image source path (required)
  - Supports workspace paths (e.g., `products/shoe.jpg`) and absolute remote URLs (e.g., `https://example.com/image.jpg`).
- `width?: number` - Image width in pixels
- `height?: number` - Image height in pixels
- `transformations?: TransformOptions` - Transformation options
- `responsive?: boolean` - Enable responsive images (default: `true`)
- `lazy?: boolean` - Enable lazy loading (default: `true`)
- `sizes?: string` - Sizes attribute for responsive images
- All standard `<img>` HTML attributes are forwarded (e.g., `alt`, `class`, `style`, `@click`, etc.)

#### `useAutoRender(): ARInstance`

Composable to inject the AR instance from parent provider.

**Returns:** `ARInstance` with methods:
- `url(src: string, transform?: TransformOptions): string` - Generate image URL
- `transformString(transform: TransformOptions): string` - Get transformation string only
- `responsiveImageAttributes(options: ResponsiveOptions): ResponsiveAttributes` - Generate responsive image attributes
- `getDPR(): number` - Get device pixel ratio

## Documentation

See the [full documentation](https://autorender.io/docs) for complete API reference.
