import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);

const copyAssets = () => {
  const coreStyles = resolve(dirname(_require.resolve('@autorender/js/package.json')), 'dist/styles.css');
  const targetDir = resolve(__dirname, 'dist');
  const target = resolve(targetDir, 'styles.css');
  try {
    mkdirSync(targetDir, { recursive: true });
    copyFileSync(coreStyles, target);
    console.log('Copied styles.css to dist/');
  } catch (error) {
    console.error('Failed to copy styles.css', error);
  }

  const viewtagDir = resolve(targetDir, 'viewtag');
  mkdirSync(viewtagDir, { recursive: true });
  copyFileSync(resolve(__dirname, 'src/viewtag/image.vue'), resolve(viewtagDir, 'image.vue'));
  copyFileSync(resolve(__dirname, 'src/viewtag/video.vue'), resolve(viewtagDir, 'video.vue'));
  copyFileSync(resolve(__dirname, 'src/viewtag/provider.vue'), resolve(viewtagDir, 'provider.vue'));
  copyFileSync(resolve(__dirname, 'src/viewtag/provider.ts'), resolve(viewtagDir, 'provider.ts'));
  console.log('Copied Vue components to dist/');
};

const uploadExternal = [
  '@autorender/js',
  '@autorender/js/viewtag/load-videojs',
  'vue',
  'video.js',
  './viewtag/provider.vue',
  './viewtag/image.vue',
  './viewtag/video.vue',
];

const viewtagExternal = [
  '@autorender/js',
  '@autorender/js/viewtag',
  '@autorender/js/viewtag/load-videojs',
  'vue',
  'video.js',
  './provider.vue',
  './image.vue',
  './video.vue',
];

export default [
  defineConfig({
    entry: { index: 'src/index.ts' },
    splitting: false,
    clean: true,
    sourcemap: true,
    format: ['esm', 'cjs'],
    dts: true,
    minify: false,
    target: 'es2020',
    external: uploadExternal,
    onSuccess: copyAssets,
  }),
  defineConfig({
    entry: { viewtag: 'src/viewtag/index.ts' },
    splitting: false,
    clean: false,
    sourcemap: true,
    format: ['esm', 'cjs'],
    dts: true,
    minify: false,
    target: 'es2020',
    external: viewtagExternal,
  }),
  defineConfig({
    entry: { 'vite-config': 'src/vite-config.ts' },
    splitting: false,
    clean: false,
    sourcemap: true,
    format: ['esm'],
    dts: true,
    minify: false,
    target: 'es2020',
    external: ['vite'],
  }),
];
