<template>
  <div v-bind="wrapperAttrs">
    <video ref="videoEl" class="video-js vjs-default-skin"></video>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { loadVideoJs } from '@autorender/js/viewtag/load-videojs';
import { useAutoRender } from './provider';
import type { TransformOptions } from '@autorender/js/viewtag';

type VideoJsPlayer = any;
type StreamingType = 'hls' | 'dash';

interface VideoStreamingOptions {
  type: StreamingType;
  resolutions: number[];
}

type ARVideoTransformations = TransformOptions & {
  streaming?: VideoStreamingOptions;
};

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export interface ARVideoProps {
  src: string;
  width?: number;
  height?: number;
  transformations?: ARVideoTransformations;
  fallback?: string;
  poster?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  playsInline?: boolean;
  className?: string;
  style?: Record<string, unknown>;
  playerOptions?: Record<string, unknown>;
}

const props = withDefaults(defineProps<ARVideoProps>(), {
  controls: true,
  autoPlay: false,
  muted: false,
  loop: false,
  preload: 'metadata',
  playsInline: true,
});

const ar = useAutoRender();
const videoEl = ref<HTMLVideoElement | null>(null);
let player: VideoJsPlayer | null = null;
let lastResolvedSrc: string | null = null;
let fallbackApplied = false;
const showPlaceholder = ref(false);

const rootClassName = computed(() => ['ar-video', props.className].filter(Boolean).join(' '));

const resolvedSrc = computed(() => {
  const streamingConfig = props.transformations?.streaming;
  const streamingType: StreamingType | undefined = streamingConfig?.type;
  const streamingResolutions = streamingConfig?.resolutions || [];
  const streamingToken =
    streamingResolutions.length > 0
      ? `st_${streamingResolutions.map((value: number) => Math.round(value)).join('_')}`
      : undefined;
  const manifestSuffix =
    streamingType === 'hls' ? '/ar-master.m3u8' : streamingType === 'dash' ? '/ar-master.mpd' : '';
  const normalizedSrc =
    manifestSuffix && !props.src.endsWith('/ar-master.m3u8') && !props.src.endsWith('/ar-master.mpd')
      ? `${props.src.replace(/\/+$/, '')}${manifestSuffix}`
      : props.src;
  const fullTransform = {
    ...props.transformations,
    streaming: undefined,
    ...(streamingToken && { [streamingToken]: true }),
    ...(props.width && { w: props.width }),
    ...(props.height && { h: props.height }),
  };
  const hasTransform = Object.keys(fullTransform).length > 0;
  if (isAbsoluteUrl(normalizedSrc) && !hasTransform) {
    return normalizedSrc;
  }
  return ar.url(normalizedSrc, fullTransform);
});

const containerStyle = computed(() => ({
  width: props.width !== undefined ? props.width : '100%',
  position: 'relative' as const,
  display: 'block' as const,
  backgroundColor: showPlaceholder.value ? '#e5e7eb' : undefined,
  ...(props.style || {}),
}));

const wrapperAttrs = computed(() => ({
  'data-vjs-player': true,
  class: rootClassName.value,
  style: containerStyle.value,
}));

function applyVjsDimensions() {
  if (!player) return;
  if (props.width !== undefined || props.height !== undefined) {
    const vjsEl = player.el() as HTMLElement;
    if (vjsEl) {
      vjsEl.style.width = props.width !== undefined ? `${props.width}px` : '100%';
      vjsEl.style.height = props.height !== undefined ? `${props.height}px` : 'auto';
      vjsEl.style.paddingTop = '0';
    }
  }
}
const resolvedFallback = computed(() => {
  if (!props.fallback) return undefined;
  return isAbsoluteUrl(props.fallback) ? props.fallback : ar.url(props.fallback);
});

onMounted(() => {
  if (!videoEl.value) return;

  void loadVideoJs().then((videojs) => {
    if (!videoEl.value || player) return;

    player = videojs(videoEl.value, {
    controls: props.controls,
    autoplay: props.autoPlay,
    muted: props.muted,
    loop: props.loop,
    preload: props.preload,
    playsinline: props.playsInline,
    poster: props.poster,
    restoreEl: true,
    fluid: true,
    aspectRatio: '16:9',
    responsive: false,
    sources: [{ src: resolvedSrc.value }],
    ...(props.playerOptions || {}),
  });

  applyVjsDimensions();

  player.on('error', () => {
    if (!player) return;
    if (resolvedFallback.value && !fallbackApplied) {
      fallbackApplied = true;
      player.src([{ src: resolvedFallback.value }]);
      lastResolvedSrc = resolvedFallback.value;
      return;
    }
    showPlaceholder.value = true;
  });
  player.on('loadeddata', () => {
    showPlaceholder.value = false;
  });
  player.on('canplay', () => {
    showPlaceholder.value = false;
  });
  });
});

watch(
  () => [
    resolvedSrc.value,
    props.autoPlay,
    props.muted,
    props.loop,
    props.poster,
    props.width,
    props.height,
  ],
  () => {
    if (!player) return;
    player.poster(props.poster || '');
    player.autoplay(props.autoPlay);
    player.muted(props.muted);
    player.loop(props.loop);
    applyVjsDimensions();
    if (lastResolvedSrc !== resolvedSrc.value) {
      fallbackApplied = false;
      showPlaceholder.value = false;
      player.src([{ src: resolvedSrc.value }]);
      lastResolvedSrc = resolvedSrc.value;
    }
  }
);

onBeforeUnmount(() => {
  if (player) {
    player.dispose();
    player = null;
  }
});
</script>
