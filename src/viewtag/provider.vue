<template>
  <slot />
</template>

<script setup lang="ts">
import { useAutoRenderProvider } from './provider';
import type { AutoRenderProviderOptions } from './provider';

const props = withDefaults(defineProps<{
  baseUrl?: string;
  workspace: string;
  defaults?: AutoRenderProviderOptions['defaults'];
  deviceBreakpoints?: number[];
  imageBreakpoints?: number[];
}>(), {
  baseUrl: 'https://assets.autorender.io'
});

useAutoRenderProvider({
  baseUrl: props.baseUrl,
  workspace: props.workspace,
  defaults: props.defaults,
  deviceBreakpoints: props.deviceBreakpoints,
  imageBreakpoints: props.imageBreakpoints
});
</script>

