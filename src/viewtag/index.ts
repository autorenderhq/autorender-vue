export { useAutoRenderProvider, useAutoRender } from './provider';
export type { AutoRenderProviderOptions } from './provider';
export { default as AutoRenderProvider } from './provider.vue';
export { default as ARImage } from './image.vue';
export { default as ARVideo } from './video.vue';

export interface ARImageProps {
  src: string;
  width?: number;
  height?: number;
  transformations?: import('@autorender/js/viewtag').TransformOptions;
  responsive?: boolean;
  lazy?: boolean;
  sizes?: string;
  alt?: string;
}

export interface ARVideoProps {
  src: string;
  width?: number;
  height?: number;
  transformations?: import('@autorender/js/viewtag').TransformOptions & {
    streaming?: {
      type: 'hls' | 'dash';
      resolutions: number[];
    };
  };
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: number;
  preload?: 'auto' | 'metadata' | 'none';
  playsInline?: boolean;
  poster?: string;
  fallback?: string;
  className?: string;
  style?: Record<string, unknown>;
  playerOptions?: Record<string, unknown>;
}
