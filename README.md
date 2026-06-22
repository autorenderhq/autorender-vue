# @autorender/vue

Autorender SDK adapter for Vue - Upload and ViewTag functionality.

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
import { useAutoRenderProvider } from '@autorender/vue';

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
import { ARImage } from '@autorender/vue';
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
import { ARVideo } from '@autorender/vue';
</script>
```

Supports MP4, HLS (`.m3u8`), and DASH (`.mpd`) sources.

### Complete Transform Example

```vue
<template>
  <ARImage
    src="hero.jpg"
    :width="1200"
    :height="800"
    alt="Hero image"
    :transformations="transform"
    :responsive="true"
    :lazy="true"
    sizes="(min-width: 1200px) 1200px, 100vw"
    class="hero-image"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ARImage } from '@autorender/vue';
import type { TransformOptions } from '@autorender/js';

const transform = ref<TransformOptions>({
  // Size & Crop
  w: 1200,
  h: 800,
  fit: 'cover', // 'crop' | 'fill' | 'fit' | 'scale'
  ar: '16:9', // Aspect ratio
  position: 'center', // Position: 'p_c' | 'p_tl' | 'p_tr' | 'p_bl' | 'p_br' | 'p_t' | 'p_b' | 'p_l' | 'p_r' or full names
  position_startagy: 'attention', // User passes: 'entropy' | 'attention' (SDK generates ps_*)
  
  // Transform
  r: 0, // Rotation: number (0-360) | 'portrait' | 'landscape'
  z: 1.2, // Zoom level
  flip: 'h', // 'h' | 'v' | 'hv' | 'vh'
  br: 20, // Border radius in pixels
  
  // Format & Quality
  f: 'auto', // 'auto' | 'webp' | 'jpg' | 'png' | 'avif'
  q: 'auto', // 'auto' | 'auto:best' | number (1-100)
  
  // Background
  bg: 'rgb:FF5733', // Background color
  
  // Kernel
  k: 'lanczos3', // 'nearest' | 'linear' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3'
  
  // DPR
  dpr: 2, // Device pixel ratio (0.1-10)
  
  // Effects
  improve: true, // Auto-enhancement
  unsharpMask: 100, // Unsharp mask strength (1-2000)
  saturation: 20, // Saturation adjustment (-100 to 100)
  contrast: 15, // Contrast adjustment (-100 to 100)
  brightness: 10, // Brightness adjustment (-99 to 100)
  gamma: 0, // Gamma correction (-50 to 150)
  sharpen: 50, // Sharpen: boolean | number (1-2000)
  grayscale: false, // Convert to grayscale
  blackwhite: 50, // Black and white balance (0-100)
  hue: 0, // Hue rotation (-180 to 180)
  warmth: 0, // Warmth adjustment (-100 to 100)
  tint: 0, // Tint adjustment (-100 to 100)
  normalize: false, // Normalize histogram
  invert: false, // Invert colors
  fade: 0, // Fade effect (0-100)
  vignette: 0, // Vignette strength (0-100)
  highlights: 0, // Highlights adjustment (-100 to 100)
  shadows: 0, // Shadows adjustment (-100 to 100)
  exposure: 0, // Exposure adjustment (-100 to 100)
  structure: 0, // Structure/clarity (0-100)
  autoEnhance: false, // Auto enhance
  temperature: 0, // Temperature adjustment (-100 to 100)
  blur: 0, // Blur amount (0-20)
  
  // Layers
  layers: [
    {
      type: 'image',
      imagePath: 'logo.png',
      layerType: 'overlay', // 'overlay' | 'underlay'
      width: 200,
      height: 200,
      placement: 'north-east', // Human-readable placement
      x: 0,
      y: 0,
      opacity: 100,
      rotation: 0,
    },
    {
      type: 'text',
      text: 'Hello World',
      fontFamily: 'arial',
      fontSize: 24,
      fontStyle: 'bold',
      fontColor: 'FF0000',
      placement: 'south',
      x: 0,
      y: -20,
      rotation: 0,
    }
  ],
  
  // Blend mode
  blend: 'overlay', // 'screen' | 'overlay' | 'multiply' | 'mask' | 'anti_removal'
});
</script>
```

### Use AR Instance Directly

```vue
<template>
  <img :src="imageUrl" :srcset="attrs.srcSet" :sizes="attrs.sizes" :width="attrs.width" alt="Image" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAutoRender } from '@autorender/vue';

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
- `transformations?: TransformOptions` - Transformation options (see TransformOptions Reference below)
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
## TransformOptions Reference

All transformation parameters available in the `transformations` prop. See [full documentation](https://autorender.mintlify.app) for complete reference.

### Size & Crop
- `w?: number` - Width in pixels
- `h?: number` - Height in pixels
- `fit?: 'crop' | 'fill' | 'fit' | 'scale'` - Crop mode
- `ar?: string` - Aspect ratio (e.g., `"16:9"`)
- `position?: 'p_c' | 'p_tl' | 'p_tr' | 'p_bl' | 'p_br' | 'p_t' | 'p_b' | 'p_l' | 'p_r' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right'` - Position
- `position_startagy?: 'entropy' | 'attention'` - Position strategy (SDK generates `ps_` prefix)

### Preset (named transformation)
- `preset?: string` - Optional named preset, which becomes a leading `t_<preset>` segment in the URL.

  Example:
  ```vue
  <ARImage
    src="avatar.png"
    :width="100"
    :height="100"
    alt="Unavailable avatar"
    :transformations="{ preset: 'unavailable', w: 100, h: 100 }"
  />
  <!-- Results in: /workspace/t_unavailable,w_100,h_100/avatar.png -->
  ```

### Transform
- `r?: number | 'portrait' | 'landscape'` - Rotation
- `z?: number` - Zoom level
- `flip?: 'h' | 'v' | 'hv' | 'vh'` - Flip direction
- `br?: number` - Border radius

### Format & Quality
- `f?: string` - Format (`"auto"`, `"webp"`, `"jpg"`, etc.)
- `q?: string | number` - Quality (`"auto"` or 1-100)

### Effects
- `improve?: boolean | string | object` - Auto-enhancement
- `saturation?: number` - Saturation (-100 to 100)
- `contrast?: number` - Contrast (-100 to 100)
- `brightness?: number` - Brightness (-99 to 100)
- `sharpen?: boolean | number` - Sharpen
- `grayscale?: boolean` - Convert to grayscale
- `blur?: number` - Blur amount (0-20)
- `vignette?: number` - Vignette strength (0-100)
- `exposure?: number` - Exposure (-100 to 100)
- And many more... (see [full documentation](https://autorender.mintlify.app) for complete list)

### Layers
- `layers?: LayerOptions[]` - Array of layer options
  - Image layers: `{ type: 'image', imagePath: string, layerType?: 'overlay' | 'underlay', ... }`
  - Text layers: `{ type: 'text', text: string, fontFamily?: string, fontSize?: number, ... }`

## Documentation

See the [full documentation](https://autorender.mintlify.app) for complete API reference.
