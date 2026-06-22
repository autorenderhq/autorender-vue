<template>
  <img
    :src="unref(imageAttributes).src"
    :srcset="unref(imageAttributes).srcSet"
    :sizes="unref(imageAttributes).sizes"
    :width="unref(imageAttributes).width"
    :height="height"
    :alt="alt"
    :loading="lazy ? 'lazy' : 'eager'"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed, unref } from 'vue';
import { isGifFormatOutput } from '@autorender/js/viewtag';
import { useAutoRender } from './provider';
import type { TransformOptions } from '@autorender/js/viewtag';

export interface ARImageProps {
  src: string;
  width?: number;
  height?: number;
  transformations?: TransformOptions;
  responsive?: boolean;
  lazy?: boolean;
  sizes?: string;
  alt?: string;
}

const props = withDefaults(defineProps<ARImageProps>(), {
  responsive: true,
  lazy: true
});

const ar = useAutoRender();

const imageAttributes = computed(() => {
  const fullTransform: TransformOptions = {
    ...(props.transformations || {}),
    ...(props.width && { w: props.width }),
    ...(props.height && { h: props.height }),
  };
  const useResponsiveLayout = props.responsive && !isGifFormatOutput(fullTransform);

  if (useResponsiveLayout) {
    return ar.responsiveImageAttributes({
      src: props.src,
      width: props.width,
      sizes: props.sizes,
      transform: fullTransform,
    });
  }
  return {
    src: ar.url(props.src, fullTransform),
    srcSet: undefined,
    sizes: undefined,
    width: props.width,
  };
});
</script>

